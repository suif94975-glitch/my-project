/**
 * 站内信铃铛组件
 * - 顶部导航栏右侧显示，有未读消息时显示红点
 * - 点击弹出站内信列表
 * - 支持一键全部已读、批量删除已读
 * - 支持一键复制域名（复制后自动跳转到定时任务对应分组）
 */
import { useState } from "react";
import { Bell, X, CheckCheck, Trash2, Loader2, AlertCircle, Copy, Check, ExternalLink, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ─── 通知操作按钮（复制 + 跳转） ──────────────────────────────────────────────

function NotificationActions({
  domain,
  groupId,
  onNavigate,
}: {
  domain: string;
  groupId: number | null;
  onNavigate: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [, navigate] = useLocation();

  const handleCopyAndNavigate = async () => {
    try {
      await navigator.clipboard.writeText(domain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(`已复制：${domain}`);
    } catch {
      toast.error("复制失败，请手动复制");
    }
    // 无论复制是否成功，都跳转到定时任务页面（如有 groupId 则带 hash 定位）
    if (groupId) {
      onNavigate();
      navigate(`/scheduled#group-${groupId}`);
    }
  };

  const handleJump = () => {
    onNavigate();
    if (groupId) {
      navigate(`/scheduled#group-${groupId}`);
    } else {
      navigate("/scheduled");
    }
  };

  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <button
        onClick={handleCopyAndNavigate}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
        title="复制域名并跳转到对应分组"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
        {copied ? "已复制" : "一键复制"}
      </button>
      {groupId && (
        <button
          onClick={handleJump}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
          title="跳转到对应分组"
        >
          <ExternalLink className="w-3 h-3" />
          查看分组
        </button>
      )}
    </div>
  );
}

// ─── 规则快照折叠区域 ─────────────────────────────────────────────────────────

type RuleSnapshotItem = {
  level: string;
  maxFailNodes: number | null;
  maxAvgLatencyMs: number | null;
  operator: string;
  enabled: boolean;
};

const LEVEL_LABELS: Record<string, string> = { bad: '极差', poor: '较差', normal: '普通', good: '正常' };
const LEVEL_COLORS: Record<string, string> = {
  bad: 'text-red-600 bg-red-50 border-red-200',
  poor: 'text-orange-600 bg-orange-50 border-orange-200',
  normal: 'text-blue-600 bg-blue-50 border-blue-200',
  good: 'text-emerald-600 bg-emerald-50 border-emerald-200',
};

function RuleSnapshotSection({ snapshot }: { snapshot: RuleSnapshotItem[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <FileText className="w-3 h-3" />
        触发时规则快照
        <span className="ml-0.5 px-1 py-0 rounded bg-muted text-muted-foreground text-[9px]">{snapshot.length} 条</span>
      </button>
      {expanded && (
        <div className="mt-1.5 rounded-md border border-border bg-muted/30 overflow-hidden">
          <div className="px-2 py-1 bg-muted/50 border-b border-border">
            <span className="text-[10px] text-muted-foreground">以下为告警触发时生效的自定义评级规则快照</span>
          </div>
          <div className="divide-y divide-border">
            {snapshot.map((rule, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold flex-shrink-0 ${LEVEL_COLORS[rule.level] ?? 'text-muted-foreground bg-muted border-border'}`}>
                  {LEVEL_LABELS[rule.level] ?? rule.level}
                </span>
                <span className="text-[10px] text-muted-foreground flex-1">
                  {rule.maxFailNodes != null && `失败节点 ≥ ${rule.maxFailNodes}`}
                  {rule.maxFailNodes != null && rule.maxAvgLatencyMs != null && (
                    <strong className="mx-1">{rule.operator === 'AND' ? '且' : '或'}</strong>
                  )}
                  {rule.maxAvgLatencyMs != null && `平均延迟 ≥ ${rule.maxAvgLatencyMs.toLocaleString()} ms`}
                  {rule.maxFailNodes == null && rule.maxAvgLatencyMs == null && '无条件（始终匹配）'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const [open, setOpen] = useState(false);

  // 未读数量（每 30 秒轮询一次）
  const unreadQuery = trpc.notifications.getUnreadCount.useQuery(undefined, {
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // 站内信列表（弹窗打开时加载）
  const listQuery = trpc.notifications.list.useQuery(
    { limit: 50, offset: 0 },
    { enabled: open, staleTime: 5000 }
  );

  const utils = trpc.useUtils();

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getUnreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteReadMutation = trpc.notifications.deleteRead.useMutation({
    onSuccess: (data) => {
      toast.success(`已删除 ${data.deleted} 条已读消息`);
      utils.notifications.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const unreadCount = unreadQuery.data?.count ?? 0;
  const notifications = listQuery.data ?? [];
  const hasUnread = unreadCount > 0;
  const hasRead = notifications.some(n => n.isRead);

  return (
    <>
      {/* 铃铛按钮 */}
      <button
        onClick={() => setOpen(true)}
        className="relative p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="站内信"
      >
        <Bell className="w-3.5 h-3.5" />
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-[9px] text-white font-bold leading-none">
              {unreadCount > 99 ? "99" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* 站内信列表弹窗 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              站内信
              {hasUnread && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {unreadCount} 未读
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">站内信通知列表</DialogDescription>
          </DialogHeader>

          {/* 操作栏 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => markAsReadMutation.mutate({ id: null })}
              disabled={!hasUnread || markAsReadMutation.isPending}
            >
              <CheckCheck className="w-3 h-3" />
              全部已读
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
              onClick={() => deleteReadMutation.mutate()}
              disabled={!hasRead || deleteReadMutation.isPending}
            >
              <Trash2 className="w-3 h-3" />
              删除已读
            </Button>
          </div>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {listQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">暂无站内信</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded border transition-colors ${
                      n.isRead
                        ? "bg-muted/30 border-border/50 opacity-60"
                        : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                    }`}
                  >
                    <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${n.isRead ? "text-muted-foreground" : "text-red-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-medium ${n.isRead ? "text-muted-foreground" : "text-red-700 dark:text-red-400"}`}>
                          质量差告警
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString("zh-CN", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm font-mono text-foreground truncate">{n.domain}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        分组：{n.groupName}
                        {n.summary && ` · ${n.summary}`}
                      </p>
                      {/* 操作按钮：一键复制 + 查看分组 */}
                      <NotificationActions
                        domain={n.domain}
                        groupId={n.groupId ?? null}
                        onNavigate={() => setOpen(false)}
                      />
                      {/* 触发时规则快照（可折叠） */}
                      {Array.isArray(n.ruleSnapshot) && n.ruleSnapshot.length > 0 && (
                        <RuleSnapshotSection snapshot={n.ruleSnapshot as RuleSnapshotItem[]} />
                      )}
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={() => markAsReadMutation.mutate({ id: n.id })}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                        title="标记已读"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
