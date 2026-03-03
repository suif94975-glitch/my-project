/**
 * 批量定时域名检测任务页面
 *
 * 权限说明：
 * - 所有登录用户：可使用定时检测的全部功能（创建分组、添加域名、授权、触发检测等）
 */
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { trpc } from "@/lib/trpc";
import AppNav from "@/components/AppNav";
import { useAppAuth } from "@/hooks/useAppAuth";
import { useUserStorage } from "@/hooks/useUserStorage";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Globe,
  Clock,
  Plus,
  Trash2,
  Play,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  History,
  ToggleLeft,
  ToggleRight,
  Lock,
  Unlock,
  Info,
  Edit,
  ClipboardList,
  Copy,
  Users,
  GripVertical,
  RotateCcw,
  Settings2,
  Filter,
  X,
  Timer,
  MoveRight,
  Pause,
  Search,
} from "lucide-react";

// ─── 评级工具函数（模块级常量，避免每次渲染重建）─────────────────────────────

/** 评级标签与样式配置 */
const RATING_BADGE: Record<string, { label: string; cls: string }> = {
  good: { label: '正常', cls: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  normal: { label: '普通', cls: 'bg-blue-50 text-blue-700 border-blue-300' },
  poor: { label: '较差', cls: 'bg-orange-50 text-orange-700 border-orange-300' },
  bad: { label: '极差', cls: 'bg-red-50 text-red-800 border-red-400 font-bold' },
};

/** 核心评级匹配逻辑（与后端 gradeWithCustomRules 保持一致） */
function matchRatingRules(
  rules: Array<{ level: string; enabled: boolean; maxFailNodes: number | null; maxAvgLatencyMs: number | null; operator: string }>,
  failNodes: number,
  avgLatency: number
): string | null {
  const priority = ['bad', 'poor', 'normal', 'good'] as const;
  for (const lvl of priority) {
    const rule = rules.find(r => r.level === lvl && r.enabled);
    if (!rule) continue;
    const failMatch = rule.maxFailNodes != null ? failNodes >= rule.maxFailNodes : true;
    const latMatch = rule.maxAvgLatencyMs != null ? avgLatency >= rule.maxAvgLatencyMs : true;
    const matched = rule.operator === 'OR' ? (failMatch || latMatch) : (failMatch && latMatch);
    if (matched) return lvl;
  }
  return null;
}

// ─── 状态徽章 ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "ok" | "warn" | "error" | "poor" | "pending" }) {
  const config = {
    ok: { icon: <CheckCircle2 className="w-3 h-3" />, text: "正常", className: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    warn: { icon: <AlertTriangle className="w-3 h-3" />, text: "警告", className: "text-amber-600 bg-amber-50 border-amber-200" },
    error: { icon: <XCircle className="w-3 h-3" />, text: "异常", className: "text-red-600 bg-red-50 border-red-200" },
    poor: { icon: <XCircle className="w-3 h-3" />, text: "极差", className: "text-orange-700 bg-orange-100 border-orange-300 font-bold" },
    pending: { icon: <Loader2 className="w-3 h-3 animate-spin" />, text: "待检测", className: "text-slate-500 bg-slate-50 border-slate-200" },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium ${c.className}`}>
      {c.icon}
      {c.text}
    </span>
  );
}

// ─── 授权状态徽章 ─────────────────────────────────────────────────────────────

function AuthBadge({ taskStatus }: { taskStatus: "pending" | "authorized" }) {
  if (taskStatus === "authorized") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium text-blue-600 bg-blue-50 border-blue-200">
        <CheckCircle2 className="w-3 h-3" />
        已授权
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium text-slate-500 bg-slate-50 border-slate-200">
      <Lock className="w-3 h-3" />
      待授权
    </span>
  );
}

// ─── 失败节点详情弹窗 ─────────────────────────────────────────────────────────

function DomainDetailDialog({
  domainId,
  domainName,
  onClose,
}: {
  domainId: number;
  domainName: string;
  onClose: () => void;
}) {
  const lastResultQuery = trpc.scheduled.getLastResult.useQuery({ domainId });
  const result = lastResultQuery.data;
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const toggleRegion = (region: string) => {
    setExpandedRegions(prev => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  };

  // 解析 rawData 中的节点信息
  const rawData = result?.rawData as {
    rows?: Array<{
      node?: string;
      nodeZh?: string;
      status?: string;
      totalTimeMs?: number;
    }>;
    summary?: { failed?: number; avgTimeMs?: number; total?: number; success?: number };
    error?: string;
  } | null;

  const rows = (rawData?.rows ?? []) as any[];
  const tool = result?.tool ?? 'itdog';
  // 与 Home.tsx calcDomainQuality 和 scheduler.ts 完全一致：
  // itdog/zhale: rows 已过滤未完成节点（httpCode=0）
  //   失败 = 连接失败（httpCode=-1）或 HTTP 错误状态码（httpCode >= 400）
  // aliyun: rows 已过滤未完成节点，失败 = status 为 4xx/5xx
  const failedNodes = rows.filter((r: any) => {
    if (tool === 'aliyun') {
      const c = parseInt(r.status);
      return !isNaN(c) && c >= 400;
    }
    // itdog/zhale: 连接失败（httpCode=-1）或 HTTP 错误状态码（httpCode >= 400）
    return typeof r.httpCode === 'number' && (r.httpCode === -1 || r.httpCode >= 400);
  });
  const successNodes = rows.filter((r: any) => {
    if (tool === 'aliyun') {
      const c = parseInt(r.status);
      return !isNaN(c) && c >= 200 && c < 400 && r.totalTimeMs > 0;
    }
    return r.status === 'success' && r.totalTimeMs > 0;
  });
  const computedAvgTimeMs = successNodes.length > 0
    ? Math.round(successNodes.reduce((s, r) => s + (r.totalTimeMs ?? 0), 0) / successNodes.length)
    : 0;
  const slowNodes = rows.filter(r => typeof r.totalTimeMs === 'number' && r.totalTimeMs > 50000);

  // 按省份分组失败节点，用于展示合并提示
  const failedByRegion = failedNodes.reduce((acc: Record<string, any[]>, n: any) => {
    const region = n.region || n.nodeZh?.replace(/\d+$/, '').replace(/\s+/g, '') || '未知省份';
    if (!acc[region]) acc[region] = [];
    acc[region].push(n);
    return acc;
  }, {});
  // 有多个节点的省份（合并的省份）
  const mergedRegions = Object.entries(failedByRegion).filter(([, nodes]) => nodes.length > 1);
  const totalMergedNodes = mergedRegions.reduce((sum, [, nodes]) => sum + nodes.length - 1, 0);

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono text-base">{domainName} — 最新检测详情</DialogTitle>
        </DialogHeader>
        {lastResultQuery.isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="grid grid-cols-2 gap-2 bg-muted/40 rounded px-3 py-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-3.5 bg-muted rounded" />
              ))}
            </div>
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="space-y-1.5">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-2">
                  <div className="w-24 h-3 bg-muted rounded" />
                  <div className="flex-1 h-3 bg-muted rounded" />
                  <div className="w-12 h-3 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : !result ? (
          <p className="text-sm text-muted-foreground py-4 text-center">暂无检测记录</p>
        ) : (
          <div className="space-y-4">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 rounded px-3 py-2">
              <div className="text-muted-foreground">检测时间</div>
              <div className="font-medium text-foreground text-right">{new Date(result.checkedAt).toLocaleString('zh-CN')}</div>
              <div className="text-muted-foreground">检测工具</div>
              <div className="font-medium text-foreground text-right">{result.tool === 'itdog' ? 'ITDOG' : result.tool === 'aliyun' ? '阿里云' : result.tool}</div>
              {rawData?.summary && (
                <>
                  <div className="text-muted-foreground">总节点数</div>
                  <div className="font-medium text-foreground text-right">{rawData.summary.total ?? rows.length} 个</div>
                  <div className="text-muted-foreground">失败节点</div>
                  <div className={`font-medium text-right ${failedNodes.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {failedNodes.length} 个
                  </div>
                  <div className="text-muted-foreground">平均延迟</div>
                  <div className="font-medium text-foreground text-right">{computedAvgTimeMs}ms</div>
                </>
              )}
              {rawData?.error && (
                <>
                  <div className="text-muted-foreground">错误信息</div>
                  <div className="font-medium text-red-600 text-right text-xs">{rawData.error}</div>
                </>
              )}
            </div>

            {/* 失败节点 - 按省份分组显示 */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-500" />
                失败节点（{Object.keys(failedByRegion).length} 个省份，共 {failedNodes.length} 个节点）
                {totalMergedNodes > 0 && (
                  <span className="ml-auto text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200">
                    已合并 {totalMergedNodes} 个同省节点
                  </span>
                )}
              </p>
              {failedNodes.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-5">无失败节点</p>
              ) : (
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {Object.entries(failedByRegion).map(([region, nodes]) => {
                    const isMulti = nodes.length > 1;
                    const isExpanded = expandedRegions.has(region);
                    return (
                      <div key={region}>
                        {isMulti ? (
                          // 多节点省份：展示合并行，可展开
                          <div>
                            <button
                              onClick={() => toggleRegion(region)}
                              className="w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
                            >
                              {isExpanded ? <ChevronDown className="w-3 h-3 text-red-500 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-red-500 flex-shrink-0" />}
                              <span className="text-red-600 font-medium">{region}</span>
                              <span className="text-red-500 text-xs">({nodes.length} 个节点失败)</span>
                              <span className="ml-auto text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-200">
                                已合并 {nodes.length - 1} 个
                              </span>
                            </button>
                            {isExpanded && (
                              <div className="ml-4 mt-0.5 space-y-0.5">
                                {nodes.map((n: any, i: number) => (
                                  <div key={i} className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-red-50/60 dark:bg-red-950/10 border-l-2 border-red-300">
                                    <span className="text-red-600">{n.nodeZh || n.node || '未知节点'}</span>
                                    {typeof n.totalTimeMs === 'number' && (
                                      <span className="text-muted-foreground ml-auto">{n.totalTimeMs}ms</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          // 单节点省份：直接显示
                          <div className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-950/20">
                            <span className="text-red-600 font-medium">{nodes[0].nodeZh || nodes[0].node || '未知节点'}</span>
                            {typeof nodes[0].totalTimeMs === 'number' && (
                              <span className="text-muted-foreground ml-auto">{nodes[0].totalTimeMs}ms</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 耗时 >50000ms 的节点 */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                耗时 &gt;50s 的节点（{slowNodes.length} 个）
              </p>
              {slowNodes.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-5">无超慢节点</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {slowNodes.map((n, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/20">
                      <span className="text-amber-700 font-medium">{n.nodeZh || n.node || '未知节点'}</span>
                      <span className="text-muted-foreground ml-auto">{((n.totalTimeMs ?? 0) / 1000).toFixed(1)}s</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── 历史记录面板 ─────────────────────────────────────────────────────────────

function HistoryPanel({ domainId }: { domainId: number }) {
  const resultsQuery = trpc.scheduled.getResults.useQuery({ domainId, limit: 20 });
  const results = resultsQuery.data ?? [];

  return (
    <div className="ml-4 mb-2 bg-card border border-border rounded p-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">最近 20 次检测记录</p>
      {resultsQuery.isLoading ? (
        <div className="space-y-1.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-2 animate-pulse">
              <div className="w-10 h-4 bg-muted rounded" />
              <div className="w-20 h-3 bg-muted rounded" />
              <div className="flex-1 h-3 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="text-xs text-muted-foreground">暂无检测记录</p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {results.map(r => (
            <div key={r.id} className="flex items-center gap-2 text-xs">
              <StatusBadge status={r.status} />
              <span className="text-muted-foreground">
                {new Date(r.checkedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
              {r.httpStatus && <span className="font-mono text-foreground">HTTP {r.httpStatus}</span>}
              {r.responseTimeMs && <span className="text-muted-foreground">{r.responseTimeMs}ms</span>}
              <span className="text-muted-foreground truncate flex-1">{r.summary}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/// ─── 域名列表（展开面板） ──────────────────────────────────
function DomainList({
  groupId,
  groupName,
  groupCategory,
  isAuthorized,
  healthFilter,
}: {
  groupId: number;
  groupName: string;
  groupCategory: string;
  isAuthorized: boolean;
  healthFilter?: 'persistent' | 'permanent' | null;
}) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addText, setAddText] = useState("");
  const [pasteDupInfo, setPasteDupInfo] = useState<{ count: number; domains: string[] } | null>(null);
  const [showHistory, setShowHistory] = useState<number | null>(null);
  const [detailDomainId, setDetailDomainId] = useState<number | null>(null);
  const [detailDomainName, setDetailDomainName] = useState<string>("");
  // 批量选择状态
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  // 删除确认弹窗状态
  const [deleteDomainId, setDeleteDomainId] = useState<number | null>(null);
  const [deleteDomainName, setDeleteDomainName] = useState<string>("");
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  // 批量移动弹窗状态
  const [showBatchMoveDialog, setShowBatchMoveDialog] = useState(false);
  const [batchMoveTargetGroupId, setBatchMoveTargetGroupId] = useState<number | null>(null);

  const domainsQuery = trpc.scheduled.listDomains.useQuery({ groupId }, { refetchInterval: 60000 });
  const addMutation = trpc.scheduled.addDomains.useMutation({
    onSuccess: (data) => {
      toast.success(`已添加 ${data.added} 个域名${data.skipped > 0 ? `，跳过 ${data.skipped} 个重复` : ""}`);
      setShowAddDialog(false);
      setAddText("");
      domainsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const removeMutation = trpc.scheduled.removeDomain.useMutation({
    onSuccess: () => {
      toast.success("已删除");
      domainsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const batchRemoveMutation = trpc.scheduled.batchRemoveDomains.useMutation({
    onSuccess: (data) => {
      toast.success(`已删除 ${data.deleted} 个域名`);
      setSelectedIds(new Set());
      setSelectMode(false);
      domainsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  // 批量移动域名
  const batchMoveMutation = trpc.scheduled.batchMoveDomains.useMutation({
    onSuccess: (data) => {
      let msg = `已移动 ${data.moved} 个域名到「${data.targetGroupName}」`;
      if (data.skippedDuplicate > 0) msg += `，跳过 ${data.skippedDuplicate} 个重复`;
      if (data.skippedSameGroup > 0) msg += `，跳过 ${data.skippedSameGroup} 个已在目标分组`;
      toast.success(msg);
      setShowBatchMoveDialog(false);
      setBatchMoveTargetGroupId(null);
      setSelectedIds(new Set());
      setSelectMode(false);
      domainsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  // 批量启停域名
  const batchToggleMutation = trpc.scheduled.batchToggleDomains.useMutation({
    onSuccess: (data) => {
      toast.success(`已${data.enabled ? '启动' : '暂停'} ${data.updated} 个域名`);
      setSelectedIds(new Set());
      setSelectMode(false);
      domainsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  // 获取所有分组列表（用于批量移动目标选择）
  const allGroupsQuery = trpc.scheduled.listGroups.useQuery(undefined, { staleTime: 30000 });
  const triggerMutation = trpc.scheduled.triggerNow.useMutation({
    onSuccess: () => {
      toast.success("检测任务已提交");
      setTimeout(() => domainsQuery.refetch(), 3000);
    },
    onError: (e) => toast.error(e.message),
  });
  const resetFailureCyclesMutation = trpc.scheduled.resetFailureCycles.useMutation({
    onSuccess: (data) => {
      toast.success(`已重置 ${data.domain} 的失败计数，域名将在下次检测中重新包含`);
      domainsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const utils = trpc.useUtils();
  const toggleDomainMutation = trpc.scheduled.toggleDomain.useMutation({
    // 乐观更新：点击后立即切换 enabled 状态
    onMutate: async ({ domainId, enabled }) => {
      // 取消正在进行的查询，防止覆盖乐观更新
      await utils.scheduled.listDomains.cancel({ groupId });
      // 快照当前数据
      const previous = utils.scheduled.listDomains.getData({ groupId });
      // 乐观更新缓存
      utils.scheduled.listDomains.setData({ groupId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          domains: old.domains.map((d: any) =>
            d.id === domainId ? { ...d, enabled } : d
          ),
        };
      });
      return { previous };
    },
    onError: (e, _vars, context) => {
      // 回滚快照
      if (context?.previous) {
        utils.scheduled.listDomains.setData({ groupId }, context.previous);
      }
      toast.error(e.message);
    },
    onSettled: () => {
      // 最终以服务器数据为准
      utils.scheduled.listDomains.invalidate({ groupId });
    },
  });
  const allDomains = domainsQuery.data?.domains ?? [];
  const ratingRules = domainsQuery.data?.ratingRules ?? [];

  // 评级计算：使用模块级 matchRatingRules 函数和 RATING_BADGE 常量
  const computeRating = (failNodes: number | null | undefined, avgLatency: number | null | undefined) => {
    if (!ratingRules.length) return null;
    return matchRatingRules(ratingRules, failNodes ?? 0, avgLatency ?? 0);
  };
  const ratingBadge = RATING_BADGE;

  // 应用健康度筛选
  const domains = healthFilter === 'persistent'
    ? allDomains.filter(d => (d.consecutiveErrors ?? 0) > 0)
    : healthFilter === 'permanent'
    ? allDomains.filter(d => (d.totalFailureCycles ?? 0) > 5)
    : allDomains;

  const handleAdd = () => {
    const lines = addText.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) { toast.error("请输入域名"); return; }
    addMutation.mutate({ groupId, domains: lines });
  };
  const handleCopyAll = () => {
    if (domains.length === 0) { toast.warning("暂无域名可复制"); return; }
    const text = domains.map(d => d.domain).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`已复制 ${domains.length} 个域名到剪贴板`);
    }).catch(() => toast.error("复制失败，请手动复制"));
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedIds.size === domains.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(domains.map(d => d.id)));
    }
  };

  // 切换单个选择
  const handleToggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // 批量删除确认
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    setShowBatchDeleteConfirm(true);
  };

  // 退出选择模式
  const handleExitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  return (
    <div className="border-t border-border bg-muted/20">
      <div className="p-4">
        {/* 未授权提示 */}
        {!isAuthorized && (
          <div className="flex items-start gap-2 mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>此分组尚未授权，域名已添加但不会自动检测。请点击「授权」按鈕启用自动检测。</span>
          </div>
        )}
        {/* 健康度筛选提示条 */}
        {healthFilter && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            <Filter className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              当前展示筛选：
              {healthFilter === 'persistent' ? '持续失败域名' : '疑似永久失效域名'}
              （共 {domains.length} 个）
            </span>
          </div>
        )}
        {/* 工具栏 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {!selectMode ? (
              <>
                <span className="text-xs text-muted-foreground">
                  {healthFilter ? '筛选结果' : '共'} <span className="font-semibold text-foreground">{domains.length}</span> 个域名
                  {healthFilter && allDomains.length !== domains.length && (
                    <span className="text-muted-foreground/60"> / 全部 {allDomains.length}</span>
                  )}
                </span>
                {domains.length > 0 && (
                  <>
                    <button
                      onClick={handleCopyAll}
                      className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-border hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
                      title="复制所有域名到剪贴板（每行一个）"
                    >
                      <ClipboardList className="w-3 h-3" />
                      一键复制
                    </button>
                    <button
                      onClick={() => setSelectMode(true)}
                      className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-border hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
                      title="进入批量选择模式"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      批量选择
                    </button>
                  </>
                )}
              </>
            ) : (
              /* 批量选择模式工具栏 */
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-border hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
                >
                  {selectedIds.size === domains.length ? (
                    <><XCircle className="w-3 h-3" />取消全选</>
                  ) : (
                    <><CheckCircle2 className="w-3 h-3" />全选 ({domains.length})</>
                  )}
                </button>
                {selectedIds.size > 0 && (
                  <>
                    {/* 批量启动 */}
                    <button
                      onClick={() => batchToggleMutation.mutate({ domainIds: Array.from(selectedIds), enabled: true })}
                      disabled={batchToggleMutation.isPending}
                      className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-all text-emerald-700 disabled:opacity-50"
                      title={`启动选中的 ${selectedIds.size} 个域名`}
                    >
                      {batchToggleMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      启动
                    </button>
                    {/* 批量暂停 */}
                    <button
                      onClick={() => batchToggleMutation.mutate({ domainIds: Array.from(selectedIds), enabled: false })}
                      disabled={batchToggleMutation.isPending}
                      className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-all text-amber-700 disabled:opacity-50"
                      title={`暂停选中的 ${selectedIds.size} 个域名`}
                    >
                      {batchToggleMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3" />}
                      暂停
                    </button>
                    {/* 批量移动 */}
                    <button
                      onClick={() => { setBatchMoveTargetGroupId(null); setShowBatchMoveDialog(true); }}
                      disabled={batchMoveMutation.isPending}
                      className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-all text-blue-700 disabled:opacity-50"
                      title={`移动选中的 ${selectedIds.size} 个域名到其他分组`}
                    >
                      {batchMoveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <MoveRight className="w-3 h-3" />}
                      移动
                    </button>
                    {/* 批量删除 */}
                    <button
                      onClick={handleBatchDelete}
                      disabled={batchRemoveMutation.isPending}
                      className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-red-200 bg-red-50 hover:bg-red-100 transition-all text-red-600 disabled:opacity-50"
                      title={`删除选中的 ${selectedIds.size} 个域名`}
                    >
                      {batchRemoveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      删除
                    </button>
                  </>
                )}
                <button
                  onClick={handleExitSelectMode}
                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-border hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="w-3 h-3" />
                  取消
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAuthorized && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => triggerMutation.mutate({ groupId })}
                disabled={triggerMutation.isPending || domains.length === 0}
                className="h-7 text-xs gap-1"
                title="立即对此分组所有域名执行一次检测"
              >
                <Play className="w-3 h-3" />
                立即检测
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setShowAddDialog(true)}
              className="h-7 text-xs gap-1"
            >
              <Plus className="w-3 h-3" />
              添加域名
            </Button>
          </div>
        </div>
        {/* 域名列表 */}
        {domainsQuery.isLoading ? (
          <div className="space-y-1.5 py-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded animate-pulse">
                <div className="w-4 h-4 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 h-3.5 bg-muted rounded" />
                <div className="w-12 h-3 bg-muted rounded" />
                <div className="w-16 h-3 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : domains.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Globe className="w-5 h-5 opacity-40" />
            </div>
            <p className="font-medium text-foreground/60 mb-1">暂无域名</p>
            <p className="text-xs">点击上方「添加域名」按钮开始监控</p>
          </div>
        ) : (
          <div className="space-y-1">
            {domains.map(d => (
              <div key={d.id} id={`domain-row-${d.id}`}>
                <div
                  className={[
                    "flex items-center gap-3 px-3 py-2 rounded hover:bg-muted/50 transition-colors group cursor-pointer",
                    d.lastStatus === "poor" ? "bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900" : "",
                    selectMode && selectedIds.has(d.id) ? "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900" : "",

                  ].filter(Boolean).join(" ")}
                  onClick={() => {
                    if (selectMode) {
                      handleToggleSelect(d.id);
                    } else {
                      setDetailDomainId(d.id);
                      setDetailDomainName(d.domain);
                    }
                  }}
                  title={selectMode ? "点击选择/取消选择" : "点击查看检测详情"}
                >
                  {/* 选择模式下显示 checkbox */}
                  {selectMode && (
                    <div
                      className={[
                        "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                        selectedIds.has(d.id) ? "bg-blue-500 border-blue-500" : "border-border bg-background",
                      ].join(" ")}
                      onClick={e => { e.stopPropagation(); handleToggleSelect(d.id); }}
                    >
                      {selectedIds.has(d.id) && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  )}
                  <StatusBadge status={d.lastStatus} />
                  <span className="font-mono text-sm text-foreground flex-1 truncate">{d.domain}</span>
                  {/* 自定义评级标签 */}
                  {(() => {
                    const rating = computeRating(d.lastFailNodes, d.lastAvgLatencyMs);
                    if (!rating) return null;
                    const badge = ratingBadge[rating];
                    return (
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded border text-xs flex-shrink-0 ${badge.cls}`}
                        title={`自定义评级：${badge.label}`}
                      >
                        {badge.label}
                      </span>
                    );
                  })()}
                  {/* consecutiveErrors 展示 */}
                  {(d.consecutiveErrors ?? 0) > 0 && (
                    <span
                      className={[
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium flex-shrink-0",
                        (d.consecutiveErrors ?? 0) >= 3
                          ? "text-red-700 bg-red-50 border-red-300"
                          : "text-orange-600 bg-orange-50 border-orange-200",
                      ].join(" ")}
                      title={`连续失败 ${d.consecutiveErrors} 次${(d.consecutiveErrors ?? 0) >= 3 ? "（已达上限，等待重置）" : ""}`}
                    >
                      <XCircle className="w-3 h-3" />
                      失败 {d.consecutiveErrors}次
                    </span>
                  )}
                  {/* totalFailureCycles 展示：超过5次显示永久失效警示 */}
                  {(d.totalFailureCycles ?? 0) > 0 && (
                    <span
                      className={[
                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium flex-shrink-0",
                        (d.totalFailureCycles ?? 0) > 5
                          ? "text-red-800 bg-red-100 border-red-400 font-bold"
                          : "text-slate-600 bg-slate-50 border-slate-300",
                      ].join(" ")}
                      title={`已累计 ${d.totalFailureCycles} 次循环失败重置${(d.totalFailureCycles ?? 0) > 5 ? "，已超过阈值，可能已永久失效" : ""}`}
                    >
                      {(d.totalFailureCycles ?? 0) > 5 ? (
                        <>☠️ 永久失效</>
                      ) : (
                        <>↺循环 {d.totalFailureCycles}次</>
                      )}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground hidden sm:block flex-shrink-0">
                    {d.lastCheckedAt
                      ? new Date(d.lastCheckedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
                      : "未检测"}
                  </span>
                  {d.lastSummary && (
                    <span className="text-xs text-muted-foreground hidden md:block max-w-36 truncate">{d.lastSummary}</span>
                  )}
                  {!selectMode && (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(d.domain)
                            .then(() => toast.success(`已复制: ${d.domain}`))
                            .catch(() => toast.error("复制失败"));
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="复制此域名"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setDetailDomainId(d.id); setDetailDomainName(d.domain); }}
                        className="p-1 rounded text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="查看检测详情"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setShowHistory(showHistory === d.id ? null : d.id)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="查看历史"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                      {/* 重置失败计数按钮：仅当 totalFailureCycles > 0 时显示 */}
                      {(d.totalFailureCycles ?? 0) > 0 && (
                        <button
                          onClick={() => {
                            if (resetFailureCyclesMutation.isPending) return;
                            resetFailureCyclesMutation.mutate({ domainId: d.id });
                          }}
                          disabled={resetFailureCyclesMutation.isPending}
                          className="p-1 rounded text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                          title={`重置失败计数（当前循环 ${d.totalFailureCycles} 次，连续失败 ${d.consecutiveErrors} 次）`}
                        >
                          {resetFailureCyclesMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => { setDeleteDomainId(d.id); setDeleteDomainName(d.domain); }}
                        className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {/* 历史记录展开 */}
                {showHistory === d.id && (
                  <HistoryPanel domainId={d.id} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* 失败节点详情弹窗 */}
      {detailDomainId !== null && (
        <DomainDetailDialog
          domainId={detailDomainId}
          domainName={detailDomainName}
          onClose={() => setDetailDomainId(null)}
        />
      )}
      {/* 添加域名弹窗 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加域名到「{groupName}」</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">域名列表</label>
                <span className="text-[11px] text-muted-foreground">
                  {addText.split("\n").filter(l => l.trim()).length} 个
                </span>
              </div>
              <Textarea
                placeholder={"https://example.com:8443\nhttps://another.com:9132\nhttps://www.test.net:6022"}
                value={addText}
                onChange={e => {
                  const val = e.target.value;
                  const filtered = val.split("").filter(ch => {
                    if (ch === "\n") return true;
                    return /[a-zA-Z0-9:/.\-_~?#\[\]@!$&'()*+,;=%]/.test(ch);
                  }).join("");
                  setAddText(filtered !== val ? filtered : val);
                }}
                onPaste={e => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData("text");
                  const urlRegex = /https?:\/\/[^\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\u3010\u3011\u300a\u300b\u300c\u300d\uff08\uff09\uff0c\u3002\uff01\uff1f]+/g;
                  const extracted = pasted.match(urlRegex) ?? [];
                  if (extracted.length > 0) {
                    const cleaned = extracted.map(u => u.replace(/[\uff0c\u3002\uff01\uff1f\u3010\u3011\u300a\u300b\u300c\u300d\uff08\uff09]+$/, "").trim());
                    const existing = addText.split("\n").map(l => l.trim()).filter(Boolean);
                    const existingSet = new Set(existing);
                    const dupDomains = cleaned.filter(u => existingSet.has(u));
                    const newDomains = cleaned.filter(u => !existingSet.has(u));
                    setAddText([...existing, ...newDomains].join("\n"));
                    setPasteDupInfo(dupDomains.length > 0 ? { count: dupDomains.length, domains: dupDomains } : null);
                  }
                }}
                className="font-mono text-sm min-h-[160px] resize-y"
                onKeyDown={e => { if (e.key === " ") e.preventDefault(); }}
                onCompositionEnd={e => {
                  const ta = e.target as HTMLTextAreaElement;
                  const cleaned = ta.value.split("").filter(ch => {
                    if (ch === "\n") return true;
                    return /[a-zA-Z0-9:/.\-_~?#\[\]@!$&'()*+,;=%]/.test(ch);
                  }).join("");
                  if (cleaned !== ta.value) setAddText(cleaned);
                }}
              />
              <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>仅支持粘贴 URL（自动提取 https:// 链接）· 手动输入只允许 URL 字符 · 重复域名自动跳过</span>
              </div>
              {pasteDupInfo && pasteDupInfo.count > 0 && (
                <div className="mt-1.5 px-2.5 py-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-700">
                  <p className="font-medium mb-0.5">已过滤 {pasteDupInfo.count} 条重复域名：</p>
                  <ul className="space-y-0.5 font-mono">
                    {pasteDupInfo.domains.slice(0, 5).map((d, i) => (
                      <li key={i} className="truncate">· {d}</li>
                    ))}
                    {pasteDupInfo.domains.length > 5 && (
                      <li className="text-amber-500">…还有 {pasteDupInfo.domains.length - 5} 条</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); setAddText(""); setPasteDupInfo(null); }}>取消</Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending || !addText.trim()}>
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {addText.split("\n").filter(l => l.trim()).length > 0 ? `添加 (${addText.split("\n").filter(l => l.trim()).length})` : "添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量删除确认弹窗 */}
      <Dialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              批量删除域名
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm text-foreground">
              确定删除选中的 <span className="font-semibold text-red-600">{selectedIds.size}</span> 个域名？
            </p>
            <p className="text-xs text-muted-foreground">删除后所有检测记录也将一并删除，此操作不可撤销。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDeleteConfirm(false)}>取消</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowBatchDeleteConfirm(false);
                batchRemoveMutation.mutate({ domainIds: Array.from(selectedIds) });
              }}
              disabled={batchRemoveMutation.isPending}
            >
              {batchRemoveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              确认删除 ({selectedIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量移动弹窗 */}
      <Dialog open={showBatchMoveDialog} onOpenChange={open => { if (!open) { setShowBatchMoveDialog(false); setBatchMoveTargetGroupId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700">
              <MoveRight className="w-5 h-5" />
              批量移动域名
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-foreground">
              将选中的 <span className="font-semibold text-blue-700">{selectedIds.size}</span> 个域名移动到以下分组：
            </p>
            <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded p-2">
              {allGroupsQuery.isLoading ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />加载分组列表...
                </div>
              ) : (allGroupsQuery.data ?? []).filter(g => g.id !== groupId).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">暂无其他分组</p>
              ) : (
                (allGroupsQuery.data ?? []).filter(g => g.id !== groupId).map(g => (
                  <button
                    key={g.id}
                    onClick={() => setBatchMoveTargetGroupId(g.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-all ${
                      batchMoveTargetGroupId === g.id
                        ? 'bg-blue-100 border border-blue-300 text-blue-800'
                        : 'hover:bg-muted border border-transparent text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">{g.name}</span>
                      {g.category && g.category !== '默认' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{g.category}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{g.domainCount} 个域名</span>
                      {batchMoveTargetGroupId === g.id && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
            {batchMoveTargetGroupId !== null && (
              <p className="text-xs text-muted-foreground">
                提示：目标分组中已存在相同域名将自动跳过。
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowBatchMoveDialog(false); setBatchMoveTargetGroupId(null); }}>取消</Button>
            <Button
              onClick={() => {
                if (batchMoveTargetGroupId !== null) {
                  batchMoveMutation.mutate({ domainIds: Array.from(selectedIds), targetGroupId: batchMoveTargetGroupId });
                }
              }}
              disabled={batchMoveTargetGroupId === null || batchMoveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {batchMoveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              确认移动 ({selectedIds.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 删除单个域名确认弹窗 */}
      <Dialog open={deleteDomainId !== null} onOpenChange={open => { if (!open) { setDeleteDomainId(null); setDeleteDomainName(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              删除域名
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm text-foreground">
              确定删除域名 <span className="font-mono font-semibold">{deleteDomainName}</span>？
            </p>
            <p className="text-xs text-muted-foreground">删除后该域名的所有检测记录也将一并删除。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDomainId(null); setDeleteDomainName(""); }}>取消</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteDomainId !== null) {
                  removeMutation.mutate({ domainId: deleteDomainId });
                  setDeleteDomainId(null);
                  setDeleteDomainName("");
                }
              }}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── 分组卡片 ──────────────────────────────────────────────────────────────────────────────

const INTERVAL_OPTIONS= [
  { label: "默认（每小时）", value: null as number | null },
  { label: "每30分钟", value: 30 },
  { label: "每1小时", value: 60 },
  { label: "每2小时", value: 120 },
  { label: "每3小时", value: 180 },
  { label: "每6小时", value: 360 },
  { label: "每12小时", value: 720 },
  { label: "每24小时", value: 1440 },
];

function intervalLabel(minutes: number | null | undefined): string {
  if (!minutes) return "默认（每小时）";
  const opt = INTERVAL_OPTIONS.find(o => o.value === minutes);
  return opt?.label ?? `每${minutes}分钟`;
}

// ─── 评级规则编辑弹窗 ────────────────────────────────────────────────────────

const RATING_LEVELS = [
  { level: 'good' as const, label: '正常', color: 'emerald', desc: '域名质量良好，满足此条件时标记为「正常」' },
  { level: 'normal' as const, label: '普通', color: 'blue', desc: '域名质量一般，满足此条件时标记为「普通」' },
  { level: 'poor' as const, label: '较差', color: 'orange', desc: '域名质量较差，满足此条件时标记为「较差」' },
  { level: 'bad' as const, label: '极差', color: 'red', desc: '域名质量极差，满足此条件时标记为「极差」并触发告警' },
];

type RuleForm = {
  level: 'good' | 'normal' | 'poor' | 'bad';
  maxFailNodes: string;
  maxAvgLatencyMs: string;
  operator: 'AND' | 'OR';
  enabled: boolean;
};

function RatingRulesDialog({
  groupId,
  groupName,
  onClose,
}: {
  groupId: number;
  groupName: string;
  onClose: () => void;
}) {
  const rulesQuery = trpc.scheduled.getRatingRules.useQuery({ groupId });
  const setRulesMutation = trpc.scheduled.setRatingRules.useMutation({
    onSuccess: () => {
      toast.success('评级规则已保存');
      rulesQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // 本地编辑状态，每个等级一条规则
  const [forms, setForms] = useState<RuleForm[]>(() =>
    RATING_LEVELS.map(l => ({
      level: l.level,
      maxFailNodes: '',
      maxAvgLatencyMs: '',
      operator: 'AND' as const,
      enabled: false,
    }))
  );

  // 从服务器加载规则后填充表单
  useEffect(() => {
    if (!rulesQuery.data) return;
    setForms(RATING_LEVELS.map(l => {
      const existing = rulesQuery.data.find(r => r.level === l.level);
      if (!existing) return {
        level: l.level,
        maxFailNodes: '',
        maxAvgLatencyMs: '',
        operator: 'AND' as const,
        enabled: false,
      };
      return {
        level: l.level,
        maxFailNodes: existing.maxFailNodes != null ? String(existing.maxFailNodes) : '',
        maxAvgLatencyMs: existing.maxAvgLatencyMs != null ? String(existing.maxAvgLatencyMs) : '',
        operator: existing.operator as 'AND' | 'OR',
        enabled: existing.enabled,
      };
    }));
  }, [rulesQuery.data]);

  const updateForm = (level: string, field: keyof RuleForm, value: any) => {
    setForms(prev => prev.map(f => f.level === level ? { ...f, [field]: value } : f));
  };

  // ─── 一键补全撤销快照 ─────────────────────────────────────────────────────
  // 补全前的 forms 快照，为 null 表示没有可撤销的补全操作
  const [autoFillSnapshot, setAutoFillSnapshot] = useState<RuleForm[] | null>(null);
  // 最近一次被补全的等级列表（用于滚动和高亮）
  const [highlightedLevels, setHighlightedLevels] = useState<Set<string>>(new Set());
  // 第一个被补全的等级卡片的 ref（用于滚动）
  const firstFilledRef = useRef<HTMLDivElement | null>(null);

  // ─── 规则生效预览 ───────────────────────────────────────────────────────────
  const [previewFailNodes, setPreviewFailNodes] = useState<string>('');
  const [previewLatencyMs, setPreviewLatencyMs] = useState<string>('');

  /**
   * 基于当前 forms（草稿状态）实时计算预览等级
   * 与后端 gradeWithCustomRules 逻辑完全一致：极差 > 较差 > 普通 > 正常
   */
  const computePreviewRating = useMemo(() => {
    const fn = previewFailNodes !== '' ? parseInt(previewFailNodes) : null;
    const lat = previewLatencyMs !== '' ? parseInt(previewLatencyMs) : null;
    if (fn === null && lat === null) return null;
    const enabledForms = forms.filter(f => f.enabled);
    if (enabledForms.length === 0) return { mode: 'default' as const, level: null, label: '使用系统默认规则', matchedRule: null };
    // 将 forms 转换为 matchRatingRules 期望的格式
    const rulesFromForms = enabledForms.map(f => ({
      level: f.level,
      enabled: f.enabled,
      maxFailNodes: f.maxFailNodes !== '' ? parseInt(f.maxFailNodes) : null,
      maxAvgLatencyMs: f.maxAvgLatencyMs !== '' ? parseInt(f.maxAvgLatencyMs) : null,
      operator: f.operator,
    }));
    const matched = matchRatingRules(rulesFromForms, fn ?? 0, lat ?? 0);
    if (matched) {
      const matchedForm = enabledForms.find(f => f.level === matched)!;
      return { mode: 'custom' as const, level: matched, label: RATING_LEVELS.find(l => l.level === matched)?.label ?? matched, matchedRule: matchedForm };
    }
    return { mode: 'fallback' as const, level: null, label: '无规则匹配，回归系统默认规则', matchedRule: null };
  }, [forms, previewFailNodes, previewLatencyMs]);

  const handleSave = () => {
    const rules = forms
      .filter(f => f.enabled)
      .map(f => ({
        level: f.level,
        maxFailNodes: f.maxFailNodes !== '' ? parseInt(f.maxFailNodes) : null,
        maxAvgLatencyMs: f.maxAvgLatencyMs !== '' ? parseInt(f.maxAvgLatencyMs) : null,
        operator: f.operator,
        enabled: true,
      }));
    setRulesMutation.mutate({ groupId, rules });
  };

  /**
   * 一键补全盲区等级
   * 算法：对每个盲区等级，找到其两侧最近的已启用等级，取其阈值的中间值
   * 优先级顺序： bad(0) > poor(1) > normal(2) > good(3)
   */
  const autoFillGapLevels = () => {
    const orderedLevels = ['bad', 'poor', 'normal', 'good'] as const;
    const enabledForms = forms.filter(f => f.enabled);
    if (enabledForms.length < 2) return;

    const enabledIndices = orderedLevels
      .map((lvl, i) => enabledForms.find(f => f.level === lvl) ? i : -1)
      .filter(i => i >= 0);
    const minIdx = Math.min(...enabledIndices);
    const maxIdx = Math.max(...enabledIndices);
    const gapLevels = orderedLevels
      .slice(minIdx, maxIdx + 1)
      .filter(lvl => !enabledForms.find(f => f.level === lvl));

    if (gapLevels.length === 0) return;

    // 保存补全前的快照，用于撤销
    setAutoFillSnapshot(forms.map(f => ({ ...f })));
    // 记录被补全的等级，用于高亮
    setHighlightedLevels(new Set(gapLevels));
    // 2秒后自动清除高亮
    setTimeout(() => setHighlightedLevels(new Set()), 2000);

    setForms(prev => {
      const updated = [...prev];
      for (const gapLvl of gapLevels) {
        const gapIdx = orderedLevels.indexOf(gapLvl);
        // 找左侧最近的已启用等级（优先级更高的一侧）
        const leftForm = [...orderedLevels]
          .slice(0, gapIdx)
          .reverse()
          .map(lvl => updated.find(f => f.level === lvl && f.enabled))
          .find(Boolean);
        // 找右侧最近的已启用等级（优先级更低的一侧）
        const rightForm = orderedLevels
          .slice(gapIdx + 1)
          .map(lvl => updated.find(f => f.level === lvl && f.enabled))
          .find(Boolean);

        // 计算中间值
        const leftFail = leftForm?.maxFailNodes !== '' && leftForm?.maxFailNodes != null
          ? parseInt(leftForm.maxFailNodes) : null;
        const rightFail = rightForm?.maxFailNodes !== '' && rightForm?.maxFailNodes != null
          ? parseInt(rightForm.maxFailNodes) : null;
        const leftLat = leftForm?.maxAvgLatencyMs !== '' && leftForm?.maxAvgLatencyMs != null
          ? parseInt(leftForm.maxAvgLatencyMs) : null;
        const rightLat = rightForm?.maxAvgLatencyMs !== '' && rightForm?.maxAvgLatencyMs != null
          ? parseInt(rightForm.maxAvgLatencyMs) : null;

        const midFail = leftFail != null && rightFail != null
          ? Math.round((leftFail + rightFail) / 2)
          : leftFail ?? rightFail;
        const midLat = leftLat != null && rightLat != null
          ? Math.round((leftLat + rightLat) / 2)
          : leftLat ?? rightLat;

        // 继承左侧相邻等级的 operator，如果左侧无则取右侧
        const inheritedOperator = leftForm?.operator ?? rightForm?.operator ?? 'AND';

        const formIdx = updated.findIndex(f => f.level === gapLvl);
        if (formIdx >= 0) {
          updated[formIdx] = {
            ...updated[formIdx],
            enabled: true,
            maxFailNodes: midFail != null ? String(midFail) : '',
            maxAvgLatencyMs: midLat != null ? String(midLat) : '',
            operator: inheritedOperator,
          };
        }
      }
      return updated;
    });

    // 延迟一帧后滚动到第一个被补全的等级卡片
    requestAnimationFrame(() => {
      if (firstFilledRef.current) {
        firstFilledRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  };

  /** 撤销一键补全：恢复到补全前的快照 */
  const undoAutoFill = () => {
    if (autoFillSnapshot) {
      setForms(autoFillSnapshot);
      setAutoFillSnapshot(null);
      setHighlightedLevels(new Set());
    }
  };

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };
  const badgeMap: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    blue: 'bg-blue-100 text-blue-700 border-blue-300',
    orange: 'bg-orange-100 text-orange-700 border-orange-300',
    red: 'bg-red-100 text-red-700 border-red-300',
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-purple-500" />
            自定义评级规则
            <span className="text-sm font-normal text-muted-foreground">— {groupName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2 mb-1">
          为每个评级等级设置触发条件。检测完成后，系统将按 <strong>极差 → 较差 → 普通 → 正常</strong> 的优先级匹配，
          第一个满足条件的等级将作为该域名的评级结果。未启用的等级将使用系统默认规则。
        </div>

        {rulesQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* 盲区警告：检测等级跳跃 */}
            {(() => {
              // 按优先级顺序：极差(bad) > 较差(poor) > 普通(normal) > 正常(good)
              const orderedLevels = ['bad', 'poor', 'normal', 'good'] as const;
              const enabledLevels = new Set(forms.filter(f => f.enabled).map(f => f.level));
              // 找出已启用等级中的最高和最低等级
              const enabledIndices = orderedLevels
                .map((lvl, i) => enabledLevels.has(lvl) ? i : -1)
                .filter(i => i >= 0);
              if (enabledIndices.length < 2) return null; // 少于 2 个等级无法形成跳跃
              const minIdx = Math.min(...enabledIndices);
              const maxIdx = Math.max(...enabledIndices);
              // 找出在最高和最低等级之间未启用的等级
              const gapLevels = orderedLevels
                .slice(minIdx, maxIdx + 1)
                .filter(lvl => !enabledLevels.has(lvl));
              if (gapLevels.length === 0) return null;
              const levelLabels: Record<string, string> = { bad: '极差', poor: '较差', normal: '普通', good: '正常' };
              const levelColors: Record<string, string> = { bad: 'text-red-600', poor: 'text-orange-600', normal: 'text-blue-600', good: 'text-emerald-600' };
              return (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded bg-amber-50 border border-amber-200">
                  <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠️</span>
                  <div className="text-xs">
                    <p className="font-semibold text-amber-700 mb-1">盲区警告：存在未配置的中间等级</p>
                    <p className="text-amber-600">
                      当前配置存在等级跳跃，以下等级未启用自定义规则，将回退使用系统默认规则判定，可能导致该等级域名被错误归类：
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {gapLevels.map(lvl => (
                        <span key={lvl} className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-bold bg-white border-amber-300 ${levelColors[lvl]}`}>
                          {levelLabels[lvl]}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-1.5 gap-3">
                      <p className="text-amber-500">建议：补充配置以上等级的规则，或调整已启用等级的覆盖范围以消除盲区。</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {autoFillSnapshot && (
                          <button
                            type="button"
                            onClick={undoAutoFill}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white border border-amber-300 text-amber-600 hover:bg-amber-50 transition-colors whitespace-nowrap"
                          >
                            ↩ 撤销
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={autoFillGapLevels}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors whitespace-nowrap"
                        >
                          ✨ 一键补全
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            {forms.map((form, idx) => {
              const meta = RATING_LEVELS[idx];
              const isFirstFilled = highlightedLevels.size > 0 &&
                form.level === [...['bad', 'poor', 'normal', 'good']].find(lvl => highlightedLevels.has(lvl));
              const isHighlighted = highlightedLevels.has(form.level);
              return (
                <div
                  key={form.level}
                  ref={isFirstFilled ? firstFilledRef : null}
                  className={`rounded border p-4 transition-all ${
                    isHighlighted
                      ? 'ring-2 ring-amber-400 ring-offset-1 animate-[highlight-pulse_2s_ease-out_forwards] ' + (form.enabled ? colorMap[meta.color] : 'bg-muted/30 border-border opacity-60')
                      : form.enabled ? colorMap[meta.color] : 'bg-muted/30 border-border opacity-60'
                  }`}
                >
                  {/* 等级标题行 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold ${
                        form.enabled ? badgeMap[meta.color] : 'bg-muted text-muted-foreground border-border'
                      }`}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{meta.desc}</span>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <span className="text-xs text-muted-foreground">启用</span>
                      <div
                        className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                          form.enabled ? 'bg-purple-500' : 'bg-muted-foreground/30'
                        }`}
                        onClick={() => updateForm(form.level, 'enabled', !form.enabled)}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                          form.enabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`} />
                      </div>
                    </label>
                  </div>

                  {/* 条件设置 */}
                  {form.enabled && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-foreground block mb-1">
                            失败节点数 ≥
                          </label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="不限（留空）"
                            value={form.maxFailNodes}
                            onChange={e => updateForm(form.level, 'maxFailNodes', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-foreground block mb-1">
                            平均延迟 ≥ (ms)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="不限（留空）"
                            value={form.maxAvgLatencyMs}
                            onChange={e => updateForm(form.level, 'maxAvgLatencyMs', e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      {/* 逻辑运算符 */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">条件关系：</span>
                        <div className="flex gap-1">
                          {(['AND', 'OR'] as const).map(op => (
                            <button
                              key={op}
                              type="button"
                              onClick={() => updateForm(form.level, 'operator', op)}
                              className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                                form.operator === op
                                  ? 'bg-purple-500 text-white border-purple-500'
                                  : 'bg-card text-muted-foreground border-border hover:border-purple-300'
                              }`}
                            >
                              {op === 'AND' ? '同时满足 (AND)' : '满足任意 (OR)'}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* 预览说明 */}
                      <p className="text-[11px] text-muted-foreground">
                        触发条件：
                        {form.maxFailNodes !== '' && `失败节点数 ≥ ${form.maxFailNodes}`}
                        {form.maxFailNodes !== '' && form.maxAvgLatencyMs !== '' && (
                          <strong className="mx-1">{form.operator === 'AND' ? '且' : '或'}</strong>
                        )}
                        {form.maxAvgLatencyMs !== '' && `平均延迟 ≥ ${Number(form.maxAvgLatencyMs).toLocaleString()} ms`}
                        {form.maxFailNodes === '' && form.maxAvgLatencyMs === '' && (
                          <span className="text-amber-600">⚠ 未设置任何条件，此规则将始终匹配</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ─── 规则生效预览区域 ─── */}
        <div className="mt-4 rounded border border-purple-200 bg-purple-50/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-purple-700">🧪 规则生效预览</span>
            <span className="text-xs text-muted-foreground">输入假设数据，实时验证当前规则配置是否符合预期</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                假设失败节点数
              </label>
              <Input
                type="number"
                min="0"
                placeholder="输入失败节点数"
                value={previewFailNodes}
                onChange={e => setPreviewFailNodes(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                假设平均延迟 (ms)
              </label>
              <Input
                type="number"
                min="0"
                placeholder="输入延迟毫秒数"
                value={previewLatencyMs}
                onChange={e => setPreviewLatencyMs(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
          </div>

          {/* 预览结果 */}
          {computePreviewRating === null ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-white border border-purple-100 text-xs text-muted-foreground">
              <span className="text-purple-400">ℹ️</span>
              输入失败节点数或延迟开始预览
            </div>
          ) : computePreviewRating.mode === 'default' ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded bg-white border border-gray-200">
              <span className="text-gray-400">📏</span>
              <div className="text-xs">
                <span className="font-semibold text-gray-600">未配置任何自定义规则</span>
                <span className="text-muted-foreground ml-1">— 将使用系统默认规则判定</span>
              </div>
            </div>
          ) : computePreviewRating.mode === 'fallback' ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded bg-amber-50 border border-amber-200">
              <span className="text-amber-500">⚠️</span>
              <div className="text-xs">
                <span className="font-semibold text-amber-700">无自定义规则匹配</span>
                <span className="text-amber-600 ml-1">— 回归系统默认规则判定，建议检查规则是否存在盲区</span>
              </div>
            </div>
          ) : (() => {
            const levelMeta = RATING_LEVELS.find(l => l.level === computePreviewRating.level);
            const colorStyles: Record<string, { bg: string; border: string; badge: string; text: string }> = {
              emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700 border-emerald-300', text: 'text-emerald-700' },
              blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700 border-blue-300',       text: 'text-blue-700' },
              orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  badge: 'bg-orange-100 text-orange-700 border-orange-300', text: 'text-orange-700' },
              red:     { bg: 'bg-red-50',     border: 'border-red-200',     badge: 'bg-red-100 text-red-700 border-red-300',         text: 'text-red-700' },
            };
            const cs = colorStyles[levelMeta?.color ?? 'blue'];
            const rule = computePreviewRating.matchedRule!;
            const condParts: string[] = [];
            if (rule.maxFailNodes !== '') condParts.push(`失败节点 ≥ ${rule.maxFailNodes}`);
            if (rule.maxAvgLatencyMs !== '') condParts.push(`延迟 ≥ ${Number(rule.maxAvgLatencyMs).toLocaleString()} ms`);
            const condStr = condParts.length === 0
              ? '始终匹配（未设置条件）'
              : condParts.join(rule.operator === 'OR' ? ' 或 ' : ' 且 ');
            return (
              <div className={`flex items-start gap-3 px-3 py-2.5 rounded border ${cs.bg} ${cs.border}`}>
                <div className="flex-shrink-0 mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold ${cs.badge}`}>
                    {levelMeta?.label ?? computePreviewRating.label}
                  </span>
                </div>
                <div className="text-xs">
                  <p className={`font-semibold ${cs.text}`}>判定为「{levelMeta?.label}」（自定义规则）</p>
                  <p className="text-muted-foreground mt-0.5">命中规则：{condStr}</p>
                  {(computePreviewRating.level === 'poor' || computePreviewRating.level === 'bad') && (
                    <p className="text-red-500 mt-0.5 font-medium">⚠️ 此等级将触发 Telegram 告警和站内信通知</p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button
            onClick={handleSave}
            disabled={setRulesMutation.isPending}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            {setRulesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Settings2 className="w-4 h-4 mr-2" />}
            保存规则
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface GroupCardProps {
  group: {
    id: number;
    name: string;
    category: string;
    remark: string | null;
    tool: string;
    enabled: boolean;
    taskStatus: "pending" | "authorized";
    authorizedAt: Date | null;
    domainCount: number;
    statusCount: { ok: number; warn: number; error: number; poor: number; pending: number };
    lastCheckedAt: Date | null;
    intervalMinutes?: number | null;
    windowStartHour?: number | null;
    windowStartMinute?: number | null;
    windowEndHour?: number | null;
    windowEndMinute?: number | null;
    hasCustomRules?: boolean;
    customRuleCount?: number;
    priority?: string | null;
  };
  onRefresh: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
  healthFilter?: 'persistent' | 'permanent' | null;
  /** 当前批次检测进度（存在时表示进度条） */
  checkProgress?: { total: number; completed: number } | null;
}

// ─── 分组检测进度条组件 ─────────────────────────────────────────────────────────
/**
 * 工具颜色配置：ITDOG=蓝色、阿里云=绿色、Zhale=紫色
 */
const TOOL_THEME: Record<string, {
  bg: string; border: string; trackBg: string; bar: string;
  text: string; subText: string; icon: string;
}> = {
  itdog:  { bg: 'bg-blue-50/70',   border: 'border-blue-100',   trackBg: 'bg-blue-100',   bar: 'bg-blue-500',   text: 'text-blue-700',  subText: 'text-blue-500',  icon: 'text-blue-600' },
  aliyun: { bg: 'bg-emerald-50/70', border: 'border-emerald-100', trackBg: 'bg-emerald-100', bar: 'bg-emerald-500', text: 'text-emerald-700', subText: 'text-emerald-500', icon: 'text-emerald-600' },
  zhale:  { bg: 'bg-purple-50/70',  border: 'border-purple-100',  trackBg: 'bg-purple-100',  bar: 'bg-purple-500',  text: 'text-purple-700', subText: 'text-purple-500', icon: 'text-purple-600' },
};
const DEFAULT_THEME = TOOL_THEME.itdog;

function GroupProgressBar({
  checkProgress,
  tool,
}: {
  checkProgress?: { total: number; completed: number } | null;
  tool: string;
}) {
  // 持久化进度数据：即使 checkProgress 变为 null 也保留最后一次的数据，用于完成动画
  const [lastProgress, setLastProgress] = useState<{ total: number; completed: number } | null>(null);
  // 显示状态：'running' | 'done' | 'hidden'
  const [phase, setPhase] = useState<'running' | 'done' | 'hidden'>('hidden');
  // 开始时间（第一次收到进度时记录）
  const startTimeRef = useRef<number | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (checkProgress && checkProgress.total > 0) {
      // 有进度数据：更新持久化数据
      setLastProgress(checkProgress);
      if (phase === 'hidden') {
        setPhase('running');
        startTimeRef.current = Date.now();
      } else if (phase === 'done') {
        // 如果新一轮检测开始，重置为 running
        setPhase('running');
        startTimeRef.current = Date.now();
        if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
      }
    } else if (phase === 'running') {
      // 进度消失（检测完成）：切换到 done 状态，1.5秒后隐藏
      setPhase('done');
      hideTimerRef.current = setTimeout(() => setPhase('hidden'), 1500);
    }
    return () => {};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkProgress]);

  // 清理定时器
  useEffect(() => () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }, []);

  if (phase === 'hidden' || !lastProgress || lastProgress.total === 0) return null;

  const theme = TOOL_THEME[tool] ?? DEFAULT_THEME;
  const pct = Math.round((lastProgress.completed / lastProgress.total) * 100);
  const isDone = phase === 'done';

  // 预计剩余时间计算
  let etaLabel = '';
  if (!isDone && startTimeRef.current && lastProgress.completed > 0) {
    const elapsedMs = Date.now() - startTimeRef.current;
    const msPerItem = elapsedMs / lastProgress.completed;
    const remaining = lastProgress.total - lastProgress.completed;
    const etaMs = msPerItem * remaining;
    if (etaMs < 60000) {
      etaLabel = `预计还需 ${Math.ceil(etaMs / 1000)} 秒`;
    } else {
      etaLabel = `预计还需 ${Math.ceil(etaMs / 60000)} 分钟`;
    }
  }

  return (
    <div
      className={`px-4 py-2 border-t transition-opacity duration-700 ${
        isDone ? 'opacity-0' : 'opacity-100'
      } ${theme.bg} ${theme.border}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-medium flex items-center gap-1 ${theme.text}`}>
          {isDone ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <Loader2 className="w-3 h-3 animate-spin" />
          )}
          {isDone ? '检测完成' : '检测中'}
        </span>
        <div className="flex items-center gap-2">
          {!isDone && etaLabel && (
            <span className={`text-[10px] ${theme.subText}`}>{etaLabel}</span>
          )}
          <span className={`text-xs tabular-nums ${theme.icon}`}>
            {lastProgress.completed} / {lastProgress.total}
          </span>
        </div>
      </div>
      <div className={`h-1.5 rounded-full overflow-hidden ${theme.trackBg}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${theme.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={`mt-0.5 text-[10px] ${theme.subText}`}>
        {pct}% 完成
      </div>
    </div>
  );
}

// ─── 可拖拽分组卡片包装器 ─────────────────────────────────────────────────────
function SortableGroupCard(props: GroupCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.group.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors z-10"
        title="拖拽排序"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      <div className="pl-6">
        <GroupCard {...props} />
      </div>
    </div>
  );
}

function GroupCard({ group, onRefresh, expanded = false, onToggleExpand, healthFilter, checkProgress }: GroupCardProps) {
  const setExpanded = onToggleExpand ?? (() => {});
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editCategory, setEditCategory] = useState(group.category);
  const [editRemark, setEditRemark] = useState(group.remark ?? "");
  const [editTool, setEditTool] = useState<"itdog" | "aliyun" | "zhale">(group.tool === "aliyun" ? "aliyun" : group.tool === "zhale" ? "zhale" : "itdog");
  const [editIntervalMinutes, setEditIntervalMinutes] = useState<number | null>(group.intervalMinutes ?? null);
  const [editPriority, setEditPriority] = useState<'high' | 'normal'>((group.priority as 'high' | 'normal') ?? 'normal');
  // 自定义分钟数输入框的字符串状态（空字符串=未激活，非空=已激活）
  const [editCustomInterval, setEditCustomInterval] = useState<string>(
    group.intervalMinutes && !INTERVAL_OPTIONS.find(o => o.value === group.intervalMinutes)
      ? String(group.intervalMinutes)
      : ''
  );
  // 时间窗口设置（null 表示不限制）
  // 使用 HH:MM 格式字符串存储，支持分钟级精度
  const [editWindowEnabled, setEditWindowEnabled] = useState<boolean>(
    group.windowStartHour != null && group.windowEndHour != null
  );
  const [editWindowStart, setEditWindowStart] = useState<string>(
    group.windowStartHour != null
      ? `${String(group.windowStartHour).padStart(2,'0')}:${String(group.windowStartMinute ?? 0).padStart(2,'0')}`
      : '08:00'
  );
  const [editWindowEnd, setEditWindowEnd] = useState<string>(
    group.windowEndHour != null
      ? `${String(group.windowEndHour).padStart(2,'0')}:${String(group.windowEndMinute ?? 0).padStart(2,'0')}`
      : '22:00'
  );
  // 解析 HH:MM 字符串为小时和分钟
  function parseTimeStr(s: string): { hour: number; minute: number } | null {
    const m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = parseInt(m[1]), min = parseInt(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return { hour: h, minute: min };
  }

  const editMutation = trpc.scheduled.updateGroup.useMutation({
    onSuccess: () => {
      toast.success("分组已更新");
      setShowEditDialog(false);
      onRefresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const handleEdit = () => {
    if (!editName.trim()) { toast.error("请输入分组名称"); return; }
    if (editWindowEnabled) {
      const s = parseTimeStr(editWindowStart);
      const e = parseTimeStr(editWindowEnd);
      if (!s || !e) { toast.error("时间窗口格式不正确，请使用 HH:MM 格式"); return; }
      const sm = s.hour * 60 + s.minute;
      const em = e.hour * 60 + e.minute;
      if (sm === em) { toast.error("开始和结束时间不能相同"); return; }
    }
    const startParsed = editWindowEnabled ? parseTimeStr(editWindowStart) : null;
    const endParsed = editWindowEnabled ? parseTimeStr(editWindowEnd) : null;
    editMutation.mutate({
      groupId: group.id,
      name: editName.trim(),
      category: editCategory.trim() || "默认",
      remark: editRemark.trim() || undefined,
      tool: editTool,
      intervalMinutes: editIntervalMinutes,
      priority: editPriority,
      windowStartHour: startParsed ? startParsed.hour : null,
      windowStartMinute: startParsed ? startParsed.minute : null,
      windowEndHour: endParsed ? endParsed.hour : null,
      windowEndMinute: endParsed ? endParsed.minute : null,
    });
  };

  const toggleMutation = trpc.scheduled.updateGroup.useMutation({
    onSuccess: () => onRefresh(),
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.scheduled.deleteGroup.useMutation({
    onSuccess: () => {
      toast.success("分组已删除");
      onRefresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const authorizeMutation = trpc.scheduled.authorizeGroup.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      onRefresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const revokeMutation = trpc.scheduled.revokeGroup.useMutation({
    onSuccess: () => {
      toast.success("已撤销授权");
      onRefresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const totalDone = group.statusCount.ok + group.statusCount.warn + group.statusCount.error + (group.statusCount.poor ?? 0);
  const hasIssues = group.statusCount.error > 0 || group.statusCount.warn > 0 || (group.statusCount.poor ?? 0) > 0;
  const isAuthorized = group.taskStatus === "authorized";
   return (
    <div id={`group-${group.id}`} className={`bg-card border rounded overflow-hidden transition-all duration-200  ${!group.enabled ? "opacity-60" : "hover:"} ${hasIssues ? "border-amber-200" : isAuthorized ? "border-blue-200" : "border-border"}`}>
      {/* 分组头部 */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded()}
      >
        <button className="text-muted-foreground flex-shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{group.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{group.category}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
              group.tool === "aliyun"
                ? "bg-orange-50 text-orange-600 border-orange-200"
                : group.tool === "zhale"
                ? "bg-red-50 text-red-600 border-red-200"
                : "bg-blue-50 text-blue-600 border-blue-200"
            }`}>
              {group.tool === "aliyun" ? "🌐 阿里云" : group.tool === "zhale" ? "💥 炸了么" : "🐶 ITDOG"}
            </span>
            <AuthBadge taskStatus={group.taskStatus} />
            {group.priority === 'high' && (
              <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-300 font-medium">
                <span>⚡</span>
                <span>高优先</span>
              </span>
            )}
            {!group.enabled && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">已暂停</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span>{group.domainCount} 个域名</span>
            {totalDone > 0 && (
              <>
                {group.statusCount.ok > 0 && <span className="text-emerald-600">✓ {group.statusCount.ok} 正常</span>}
                {group.statusCount.warn > 0 && <span className="text-amber-600">⚠ {group.statusCount.warn} 警告</span>}
                {group.statusCount.error > 0 && <span className="text-red-600">✗ {group.statusCount.error} 异常</span>}
                {(group.statusCount.poor ?? 0) > 0 && <span className="text-orange-700 font-bold">● {group.statusCount.poor} 极差</span>}
              </>
            )}
            {isAuthorized && group.authorizedAt && (
              <span className="text-blue-500">
                授权于 {new Date(group.authorizedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {group.lastCheckedAt && (
              <span>
                最近检测：{new Date(group.lastCheckedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <span className={`${!group.intervalMinutes ? 'text-muted-foreground/60' : 'text-purple-600'}`}>
              <Clock className="w-3 h-3 inline mr-0.5" />
              {intervalLabel(group.intervalMinutes)}{!group.intervalMinutes && ' (默认)'}
            </span>
            {group.windowStartHour != null && group.windowEndHour != null && (() => {
              const s = `${String(group.windowStartHour).padStart(2,'0')}:${String(group.windowStartMinute ?? 0).padStart(2,'0')}`;
              const e = `${String(group.windowEndHour).padStart(2,'0')}:${String(group.windowEndMinute ?? 0).padStart(2,'0')}`;
              return (
                <span className="text-blue-600" title={`检测时间窗口：${s} - ${e}`}>
                  <Timer className="w-3 h-3 inline mr-0.5" />
                  {s}–{e}
                </span>
              );
            })()}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {/* 授权/撤销按鈕（所有已登录用户） */}
          {isAuthorized ? (
            <button
              onClick={() => setShowRevokeConfirm(true)}
              disabled={revokeMutation.isPending}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-amber-200 transition-colors"
              title="撤销授权"
            >
              <Unlock className="w-3 h-3" />
              撤销
            </button>
          ) : (
            <button
              onClick={() => authorizeMutation.mutate({ groupId: group.id })}
              disabled={authorizeMutation.isPending}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 transition-colors"
              title="授权此分组"
            >
              {authorizeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
              授权
            </button>
          )}

          {/* 评级规则按钮（带状态徽标） */}
          <div className="relative inline-flex">
            <button
              onClick={() => setShowRatingDialog(true)}
              className={`p-1.5 rounded transition-colors ${
                group.hasCustomRules
                  ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                  : 'text-muted-foreground hover:text-purple-500 hover:bg-purple-50'
              }`}
              title={group.hasCustomRules
                ? `自定义评级规则（已配置 ${group.customRuleCount ?? 0} 条）`
                : '自定义评级规则（未配置）'
              }
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
            {/* 状态徽标 */}
            {group.hasCustomRules ? (
              <span
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-purple-500 rounded-full border border-background flex items-center justify-center"
                title={`已配置 ${group.customRuleCount ?? 0} 条自定义规则`}
              />
            ) : (
              <span
                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-muted-foreground/30 rounded-full border border-background"
                title="未配置自定义规则"
              />
            )}
          </div>
          {/* 编辑按钮 */}
          <button
            onClick={() => {
              setEditName(group.name);
              setEditCategory(group.category);
              setEditRemark(group.remark ?? "");
              setEditTool(group.tool === "aliyun" ? "aliyun" : "itdog");
              setShowEditDialog(true);
            }}
            className="p-1.5 rounded text-muted-foreground hover:text-blue-500 hover:bg-blue-50 transition-colors"
            title="编辑分组"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          {/* 启用/暂停按钮 */}
          <button
            onClick={() => toggleMutation.mutate({ groupId: group.id, enabled: !group.enabled })}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={group.enabled ? "暂停自动检测" : "启用自动检测"}
          >
            {group.enabled ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4" />}
          </button>

          {/* 删除按鈕 */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
            title="删除分组"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {/* 当前批次检测进度条（检测进行中时显示，完成后淡出） */}
      <GroupProgressBar checkProgress={checkProgress} tool={group.tool} />
      {/* 展开的域名列表 */}
      {expanded && (
          <DomainList
          groupId={group.id}
          groupName={group.name}
          groupCategory={group.category}
          isAuthorized={isAuthorized}
          healthFilter={healthFilter}
        />
      )}
      {/* 删除确认弹窗 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              删除分组
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm text-foreground">
              确定删除分组「<span className="font-semibold">{group.name}</span>」？
            </p>
            <p className="text-xs text-muted-foreground">
              该分组下所有域名和检测记录将被永久删除，此操作不可撤销。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>取消</Button>
            <Button
              variant="destructive"
              onClick={() => { setShowDeleteConfirm(false); deleteMutation.mutate({ groupId: group.id }); }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 撤销授权确认弹窗 */}
      <Dialog open={showRevokeConfirm} onOpenChange={setShowRevokeConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Unlock className="w-5 h-5" />
              撤销授权
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm text-foreground">
              确定撤销分组「<span className="font-semibold">{group.name}</span>」的授权？
            </p>
            <p className="text-xs text-muted-foreground">
              撤销后将停止自动定时检测，可随时重新授权。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeConfirm(false)}>取消</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => { setShowRevokeConfirm(false); revokeMutation.mutate({ groupId: group.id }); }}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              确认撤销
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑分组弹窗 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑分组「{group.name}」</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                分组名称 *
              </label>
              <Input
                placeholder="如：主站域名、备用线路"
                value={editName}
                onChange={e => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">检测工具</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setEditTool("itdog")}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded border text-sm font-medium transition-colors ${
                    editTool === "itdog"
                      ? "bg-blue-50 border-blue-400 text-blue-700"
                      : "bg-card border-border text-muted-foreground hover:border-blue-300"
                  }`}
                >
                  <span className="text-base">🐶</span>
                  <span>ITDOG</span>
                  {editTool === "itdog" && <span className="ml-auto text-blue-500 text-xs">✓</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setEditTool("aliyun")}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded border text-sm font-medium transition-colors ${
                    editTool === "aliyun"
                      ? "bg-orange-50 border-orange-400 text-orange-700"
                      : "bg-card border-border text-muted-foreground hover:border-orange-300"
                  }`}
                >
                  <span className="text-base">🌐</span>
                  <span>阿里云</span>
                  {editTool === "aliyun" && <span className="ml-auto text-orange-500 text-xs">✓</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setEditTool("zhale")}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded border text-sm font-medium transition-colors ${
                    editTool === "zhale"
                      ? "bg-red-50 border-red-400 text-red-700"
                      : "bg-card border-border text-muted-foreground hover:border-red-300"
                  }`}
                >
                  <span className="text-base">💥</span>
                  <span>炸了么</span>
                  {editTool === "zhale" && <span className="ml-auto text-red-500 text-xs">✓</span>}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                类别标签
              </label>
              <Input
                placeholder="如：主站、备用、测试（默认：默认）"
                value={editCategory}
                onChange={e => setEditCategory(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">备注（可选）</label>
              <Input
                placeholder="分组用途说明"
                value={editRemark}
                onChange={e => setEditRemark(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">检测间隔</label>
              <div className="grid grid-cols-2 gap-1.5">
                {INTERVAL_OPTIONS.map(opt => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      setEditIntervalMinutes(opt.value);
                      setEditCustomInterval('');
                    }}
                    className={`px-3 py-2 rounded border text-xs font-medium transition-colors text-left ${
                      editIntervalMinutes === opt.value && !editCustomInterval
                        ? 'bg-purple-50 border-purple-400 text-purple-700'
                        : 'bg-card border-border text-muted-foreground hover:border-purple-300'
                    }`}
                  >
                    {opt.label}
                    {editIntervalMinutes === opt.value && !editCustomInterval && <span className="float-right text-purple-500">✓</span>}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    if (editCustomInterval !== '') {
                      // 已激活：再次点击关闭，清除自定义值
                      setEditCustomInterval('');
                      setEditIntervalMinutes(null);
                    } else {
                      // 未激活：激活输入框，预填当前间隔值（若非预设选项）
                      const presetValues = INTERVAL_OPTIONS.map(o => o.value);
                      const initVal = editIntervalMinutes && !presetValues.includes(editIntervalMinutes)
                        ? String(editIntervalMinutes)
                        : '';
                      setEditCustomInterval(initVal || '60');
                      if (!initVal) setEditIntervalMinutes(60);
                    }
                  }}
                  className={`px-3 py-2 rounded border text-xs font-medium transition-colors text-left ${
                    editCustomInterval !== ''
                      ? 'bg-purple-50 border-purple-400 text-purple-700'
                      : 'bg-card border-border text-muted-foreground hover:border-purple-300'
                  }`}
                >
                  自定义分钟数
                  {editCustomInterval !== '' && <span className="float-right text-purple-500">✓</span>}
                </button>
              </div>
              {editCustomInterval !== '' && (
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    type="number"
                    min={1}
                    max={10080}
                    placeholder="输入分钟数（1-10080）"
                    value={editCustomInterval}
                    onChange={e => {
                      const v = e.target.value;
                      setEditCustomInterval(v);
                      const n = parseInt(v);
                      if (!isNaN(n) && n >= 1) setEditIntervalMinutes(n);
                    }}
                    className="h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">分钟/次</span>
                </div>
              )}
              {!editIntervalMinutes && !editCustomInterval && (
                <p className="text-xs text-muted-foreground">未设置时默认每小时检测一次</p>
              )}
            </div>
          </div>

          {/* 检测时间窗口 */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">检测时间窗口</label>
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setEditWindowEnabled(v => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  editWindowEnabled ? 'bg-purple-500' : 'bg-border'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  editWindowEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </button>
              <span className="text-xs text-foreground">
                {editWindowEnabled ? '仅在指定时段内执行' : '不限制时间（全天 24 小时）'}
              </span>
            </div>
            {editWindowEnabled && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-12">开始时间</span>
                    <Input
                      type="text"
                      placeholder="HH:MM"
                      value={editWindowStart}
                      onChange={e => setEditWindowStart(e.target.value)}
                      className={`h-8 text-xs w-20 ${parseTimeStr(editWindowStart) ? '' : 'border-red-400'}`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">至</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-12">结束时间</span>
                    <Input
                      type="text"
                      placeholder="HH:MM"
                      value={editWindowEnd}
                      onChange={e => setEditWindowEnd(e.target.value)}
                      className={`h-8 text-xs w-20 ${parseTimeStr(editWindowEnd) ? '' : 'border-red-400'}`}
                    />
                  </div>
                </div>
                {(() => {
                  const s = parseTimeStr(editWindowStart);
                  const e = parseTimeStr(editWindowEnd);
                  if (!s || !e) return <p className="text-[11px] text-red-500">请输入正确的时间格式（HH:MM）</p>;
                  const sm = s.hour * 60 + s.minute;
                  const em = e.hour * 60 + e.minute;
                  const startStr = `${String(s.hour).padStart(2,'0')}:${String(s.minute).padStart(2,'0')}`;
                  const endStr = `${String(e.hour).padStart(2,'0')}:${String(e.minute).padStart(2,'0')}`;
                  if (sm === em) return <p className="text-[11px] text-red-500">警告：开始和结束时间相同，将导致永不执行</p>;
                  if (sm > em) return <p className="text-[11px] text-muted-foreground">跨午夜时段：{startStr} — 次日 {endStr}</p>;
                  return <p className="text-[11px] text-muted-foreground">每日 {startStr} — {endStr}</p>;
                })()}
              </div>
            )}
          </div>

          {/* 检测优先级 */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">检测优先级</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditPriority('normal')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded border text-sm font-medium transition-colors ${
                  editPriority === 'normal'
                    ? 'bg-slate-50 border-slate-400 text-slate-700'
                    : 'bg-card border-border text-muted-foreground hover:border-slate-300'
                }`}
              >
                <span className="text-base">⏱️</span>
                <span>普通</span>
                {editPriority === 'normal' && <span className="ml-auto text-slate-500 text-xs">✓</span>}
              </button>
              <button
                type="button"
                onClick={() => setEditPriority('high')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded border text-sm font-medium transition-colors ${
                  editPriority === 'high'
                    ? 'bg-amber-50 border-amber-400 text-amber-700'
                    : 'bg-card border-border text-muted-foreground hover:border-amber-300'
                }`}
              >
                <span className="text-base">⚡</span>
                <span>高优先</span>
                {editPriority === 'high' && <span className="ml-auto text-amber-500 text-xs">✓</span>}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">高优先分组在调度器中优先执行，适合关键业务域名</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
            <Button onClick={handleEdit} disabled={editMutation.isPending}>
              {editMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 评级规则弹窗 */}
      {showRatingDialog && (
        <RatingRulesDialog
          groupId={group.id}
          groupName={group.name}
          onClose={() => setShowRatingDialog(false)}
        />
      )}
    </div>
  );
}
// ─── 主页面 ────────────────────────────────────────────────────────────────────

export default function ScheduledTasks() {
  const [, navigate] = useLocation();
  const { user } = useAppAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState("默认");
  const [newGroupRemark, setNewGroupRemark] = useState("");
  const [newGroupTool, setNewGroupTool] = useState<"itdog" | "aliyun" | "zhale">("itdog");
  const [newGroupIntervalMinutes, setNewGroupIntervalMinutes] = useState<number | null>(null);
  const [newGroupPriority, setNewGroupPriority] = useState<'high' | 'normal'>('normal');

  // 持久化分组展开/折叠状态（按用户 ID 隔离）
  const [expandedGroupIds, setExpandedGroupIds] = useUserStorage<number[]>('scheduled_expanded_groups', []);
  // 持久化类别折叠状态（按用户 ID 隔离）
  const [collapsedCategories, setCollapsedCategories] = useUserStorage<string[]>('scheduled_collapsed_categories', []);
  // 持久化分组排序（按用户 ID 隔离）：key=category, value=groupId[]（排序后的顺序）
  const [categoryGroupOrder, setCategoryGroupOrder] = useUserStorage<Record<string, number[]>>('scheduled_group_order', {});

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // URL hash 定位：跳转到指定分组并展开
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#group-')) return;
    const groupId = parseInt(hash.replace('#group-', ''), 10);
    if (isNaN(groupId)) return;
    // 展开目标分组
    setExpandedGroupIds(prev => {
      const s = new Set(prev);
      s.add(groupId);
      return Array.from(s);
    });
    // 延迟滚动，等待 DOM 渲染
    setTimeout(() => {
      const el = document.getElementById(`group-${groupId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-purple-400', 'ring-offset-2');
        setTimeout(() => el.classList.remove('ring-2', 'ring-purple-400', 'ring-offset-2'), 3000);
      }
    }, 800);
  }, []);
  const expandedSet = new Set(expandedGroupIds);
  const toggleGroupExpand = (groupId: number) => {
    setExpandedGroupIds(prev => {
      const s = new Set(prev);
      if (s.has(groupId)) s.delete(groupId); else s.add(groupId);
      return Array.from(s);
    });
  };

  const groupsQuery = trpc.scheduled.listGroups.useQuery(undefined, {
    refetchInterval: 60000,
  });
  // 调度器状态轮询（2秒一次），用于获取各分组的实时检测进度
  const schedulerStatusQuery = trpc.scheduled.getSchedulerStatus.useQuery(undefined, {
    refetchInterval: 2000,
    staleTime: 1000,
  });
  // 构建 groupId -> progress 映射，供分组卡片使用
  const groupProgressMap = useMemo(() => {
    const map = new Map<number, { total: number; completed: number }>();
    for (const p of schedulerStatusQuery.data?.groupProgress ?? []) {
      map.set(p.groupId, { total: p.total, completed: p.completed });
    }
    return map;
  }, [schedulerStatusQuery.data?.groupProgress]);
  const createMutation = trpc.scheduled.createGroup.useMutation({
    onSuccess: () => {
      toast.success("分组创建成功，请点击「授权」按鈕启用自动检测");
      setShowCreateDialog(false);
      setNewGroupName("");
      setNewGroupCategory("默认");
      setNewGroupRemark("");
      setNewGroupTool("itdog");
      setNewGroupIntervalMinutes(null);
      groupsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const groups = groupsQuery.data ?? [];

  // 按类别分组，并应用本地排序
  const groupsByCategory = useMemo(() => {
    const raw: Record<string, typeof groups> = {};
    for (const g of groups) {
      const cat = g.category || "默认";
      if (!raw[cat]) raw[cat] = [];
      raw[cat].push(g);
    }
    // 应用本地排序
    const sorted: Record<string, typeof groups> = {};
    for (const [cat, catGroups] of Object.entries(raw)) {
      const order = categoryGroupOrder[cat];
      if (order && order.length > 0) {
        const orderMap = new Map(order.map((id, idx) => [id, idx]));
        sorted[cat] = [...catGroups].sort((a, b) => {
          const ai = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
          const bi = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
          return ai - bi;
        });
      } else {
        sorted[cat] = catGroups;
      }
    }
    return sorted;
  }, [groups, categoryGroupOrder]);

  // 拖拽结束处理
  const handleDragEnd = useCallback((event: DragEndEvent, category: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const catGroups = groupsByCategory[category] ?? [];
    const oldIndex = catGroups.findIndex(g => g.id === active.id);
    const newIndex = catGroups.findIndex(g => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(catGroups, oldIndex, newIndex).map(g => g.id);
    setCategoryGroupOrder(prev => ({ ...prev, [category]: newOrder }));
  }, [groupsByCategory, setCategoryGroupOrder]);

  // 类别折叠切换
  const toggleCategoryCollapse = useCallback((category: string) => {
    setCollapsedCategories(prev => {
      const s = new Set(prev);
      if (s.has(category)) s.delete(category); else s.add(category);
      return Array.from(s);
    });
  }, [setCollapsedCategories]);

  const handleCreate = useCallback(() => {
    if (!newGroupName.trim()) { toast.error("请输入分组名称"); return; }
    createMutation.mutate({
      name: newGroupName.trim(),
      category: newGroupCategory.trim() || "默认",
      remark: newGroupRemark.trim() || undefined,
      tool: newGroupTool,
      intervalMinutes: newGroupIntervalMinutes,
      priority: newGroupPriority,
    });
  }, [newGroupName, newGroupCategory, newGroupRemark, newGroupTool, newGroupIntervalMinutes, newGroupPriority, createMutation]);

  const authorizedCount = groups.filter(g => g.taskStatus === "authorized").length;
  const pendingCount = groups.filter(g => g.taskStatus === "pending").length;

  // 全局搜索状态
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  // 防抖：输入 300ms 后再搜索
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchInput = useCallback((val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim()) {
      setSearchKeyword("");
      setShowSearchResults(false);
      return;
    }
    searchTimer.current = setTimeout(() => {
      setSearchKeyword(val.trim());
      setShowSearchResults(true);
    }, 300);
  }, []);
  const searchQuery = trpc.scheduled.searchDomains.useQuery(
    { keyword: searchKeyword },
    { enabled: searchKeyword.length >= 1, staleTime: 5000 }
  );
  // 点击搜索结果条目：展开对应分组并滚动到该域名
  const handleSearchResultClick = useCallback((groupId: number, domainId: number) => {
    // 展开对应分组
    setExpandedGroupIds(prev => {
      const s = new Set(prev);
      s.add(groupId);
      return Array.from(s);
    });
    // 展开对应类别（防止类别已折叠）
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setCollapsedCategories(prev => {
        const s = new Set(prev);
        s.delete(group.category || '默认');
        return Array.from(s);
      });
    }
    // 关闭搜索结果面板
    setShowSearchResults(false);
    // 延迟滚动到分组
    setTimeout(() => {
      const groupEl = document.getElementById(`group-${groupId}`);
      if (groupEl) {
        groupEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // 高亮分组卡片
        groupEl.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2');
        setTimeout(() => groupEl.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2'), 2500);
      }
    }, 400);
  }, [groups, setExpandedGroupIds, setCollapsedCategories]);
  // 健康度筛选状态：点击卡片中的数字后自动展开所有分组并筛选域名

  // URL 参数处理：从调度器页面跳转时，自动展开分组并高亮域名
  const searchString = useSearch();
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const highlightGroupId = params.get('highlightGroup');
    const highlightDomainId = params.get('highlightDomain');
    if (!highlightGroupId) return;
    const groupId = parseInt(highlightGroupId, 10);
    if (isNaN(groupId)) return;
    // 展开目标分组
    setExpandedGroupIds(prev => {
      const s = new Set(prev);
      s.add(groupId);
      return Array.from(s);
    });
    // 展开对应类别（防止类别已折叠）
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setCollapsedCategories(prev => {
        const s = new Set(prev);
        s.delete(group.category || '默认');
        return Array.from(s);
      });
    }
    // 延迟滚动，等待 DOM 渲染
    setTimeout(() => {
      const groupEl = document.getElementById(`group-${groupId}`);
      if (groupEl) {
        groupEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        groupEl.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2');
        setTimeout(() => groupEl.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2'), 3000);
      }
      // 如果有 highlightDomainId，滚动到域名行并高亮
      if (highlightDomainId) {
        const domainId = parseInt(highlightDomainId, 10);
        if (!isNaN(domainId)) {
          setTimeout(() => {
            const domainEl = document.getElementById(`domain-row-${domainId}`);
            if (domainEl) {
              domainEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              domainEl.classList.add('ring-2', 'ring-amber-400', 'ring-offset-1', 'bg-amber-50');
              setTimeout(() => domainEl.classList.remove('ring-2', 'ring-amber-400', 'ring-offset-1', 'bg-amber-50'), 3000);
            }
          }, 600);
        }
      }
    }, 800);
  }, [searchString, groups, setExpandedGroupIds, setCollapsedCategories]);
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav activeTab="scheduled" />

      {/* 内容区 */}
      <main className="container py-6 flex-1">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 页面标题 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold text-foreground">批量定时域名检测</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                24 小时持续运行，按分组配置间隔自动检测已授权分组
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              新建分组
            </Button>
          </div>

          {/* 全局搜索框 */}
          <div className="relative" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowSearchResults(false); }}>
            <div className="relative flex items-center">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={e => handleSearchInput(e.target.value)}
                onFocus={() => { if (searchKeyword) setShowSearchResults(true); }}
                placeholder="搜索域名，支持跨分组查找..."
                className="w-full h-10 pl-9 pr-9 rounded border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(""); setSearchKeyword(""); setShowSearchResults(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* 搜索结果下拉面板 */}
            {showSearchResults && searchKeyword && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-card border border-border rounded  overflow-hidden">
                {searchQuery.isLoading ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    搜索中...
                  </div>
                ) : !searchQuery.data || searchQuery.data.results.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <Globe className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">未找到包含「{searchKeyword}」的域名</p>
                  </div>
                ) : (
                  <>
                    <div className="px-3 py-2 border-b border-border bg-muted/30">
                      <p className="text-xs text-muted-foreground">
                        共找到 <span className="font-semibold text-foreground">{searchQuery.data.total}</span> 个匹配域名
                        {searchQuery.data.total >= 50 && <span className="ml-1">(显示前 50 个)</span>}
                      </p>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-border">
                      {searchQuery.data.results.map(r => (
                        <button
                          key={r.id}
                          onClick={() => handleSearchResultClick(r.groupId, r.id)}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/60 transition-colors text-left group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-mono text-foreground truncate">
                              {/* 高亮匹配部分 */}
                              {(() => {
                                const idx = r.domain.toLowerCase().indexOf(searchKeyword.toLowerCase());
                                if (idx === -1) return r.domain;
                                return (
                                  <>
                                    {r.domain.slice(0, idx)}
                                    <mark className="bg-yellow-200 dark:bg-yellow-800 text-foreground rounded-sm px-0.5">{r.domain.slice(idx, idx + searchKeyword.length)}</mark>
                                    {r.domain.slice(idx + searchKeyword.length)}
                                  </>
                                );
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{r.groupName}</span>
                            <StatusBadge status={(r.lastStatus ?? 'pending') as any} />
                            {!r.enabled && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700">已暂停</span>
                            )}
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          {/* 授权统计 */}
          {groups.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{authorizedCount}</p>
                <p className="text-xs text-blue-500 mt-0.5">已授权分组</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
                <p className="text-2xl font-bold text-slate-500">{pendingCount}</p>
                <p className="text-xs text-slate-400 mt-0.5">待授权分组</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">
                  {groups.reduce((s, g) => s + g.domainCount, 0)}
                </p>
                <p className="text-xs text-emerald-500 mt-0.5">总域名数</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded p-3 text-center">
                <p className="text-2xl font-bold text-red-600">
                  {groups.reduce((s, g) => s + g.statusCount.error + (g.statusCount.poor ?? 0), 0)}
                </p>
                <p className="text-xs text-red-500 mt-0.5">异常/极差域名</p>
              </div>
            </div>
          )}



          {/* 分组列表 */}
          {groupsQuery.isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded border border-border bg-card p-4 animate-pulse">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-muted" />
                      <div>
                        <div className="h-4 w-32 bg-muted rounded mb-1.5" />
                        <div className="h-3 w-20 bg-muted rounded" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-7 w-16 bg-muted rounded" />
                      <div className="h-7 w-16 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="h-3 w-24 bg-muted rounded" />
                    <div className="h-3 w-20 bg-muted rounded" />
                    <div className="h-3 w-16 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border rounded bg-muted/20">
              <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-muted-foreground opacity-50" />
              </div>
              <p className="text-base font-semibold text-foreground mb-1.5">暂无检测分组</p>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                创建分组并添加域名，管理员授权后系统将按设定间隔自动巡检
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                创建第一个分组
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupsByCategory).map(([category, catGroups]) => {
                const isCollapsed = collapsedCategories.includes(category);
                return (
                  <div key={category}>
                    {/* 类别标题行 */}
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => toggleCategoryCollapse(category)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors group"
                        title={isCollapsed ? "展开该类别" : "折叠该类别"}
                      >
                        {isCollapsed
                          ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                        }
                        {category}
                      </button>
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">{catGroups.length} 个分组</span>
                      {isCollapsed && (
                        <span className="text-xs text-muted-foreground/60 italic">已折叠</span>
                      )}
                    </div>
                    {/* 分组列表（支持拖拽排序） */}
                    {!isCollapsed && (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => handleDragEnd(event, category)}
                      >
                        <SortableContext
                          items={catGroups.map(g => g.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {catGroups.map(g => (
                              <SortableGroupCard
                                key={g.id}
                                group={g}
                                onRefresh={() => groupsQuery.refetch()}
                                expanded={expandedSet.has(g.id)}
                                onToggleExpand={() => toggleGroupExpand(g.id)}
                                checkProgress={groupProgressMap.get(g.id) ?? null}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 创建分组弹窗 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建检测分组</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">分组名称 *</label>
              <Input
                placeholder="如：主站域名、备用线路"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">检测工具</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setNewGroupTool("itdog")}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded border text-sm font-medium transition-colors ${
                    newGroupTool === "itdog"
                      ? "bg-blue-50 border-blue-400 text-blue-700"
                      : "bg-card border-border text-muted-foreground hover:border-blue-300"
                  }`}
                >
                  <span className="text-base">🐶</span>
                  <span>ITDOG</span>
                  {newGroupTool === "itdog" && <span className="ml-auto text-blue-500 text-xs">✓</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setNewGroupTool("aliyun")}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded border text-sm font-medium transition-colors ${
                    newGroupTool === "aliyun"
                      ? "bg-orange-50 border-orange-400 text-orange-700"
                      : "bg-card border-border text-muted-foreground hover:border-orange-300"
                  }`}
                >
                  <span className="text-base">🌐</span>
                  <span>阿里云</span>
                  {newGroupTool === "aliyun" && <span className="ml-auto text-orange-500 text-xs">✓</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setNewGroupTool("zhale")}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded border text-sm font-medium transition-colors ${
                    newGroupTool === "zhale"
                      ? "bg-red-50 border-red-400 text-red-700"
                      : "bg-card border-border text-muted-foreground hover:border-red-300"
                  }`}
                >
                  <span className="text-base">💥</span>
                  <span>炸了么</span>
                  {newGroupTool === "zhale" && <span className="ml-auto text-red-500 text-xs">✓</span>}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">类别标签</label>
              <Input
                placeholder="如：主站、备用、测试（默认：默认）"
                value={newGroupCategory}
                onChange={e => setNewGroupCategory(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">用于在页面上分类展示，相同类别的分组会归为一组</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">备注（可选）</label>
              <Input
                placeholder="分组用途说明"
                value={newGroupRemark}
                onChange={e => setNewGroupRemark(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">检测间隔</label>
              <div className="grid grid-cols-2 gap-1.5">
                {INTERVAL_OPTIONS.map(opt => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setNewGroupIntervalMinutes(opt.value)}
                    className={`px-3 py-2 rounded border text-xs font-medium transition-colors text-left ${
                      newGroupIntervalMinutes === opt.value
                        ? 'bg-purple-50 border-purple-400 text-purple-700'
                        : 'bg-card border-border text-muted-foreground hover:border-purple-300'
                    }`}
                  >
                    {opt.label}
                    {newGroupIntervalMinutes === opt.value && <span className="float-right text-purple-500">✓</span>}
                  </button>
                ))}
              </div>
              {!newGroupIntervalMinutes && (
                <p className="text-xs text-muted-foreground">未设置时默认每小时检测一次</p>
              )}
            </div>
          </div>
          {/* 检测优先级 */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">检测优先级</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewGroupPriority('normal')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded border text-sm font-medium transition-colors ${
                  newGroupPriority === 'normal'
                    ? 'bg-slate-50 border-slate-400 text-slate-700'
                    : 'bg-card border-border text-muted-foreground hover:border-slate-300'
                }`}
              >
                <span className="text-base">⏱️</span>
                <span>普通</span>
                {newGroupPriority === 'normal' && <span className="ml-auto text-slate-500 text-xs">✓</span>}
              </button>
              <button
                type="button"
                onClick={() => setNewGroupPriority('high')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded border text-sm font-medium transition-colors ${
                  newGroupPriority === 'high'
                    ? 'bg-amber-50 border-amber-400 text-amber-700'
                    : 'bg-card border-border text-muted-foreground hover:border-amber-300'
                }`}
              >
                <span className="text-base">⚡</span>
                <span>高优先</span>
                {newGroupPriority === 'high' && <span className="ml-auto text-amber-500 text-xs">✓</span>}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">高优先分组在调度器中优先执行，适合关键业务域名</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
