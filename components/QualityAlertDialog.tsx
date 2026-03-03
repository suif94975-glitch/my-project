/**
 * 质量差告警弹窗组件
 *
 * - 登录后自动建立 SSE 连接（/api/alerts/stream）
 * - 收到 quality_alert 事件时展示弹窗，支持多条告警堆叠
 * - 弹窗只能手动关闭，不会自动消失
 * - 只有在告警发生时已建立连接的用户才会收到推送
 */

import { useEffect, useRef, useState } from "react";
import { useAppAuth } from "@/hooks/useAppAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Clock } from "lucide-react";

interface QualityAlert {
  alertId: string;
  groupName: string;
  groupId: number;
  domains: Array<{
    domain: string;
    summary: string;
    responseTimeMs: number | null;
  }>;
  triggeredAt: number;
}

export default function QualityAlertDialog() {
  const { isLoggedIn } = useAppAuth();
  const [alerts, setAlerts] = useState<QualityAlert[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const esRef = useRef<EventSource | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  // 建立 SSE 连接
  useEffect(() => {
    if (!isLoggedIn) {
      // 未登录时关闭连接
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      return;
    }

    // 已有连接则不重复建立
    if (esRef.current) return;

    const es = new EventSource("/api/alerts/stream", { withCredentials: true });
    esRef.current = es;

    es.addEventListener("quality_alert", (e: MessageEvent) => {
      try {
        const alert: QualityAlert = JSON.parse(e.data);
        // 去重
        if (seenIds.current.has(alert.alertId)) return;
        seenIds.current.add(alert.alertId);
        setAlerts(prev => [...prev, alert]);
      } catch {
        // ignore parse error
      }
    });

    es.onerror = () => {
      // SSE 断开后 5 秒重连
      es.close();
      esRef.current = null;
      setTimeout(() => {
        if (isLoggedIn) {
          // 触发重新建立连接
          setAlerts(prev => [...prev]); // 强制 re-render
        }
      }, 5000);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [isLoggedIn]);

  // 关闭当前告警
  const dismissCurrent = () => {
    setAlerts(prev => {
      const next = [...prev];
      next.splice(currentIndex, 1);
      return next;
    });
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  // 关闭所有告警
  const dismissAll = () => {
    setAlerts([]);
    setCurrentIndex(0);
  };

  if (alerts.length === 0) return null;

  const alert = alerts[currentIndex];
  if (!alert) return null;

  const triggeredTime = new Date(alert.triggeredAt).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg border-red-200 bg-white dark:bg-gray-900"
        // 禁用点击外部关闭
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-red-700 dark:text-red-400 text-base">
                域名质量告警
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                分组：<span className="font-semibold text-foreground">{alert.groupName}</span>
                {alerts.length > 1 && (
                  <span className="ml-2 text-orange-600">
                    （共 {alerts.length} 条告警，当前第 {currentIndex + 1} 条）
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 告警内容 */}
        <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
          {alert.domains.map((d, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900"
            >
              <div className="flex-shrink-0 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm font-semibold text-foreground truncate">
                  {d.domain}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{d.summary}</div>
                {d.responseTimeMs !== null && (
                  <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                    响应时间：{d.responseTimeMs}ms
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 时间 */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <Clock className="w-3 h-3" />
          <span>告警时间：{triggeredTime}</span>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
          <div className="flex gap-2">
            {alerts.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="text-xs"
                >
                  上一条
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentIndex(prev => Math.min(alerts.length - 1, prev + 1))}
                  disabled={currentIndex === alerts.length - 1}
                  className="text-xs"
                >
                  下一条
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {alerts.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={dismissAll}
                className="text-xs text-muted-foreground"
              >
                <X className="w-3 h-3 mr-1" />
                全部关闭
              </Button>
            )}
            <Button
              size="sm"
              onClick={dismissCurrent}
              className="text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              <X className="w-3 h-3 mr-1" />
              {alerts.length > 1 ? "关闭此条" : "我已知晓"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
