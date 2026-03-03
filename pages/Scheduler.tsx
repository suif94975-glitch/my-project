/**
 * 调度器独立页面
 * 设计风格：与定时检测页保持一致，Professional SaaS 风格
 * 功能：
 * - 调度器状态总览（并发/待检测/排队/在线人员）
 * - 健康度概览（持续失败/永久失效弹窗汇总，点击跳转定时检测页并高亮）
 * - 近 1 小时并发趋势折线图（含 Hover Tooltip）
 * - 分组倒计时列表
 * - 每日统计弹窗
 * - 功能卡片拖拽排序（账号隔离持久化）
 * - 最快频率刷新（1s 轮询）
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import AppNav from '@/components/AppNav';
import { useUserStorage } from '@/hooks/useUserStorage';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Clock,
  Play,
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  History,
  Users,
  GripVertical,
  Filter,
  BarChart2,
  Activity,
  Zap,
  Globe,
  ExternalLink,
} from 'lucide-react';

// ─── 类型定义 ─────────────────────────────────────────────────────────────────

interface SchedulerStatusData {
  isRunning: boolean;
  currentTask?: string;
  activeCount: number;
  schedulerActiveCount?: number;
  normalActiveCount?: number;
  pendingScheduledCount?: number;
  normalQueueLength?: number;
  maxConcurrent?: number;
  dynamicConcurrent?: number;
  onlineUsers?: Array<{ userId: string; username: string; role: string; isOwner: boolean }>;
  groupProgress?: Array<{ groupId: number; groupName: string; total: number; completed: number }>;
  lastRunAt?: Date | null;
  lastCheckStartedAt?: Date | null;
}

interface FailureDomain {
  id: number;
  domain: string;
  groupId: number;
  groupName: string;
  consecutiveErrors: number;
  totalFailureCycles: number;
  lastStatus: string | null;
  lastCheckedAt: Date | null;
}

// ─── 分组倒计时计算 ───────────────────────────────────────────────────────────

function calcNextRun(
  lastScheduledAt: Date | null | undefined,
  intervalMinutes: number | null | undefined
): { nextAt: Date | null; label: string } {
  const interval = intervalMinutes ?? 60;
  if (!lastScheduledAt) return { nextAt: null, label: '尚未执行' };
  const nextAt = new Date(lastScheduledAt.getTime() + interval * 60 * 1000);
  const diffMs = nextAt.getTime() - Date.now();
  if (diffMs <= 0) return { nextAt, label: '即将执行' };
  const diffMin = Math.floor(diffMs / 60000);
  const diffSec = Math.floor((diffMs % 60000) / 1000);
  if (diffMin >= 60) {
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return { nextAt, label: `${h}小时${m > 0 ? m + '分钟' : ''}后` };
  }
  if (diffMin > 0) return { nextAt, label: `${diffMin}分${diffSec}秒后` };
  return { nextAt, label: `${diffSec}秒后` };
}

// ─── 迷你折线图组件 ───────────────────────────────────────────────────────────

interface MiniLineChartProps {
  snapshots: Array<{
    ts: number;
    dynamicConcurrent: number;
    activeCount: number;
    pendingCount: number;
    normalQueueLen: number;
  }>;
}

function MiniLineChart({ snapshots }: MiniLineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const W = 100;
  const H = 40;
  const PAD = 3;

  const maxConcurrent = useMemo(() => Math.max(...snapshots.map(s => s.dynamicConcurrent), 1), [snapshots]);
  const maxPending = useMemo(() => Math.max(...snapshots.map(s => s.pendingCount), 1), [snapshots]);
  const minTs = snapshots[0]?.ts ?? 0;
  const maxTs = snapshots[snapshots.length - 1]?.ts ?? 1;

  const toX = useCallback((ts: number) => {
    if (maxTs === minTs) return W / 2;
    return PAD + ((ts - minTs) / (maxTs - minTs)) * (W - PAD * 2);
  }, [minTs, maxTs]);

  const toYConcurrent = useCallback((v: number) => {
    return H - PAD - (v / maxConcurrent) * (H - PAD * 2);
  }, [maxConcurrent]);

  const toYPending = useCallback((v: number) => {
    return H - PAD - (v / maxPending) * (H - PAD * 2);
  }, [maxPending]);

  const concurrentPath = useMemo(() => {
    if (snapshots.length < 2) return '';
    return snapshots.map((s, i) => `${i === 0 ? 'M' : 'L'}${toX(s.ts).toFixed(2)},${toYConcurrent(s.dynamicConcurrent).toFixed(2)}`).join(' ');
  }, [snapshots, toX, toYConcurrent]);

  const concurrentFill = useMemo(() => {
    if (snapshots.length < 2) return '';
    const path = snapshots.map((s, i) => `${i === 0 ? 'M' : 'L'}${toX(s.ts).toFixed(2)},${toYConcurrent(s.dynamicConcurrent).toFixed(2)}`).join(' ');
    const lastX = toX(snapshots[snapshots.length - 1].ts).toFixed(2);
    const firstX = toX(snapshots[0].ts).toFixed(2);
    return `${path} L${lastX},${(H - PAD).toFixed(2)} L${firstX},${(H - PAD).toFixed(2)} Z`;
  }, [snapshots, toX, toYConcurrent]);

  const pendingPath = useMemo(() => {
    if (snapshots.length < 2) return '';
    return snapshots.map((s, i) => `${i === 0 ? 'M' : 'L'}${toX(s.ts).toFixed(2)},${toYPending(s.pendingCount).toFixed(2)}`).join(' ');
  }, [snapshots, toX, toYPending]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * W;
    let closestIdx = 0;
    let closestDist = Infinity;
    snapshots.forEach((s, i) => {
      const dist = Math.abs(toX(s.ts) - xPct);
      if (dist < closestDist) { closestDist = dist; closestIdx = i; }
    });
    setHoverIdx(closestIdx);
  }, [snapshots, toX]);

  const hoverSnap = hoverIdx !== null ? snapshots[hoverIdx] : null;
  const hoverX = hoverSnap ? toX(hoverSnap.ts) : null;
  const tooltipRight = hoverX !== null && hoverX > 60;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-12 rounded cursor-crosshair"
        style={{ display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="schedulerConcurrentGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((r, i) => (
          <line
            key={i}
            x1="0" y1={(PAD + r * (H - PAD * 2)).toFixed(2)}
            x2={W} y2={(PAD + r * (H - PAD * 2)).toFixed(2)}
            stroke="currentColor"
            strokeWidth="0.3"
            strokeDasharray="2,2"
            className="text-border"
            opacity="0.5"
          />
        ))}
        <path d={concurrentFill} fill="url(#schedulerConcurrentGrad)" />
        <path d={pendingPath} fill="none" stroke="#fb923c" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" opacity="0.8" strokeDasharray="2,1.5" />
        <path d={concurrentPath} fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
        {hoverIdx !== snapshots.length - 1 && (
          <>
            <circle cx={toX(snapshots[snapshots.length - 1].ts).toFixed(2)} cy={toYConcurrent(snapshots[snapshots.length - 1].dynamicConcurrent).toFixed(2)} r="1.5" fill="#3b82f6" />
            <circle cx={toX(snapshots[snapshots.length - 1].ts).toFixed(2)} cy={toYPending(snapshots[snapshots.length - 1].pendingCount).toFixed(2)} r="1.5" fill="#fb923c" />
          </>
        )}
        {hoverSnap && hoverX !== null && (
          <>
            <line x1={hoverX.toFixed(2)} y1={PAD} x2={hoverX.toFixed(2)} y2={H - PAD} stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="1.5,1.5" />
            <circle cx={hoverX.toFixed(2)} cy={toYConcurrent(hoverSnap.dynamicConcurrent).toFixed(2)} r="2" fill="#3b82f6" stroke="white" strokeWidth="0.8" />
            <circle cx={hoverX.toFixed(2)} cy={toYPending(hoverSnap.pendingCount).toFixed(2)} r="2" fill="#fb923c" stroke="white" strokeWidth="0.8" />
          </>
        )}
      </svg>
      {hoverSnap && (
        <div
          className={`absolute top-0 z-20 pointer-events-none bg-popover border border-border rounded-md  px-2.5 py-1.5 text-[11px] leading-relaxed whitespace-nowrap ${tooltipRight ? 'right-0' : 'left-0'}`}
          style={{ transform: 'translateY(-110%)' }}
        >
          <div className="font-medium text-foreground mb-0.5">
            {new Date(hoverSnap.ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="inline-block w-2 h-0.5 bg-blue-500 rounded" />
            <span>并发数</span>
            <span className="font-semibold text-foreground tabular-nums">{hoverSnap.dynamicConcurrent}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="inline-block w-2 h-0.5 bg-orange-400 rounded" />
            <span>待检测</span>
            <span className="font-semibold text-foreground tabular-nums">{hoverSnap.pendingCount}</span>
          </div>
          {hoverSnap.normalQueueLen > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="inline-block w-2 h-0.5 bg-slate-400 rounded" />
              <span>普通排队</span>
              <span className="font-semibold text-foreground tabular-nums">{hoverSnap.normalQueueLen}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 每日统计弹窗 ─────────────────────────────────────────────────────────────

/** 返回北京时间 YYYY-MM-DD 日期字符串 */
function getChinaDateStr(date?: Date): string {
  const d = date ?? new Date();
  return new Date(d.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function DailyStatsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [days, setDays] = useState(7);
  const statsQuery = trpc.scheduled.getDailyStats.useQuery({ days }, { enabled: open });
  const stats = statsQuery.data ?? [];
  // 手动检测汇总
  const totalManual = stats.reduce((s, d) => s + ((d as any).manualCount ?? 0), 0);
  // 定时检测域名汇总（checkedCount 已是每条域名算一次）
  const totalScheduled = stats.reduce((s, d) => s + d.checkedCount, 0);
  const todayStr = getChinaDateStr(); // 北京时间今天日期
  const filledStats = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const dateStr = getChinaDateStr(d);
    const found = stats.find(s => s.statDate === dateStr);
    return found ?? { statDate: dateStr, checkedCount: 0, runCount: 0, manualCount: 0 };
  });
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg flex flex-col max-h-[85vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <History className="w-4 h-4" />
            累计检测统计
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 min-h-0 flex-1 overflow-hidden">
          {/* 时间范围切换 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground">查看范围：</span>
            {[7, 30].map(d => (
              <button key={d} onClick={() => setDays(d)} className={`px-3 py-1 rounded text-xs font-medium transition-colors ${days === d ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                近 {d} 天
              </button>
            ))}
          </div>
          {/* 汇总数据卡片 */}
          <div className="grid grid-cols-2 gap-3 flex-shrink-0">
            <div className="border border-border rounded px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">手动检测次数</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{totalManual.toLocaleString()}</p>
            </div>
            <div className="border border-border rounded px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">定时检测域名次数</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{totalScheduled.toLocaleString()}</p>
            </div>
          </div>
          {/* 日期详细表格 */}
          {statsQuery.isLoading ? (
            <div className="flex items-center justify-center h-32 flex-shrink-0"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="border border-border rounded overflow-hidden flex flex-col min-h-0 flex-1">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted/80 border-b border-border">
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">日期</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-medium">手动检测</th>
                    <th className="text-right px-3 py-2 text-muted-foreground font-medium">定时检测</th>
                  </tr>
                </thead>
              </table>
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-xs">
                  <tbody>
                    {[...filledStats].reverse().map((s, idx) => {
                      const manual = (s as any).manualCount ?? 0;
                      const isToday = s.statDate === todayStr;
                      return (
                        <tr key={s.statDate} className={`border-b border-border/50 last:border-0 ${idx % 2 === 0 ? '' : 'bg-muted/20'} ${isToday ? 'bg-primary/5' : ''}`}>
                          <td className="px-3 py-2 font-mono text-foreground">
                            {s.statDate}
                            {isToday && <span className="ml-1.5 text-[10px] text-primary font-medium">今天</span>}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {manual > 0 ? <span className="font-medium text-foreground">{manual.toLocaleString()}</span> : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {s.checkedCount > 0 ? <span className="font-medium text-foreground">{s.checkedCount.toLocaleString()}</span> : <span className="text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── 健康度弹窗 ───────────────────────────────────────────────────────────────

interface HealthDialogProps {
  open: boolean;
  type: 'persistent' | 'permanent' | null;
  domains: FailureDomain[];
  onClose: () => void;
  onNavigate: (groupId: number, domainId: number) => void;
}

function HealthDialog({ open, type, domains, onClose, onNavigate }: HealthDialogProps) {
  const title = type === 'persistent' ? '持续失败域名' : '疑似永久失效域名';
  const icon = type === 'persistent'
    ? <XCircle className="w-4 h-4 text-orange-600" />
    : <AlertTriangle className="w-4 h-4 text-red-600" />;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {title}
            <span className="text-sm font-normal text-muted-foreground">共 {domains.length} 个域名</span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {domains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mb-3 text-emerald-400" />
              <p className="text-sm font-medium">暂无{title}</p>
            </div>
          ) : (
            domains.map(d => (
              <div
                key={d.id}
                className="flex items-center justify-between px-3 py-2.5 rounded border border-border hover:bg-muted/50 hover:border-primary/30 transition-all group cursor-pointer"
                onClick={() => { onNavigate(d.groupId, d.id); onClose(); }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${type === 'persistent' ? 'bg-orange-500' : 'bg-red-500'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-medium text-foreground truncate">{d.domain}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.groupName}
                      {type === 'persistent' && d.consecutiveErrors > 0 && (
                        <span className="ml-2 text-orange-600">连续失败 {d.consecutiveErrors} 次</span>
                      )}
                      {type === 'permanent' && d.totalFailureCycles > 0 && (
                        <span className="ml-2 text-red-600">累计失败周期 {d.totalFailureCycles} 次</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {d.lastCheckedAt && (
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      {new Date(d.lastCheckedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── 可排序卡片容器 ───────────────────────────────────────────────────────────

interface SortableCardProps {
  id: string;
  children: React.ReactNode;
}

function SortableCard({ id, children }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* 拖拽手柄 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded opacity-0 group-hover:opacity-40 hover:!opacity-80 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-opacity"
        title="拖动调整顺序"
      >
        <GripVertical className="w-4 h-3 rotate-90" />
      </div>
      {children}
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────

const DEFAULT_CARD_ORDER = ['status', 'concurrent', 'countdown', 'daily'];

export default function Scheduler() {
  const [, navigate] = useLocation();

  // 最快频率刷新（1s 轮询调度器状态）
  const statusQuery = trpc.scheduled.getSchedulerStatus.useQuery(undefined, {
    refetchInterval: 1000,
  });
  const failureStatsQuery = trpc.scheduled.getFailureStats.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const groupsQuery = trpc.scheduled.listGroups.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const nextRealCheckQuery = trpc.scheduled.getNextRealCheckTime.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const dailyStats7Query = trpc.scheduled.getDailyStats.useQuery({ days: 7 }, {
    refetchInterval: 60000,
  });
  const historyQuery = trpc.scheduled.getConcurrencyHistory.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const triggerMutation = trpc.scheduled.triggerNow.useMutation({
    onSuccess: () => {
      toast.success('检测任务已提交，正在后台执行');
      statusQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // 倒计时每秒刷新
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // 分组倒计时展开/折叠
  const [countdownExpanded, setCountdownExpanded] = useState(false);

  // 每日统计弹窗
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);

  // 健康度弹窗
  const [healthDialogType, setHealthDialogType] = useState<'persistent' | 'permanent' | null>(null);

  // 卡片排序（账号隔离持久化）
  const [cardOrder, setCardOrder] = useUserStorage<string[]>('scheduler-card-order', DEFAULT_CARD_ORDER);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCardOrder(prev => {
        const order = prev.length === DEFAULT_CARD_ORDER.length ? prev : DEFAULT_CARD_ORDER;
        const oldIdx = order.indexOf(String(active.id));
        const newIdx = order.indexOf(String(over.id));
        return arrayMove(order, oldIdx, newIdx);
      });
    }
  }, [setCardOrder]);

  const status = statusQuery.data as SchedulerStatusData | undefined;
  const failureStats = failureStatsQuery.data;

  // 近 7 天累计检测
  const total7Days = useMemo(() => {
    return (dailyStats7Query.data ?? []).reduce((sum, s) => sum + s.checkedCount, 0);
  }, [dailyStats7Query.data]);

  // 下次检测倒计时
  const nextRealCheckLabel = useMemo(() => {
    void tick;
    const nextAt = nextRealCheckQuery.data?.nextCheckAt;
    if (!nextAt) return '未知';
    const diffMs = new Date(nextAt).getTime() - Date.now();
    if (diffMs <= 0) return '即将执行';
    const diffMin = Math.floor(diffMs / 60000);
    const diffSec = Math.floor((diffMs % 60000) / 1000);
    if (diffMin >= 60) {
      const h = Math.floor(diffMin / 60);
      const m = diffMin % 60;
      return `${h}小时${m > 0 ? m + '分' : ''}后`;
    }
    if (diffMin > 0) return `${diffMin}分${diffSec}秒后`;
    return `${diffSec}秒后`;
  }, [tick, nextRealCheckQuery.data]);

  // 健康度弹窗中的域名列表
  const healthDomains: FailureDomain[] = useMemo(() => {
    if (!failureStats) return [];
    if (healthDialogType === 'persistent') return (failureStats.persistentDomains ?? []) as FailureDomain[];
    if (healthDialogType === 'permanent') return (failureStats.permanentDomains ?? []) as FailureDomain[];
    return [];
  }, [failureStats, healthDialogType]);

  // 点击健康度域名 → 跳转定时检测页并高亮
  const handleNavigateToDomain = useCallback((groupId: number, domainId: number) => {
    navigate(`/scheduled?highlightGroup=${groupId}&highlightDomain=${domainId}`);
  }, [navigate]);

  // 确保 cardOrder 包含所有卡片 ID（兼容新增卡片）
  const safeCardOrder = useMemo(() => {
    const order = cardOrder.length === DEFAULT_CARD_ORDER.length ? cardOrder : DEFAULT_CARD_ORDER;
    return DEFAULT_CARD_ORDER.every(id => order.includes(id)) ? order : DEFAULT_CARD_ORDER;
  }, [cardOrder]);

  // ─── 各功能卡片渲染 ─────────────────────────────────────────────────────────

  const renderCard = (id: string) => {
    switch (id) {
      // ── 状态总览卡片 ──
      case 'status':
        return (
          <SortableCard key="status" id="status">
            <div className="bg-card border border-border rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">调度器状态</span>
                  {status && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.isRunning ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full bg-current ${status.isRunning ? 'animate-pulse' : ''}`} />
                      {status.isRunning ? '检测中' : '空闲'}
                    </span>
                  )}
                </div>
              </div>
              {status ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {status.isRunning && status.currentTask && (
                      <div className="col-span-2 sm:col-span-4 px-2 py-1.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                        当前任务：{status.currentTask}
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground mb-0.5">下次检测</p>
                      <p className="font-semibold text-foreground tabular-nums">{nextRealCheckLabel}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">近 7 天检测</p>
                      <p className="font-semibold text-foreground tabular-nums">
                        {total7Days.toLocaleString()}
                        <button onClick={() => setStatsDialogOpen(true)} className="ml-1 text-primary hover:underline text-[10px] font-normal">查看</button>
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">今日检测</p>
                      <p className="font-semibold text-foreground tabular-nums">
                        {(dailyStats7Query.data?.find(s => s.statDate === getChinaDateStr())?.checkedCount ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-0.5">上次运行</p>
                      <p className="font-semibold text-foreground tabular-nums text-[11px]">
                        {status?.lastRunAt ? new Date(status.lastRunAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </p>
                    </div>
                  </div>
                  {/* 在线人员 */}
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center gap-2 text-xs">
                      <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">当前在线：</span>
                      {status.onlineUsers && status.onlineUsers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {status.onlineUsers.map(u => (
                            <span key={u.userId} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${u.isOwner ? 'bg-purple-100 text-purple-700' : u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                              {u.username}
                              <span className="opacity-60">{u.isOwner ? '站长' : u.role === 'admin' ? '管理员' : '成员'}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">无人在线</span>
                      )}
                    </div>
                  </div>
                  {/* 分组检测进度 */}
                  {status.groupProgress && status.groupProgress.length > 0 && (
                    <div className="pt-2 border-t border-border space-y-2">
                      {status.groupProgress.map(gp => {
                        const pct = gp.total > 0 ? Math.round((gp.completed / gp.total) * 100) : 0;
                        return (
                          <div key={gp.groupId}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground truncate max-w-48">{gp.groupName}</span>
                              <span className="text-foreground font-medium tabular-nums flex-shrink-0 ml-2">
                                {gp.completed}/{gp.total} · {pct}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 animate-pulse">
                  <div className="grid grid-cols-4 gap-3">
                    {[1,2,3,4].map(i => <div key={i}><div className="h-3 w-12 bg-muted rounded mb-1.5" /><div className="h-4 w-16 bg-muted rounded" /></div>)}
                  </div>
                </div>
              )}
            </div>
          </SortableCard>
        );

      // ── 并发状态 + 健康度合并卡片 ──
      case 'concurrent':
        return (
          <SortableCard key="concurrent" id="concurrent">
            <div className="bg-card border border-border rounded p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">并发状态 &amp; 健康度</span>
              </div>
              {status ? (
                <div className="space-y-3">
                  {/* 并发模式 */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">并发模式：</span>
                    {(() => {
                      const dc = status.dynamicConcurrent ?? status.maxConcurrent ?? 10;
                      if (dc >= 30) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />满载 {dc}/{status.maxConcurrent ?? 30}</span>;
                      if (dc >= 20) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />高负载 {dc}/{status.maxConcurrent ?? 30}</span>;
                      if (dc > 1) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />动态 {dc}/{status.maxConcurrent ?? 30}</span>;
                      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />空闲 {dc}/{status.maxConcurrent ?? 30}</span>;
                    })()}
                    {(status.pendingScheduledCount ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        待检测 {status.pendingScheduledCount}条
                      </span>
                    )}
                  </div>
                  {/* 正在检测 */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px]">
                    <span className="text-muted-foreground">正在检测：</span>
                    <span className="font-medium text-foreground">定时 <span className="tabular-nums">{status.schedulerActiveCount ?? status.activeCount ?? 0}</span></span>
                    {(status.normalActiveCount ?? 0) > 0 && <span className="font-medium text-foreground">普通 <span className="tabular-nums">{status.normalActiveCount}</span></span>}
                    <span className="text-muted-foreground">总计 <span className="font-medium text-foreground tabular-nums">{status.activeCount ?? 0}</span></span>
                    {(status.normalQueueLength ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        普通排队 {status.normalQueueLength}个
                      </span>
                    )}
                  </div>
                  {/* 健康度分割线 */}
                  <div className="border-t border-border pt-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">健康度概览</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        onClick={() => setHealthDialogType('persistent')}
                        disabled={(failureStats?.persistentFailCount ?? 0) === 0}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border font-medium transition-all ${(failureStats?.persistentFailCount ?? 0) > 0 ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 hover:border-orange-300 cursor-pointer' : 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default'}`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        持续失败：<span className="font-bold">{failureStats?.persistentFailCount ?? '—'}</span> 个域名
                        {(failureStats?.persistentFailCount ?? 0) > 0 && <Filter className="w-3 h-3 opacity-60" />}
                      </button>
                      <button
                        onClick={() => setHealthDialogType('permanent')}
                        disabled={(failureStats?.permanentFailCount ?? 0) === 0}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border font-medium transition-all ${(failureStats?.permanentFailCount ?? 0) > 0 ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400 cursor-pointer' : 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default'}`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        疑似永久失效：<span className="font-bold">{failureStats?.permanentFailCount ?? '—'}</span> 个域名
                        {(failureStats?.permanentFailCount ?? 0) > 0 && <Filter className="w-3 h-3 opacity-60" />}
                      </button>
                    </div>
                    {(failureStats?.persistentFailCount ?? 0) === 0 && (failureStats?.permanentFailCount ?? 0) === 0 && failureStats && (
                      <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        所有域名运行正常
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="animate-pulse space-y-2">
                  <div className="h-5 w-40 bg-muted rounded" />
                  <div className="h-4 w-56 bg-muted rounded" />
                  <div className="h-px bg-muted my-2" />
                  <div className="h-8 w-full bg-muted rounded" />
                </div>
              )}
            </div>
          </SortableCard>
        );

      // ── 分组倒计时卡片 ──
      case 'countdown':
        return (
          <SortableCard key="countdown" id="countdown">
            <div className="bg-card border border-border rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">分组下次检测倒计时</span>
                </div>
                <button
                  onClick={() => setCountdownExpanded(v => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  {countdownExpanded ? '收起' : '展开全部'}
                </button>
              </div>
              {groupsQuery.data ? (
                <div className="space-y-1.5">
                  {(() => {
                    const authorizedGroups = groupsQuery.data.filter(g => g.enabled && g.taskStatus === 'authorized');
                    // 排序：执行中(0) > 即将执行/已到时(1) > 剩余时间升序(2+)
                    const sortedAuthorizedGroups = [...authorizedGroups].sort((a, b) => {
                      void tick; // 依赖 tick 保证每秒重新排序
                      const aRunning = !!(status?.isRunning && status?.currentTask?.includes(a.name));
                      const bRunning = !!(status?.isRunning && status?.currentTask?.includes(b.name));
                      if (aRunning !== bRunning) return aRunning ? -1 : 1;
                      const { nextAt: aNext } = calcNextRun(a.lastScheduledAt, a.intervalMinutes);
                      const { nextAt: bNext } = calcNextRun(b.lastScheduledAt, b.intervalMinutes);
                      const aDiff = aNext ? aNext.getTime() - Date.now() : Infinity;
                      const bDiff = bNext ? bNext.getTime() - Date.now() : Infinity;
                      // 已到时（diff <= 0）视为即将执行，排在有倒计时的前面
                      return aDiff - bDiff;
                    });
                    const displayGroups = countdownExpanded ? sortedAuthorizedGroups : sortedAuthorizedGroups.slice(0, 5);
                    return displayGroups.map(g => {
                      const { label, nextAt } = calcNextRun(g.lastScheduledAt, g.intervalMinutes);
                      void tick;
                      const isRunning = status?.isRunning && status?.currentTask?.includes(g.name);
                      const isUrgent = nextAt && nextAt.getTime() - Date.now() < 5 * 60 * 1000;
                      const now = Date.now();
                      const windowStatus = (() => {
                        if (g.windowStartHour == null || g.windowEndHour == null) return null;
                        const d = new Date(now);
                        const cur = d.getHours() * 60 + d.getMinutes();
                        const start = g.windowStartHour * 60 + (g.windowStartMinute ?? 0);
                        const end = g.windowEndHour * 60 + (g.windowEndMinute ?? 0);
                        const inWindow = start <= end ? (cur >= start && cur < end) : (cur >= start || cur < end);
                        return inWindow ? 'in' : 'out';
                      })();
                      const startStr = g.windowStartHour != null ? `${String(g.windowStartHour).padStart(2,'0')}:${String(g.windowStartMinute ?? 0).padStart(2,'0')}` : '';
                      const endStr = g.windowEndHour != null ? `${String(g.windowEndHour).padStart(2,'0')}:${String(g.windowEndMinute ?? 0).padStart(2,'0')}` : '';
                      const windowLabel = startStr && endStr ? `${startStr}–${endStr}` : '';
                      return (
                        <div key={g.id} className="px-2 py-2 rounded bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs font-medium text-foreground truncate">{g.name}</span>
                              <span className="text-muted-foreground/60 text-[10px] flex-shrink-0">{g.domainCount}个域名</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs font-medium tabular-nums ${isRunning ? 'text-blue-600' : isUrgent ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                {isRunning ? '执行中' : label}
                              </span>
                              <button
                                type="button"
                                onClick={() => !isRunning && triggerMutation.mutate({ groupId: g.id })}
                                disabled={triggerMutation.isPending || isRunning}
                                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors disabled:opacity-50 ${isRunning ? 'bg-blue-100 text-blue-500 cursor-not-allowed' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                              >
                                {isRunning ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Play className="w-2.5 h-2.5" />}
                                {isRunning ? '执行中' : '触发'}
                              </button>
                            </div>
                          </div>
                          {windowStatus && (
                            <div className={`flex items-center gap-1 text-[10px] mt-0.5 ${windowStatus === 'in' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
                              {windowStatus === 'in' ? `窗口内 (${windowLabel})` : `窗口外，不执行检测 (${windowLabel})`}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                  {groupsQuery.data.filter(g => g.enabled && g.taskStatus === 'authorized').length === 0 && (
                    <p className="text-xs text-muted-foreground italic">暂无已授权并启用的分组</p>
                  )}
                  {!countdownExpanded && groupsQuery.data.filter(g => g.enabled && g.taskStatus === 'authorized').length > 5 && (
                    <button onClick={() => setCountdownExpanded(true)} className="text-xs text-primary hover:underline w-full text-center py-1">
                      展开全部 {groupsQuery.data.filter(g => g.enabled && g.taskStatus === 'authorized').length} 个分组
                    </button>
                  )}
                </div>
              ) : (
                <div className="animate-pulse space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-8 bg-muted rounded" />)}
                </div>
              )}
            </div>
          </SortableCard>
        );

      // ── 每日统计 / 折线图卡片 ──
      case 'daily':
        return (
          <SortableCard key="daily" id="daily">
            <div className="bg-card border border-border rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">近 1 小时并发趋势</span>
                </div>
                <button onClick={() => setStatsDialogOpen(true)} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <History className="w-3 h-3" />
                  历史统计
                </button>
              </div>
              {historyQuery.data && historyQuery.data.snapshots.length >= 2 ? (
                <>
                  <div className="flex items-center gap-3 text-[10px] mb-2">
                    <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-blue-500 rounded" /><span className="text-muted-foreground">并发数</span></span>
                    <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-orange-400 rounded" /><span className="text-muted-foreground">待检测</span></span>
                  </div>
                  <MiniLineChart snapshots={historyQuery.data.snapshots} />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>1小时前</span>
                    <span>30分前</span>
                    <span>现在</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <BarChart2 className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs">数据采集中，约 30 秒后显示图表</p>
                </div>
              )}
            </div>
          </SortableCard>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppNav activeTab={"scheduler" as 'generator' | 'checker' | 'scheduled' | 'scheduler' | 'admin'} />

      <main className="container py-6 max-w-3xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">调度器</h1>
            <p className="text-sm text-muted-foreground mt-0.5">实时监控检测调度状态，拖动卡片可调整显示顺序</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusQuery.isFetching ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
          </div>
        </div>

        {/* 可拖拽卡片列表 */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={safeCardOrder} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {safeCardOrder.map(id => renderCard(id))}
            </div>
          </SortableContext>
        </DndContext>
      </main>

      {/* 每日统计弹窗 */}
      <DailyStatsDialog open={statsDialogOpen} onClose={() => setStatsDialogOpen(false)} />

      {/* 健康度弹窗 */}
      <HealthDialog
        open={healthDialogType !== null}
        type={healthDialogType}
        domains={healthDomains}
        onClose={() => setHealthDialogType(null)}
        onNavigate={handleNavigateToDomain}
      />
    </div>
  );
}
