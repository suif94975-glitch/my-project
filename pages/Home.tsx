/**
 * 域名检测工具 - 主页面
 *
 * 核心设计：多域名并行检测 + 工具自由选择 + 后台自动运行
 * - 支持选择 1/2/3 个工具进行检测
 * - 添加域名后立即后台运行所有选中工具，无需点击
 * - 每个域名 × 每个工具 = 独立 Puppeteer 任务，后台自动运行
 * - 切换域名/工具时只切换结果视图可见性，后台检测持续运行
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  Globe, Plus, X, ExternalLink,
  RefreshCw, Activity, Zap, Check, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import AliyunResultView from '@/components/AliyunResultView';
import ItdogResultView from '@/components/ItdogResultView';
import { useCopyOnce } from '@/hooks/useCopyOnce';
import { useAppAuth } from '@/hooks/useAppAuth';
import { useUserStorage } from '@/hooks/useUserStorage';
import { useSseManager } from '@/hooks/useSseManager';
import { trpc } from '@/lib/trpc';
import AppNav from '@/components/AppNav';

// ─── 工具配置 ────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    id: 'aliyun' as const,
    name: '阿里云拨测',
    shortName: '阿里云',
    description: '全国 200+ 节点 HTTP 拨测，覆盖各运营商',
    externalUrl: (d: string) => `https://boce.aliyun.com/detect/http/${encodeURIComponent(d)}`,
    logo: '☁️',
    // 扁平设计颜色 token
    color: 'orange',
    accentText: 'text-orange-600',
    activeBorder: 'border-orange-400',
    activeBg: 'bg-orange-50',
    streamBg: 'bg-orange-50 border-orange-200',
    streamDot: 'bg-orange-500',
    streamText: 'text-orange-700',
    streamTime: 'text-orange-600',
    progressBg: 'bg-orange-200',
    progressFill: 'bg-orange-500',
    loadingBg: 'bg-orange-50 border-orange-200',
    loadingDot: 'bg-orange-500',
    iconBg: 'bg-orange-50 border-orange-200',
    expectedNodes: 200,
    estimateTime: (elapsed: number) =>
      elapsed < 60 ? `预计还需约 ${60 - elapsed} 秒`
      : elapsed < 120 ? `预计还需约 ${120 - elapsed} 秒`
      : '即将完成，请稍候...',
  },
  {
    id: 'itdog' as const,
    name: 'ITDOG 测速',
    shortName: 'ITDOG',
    description: '全国多节点 HTTP 速度测试',
    externalUrl: (d: string) => `https://www.itdog.cn/http/${encodeURIComponent(d)}`,
    logo: '🐕',
    color: 'blue',
    accentText: 'text-blue-600',
    activeBorder: 'border-blue-400',
    activeBg: 'bg-blue-50',
    streamBg: 'bg-blue-50 border-blue-200',
    streamDot: 'bg-blue-500',
    streamText: 'text-blue-700',
    streamTime: 'text-blue-600',
    progressBg: 'bg-blue-200',
    progressFill: 'bg-blue-500',
    loadingBg: 'bg-blue-50 border-blue-200',
    loadingDot: 'bg-blue-500',
    iconBg: 'bg-blue-50 border-blue-200',
    expectedNodes: 200,
    estimateTime: (elapsed: number) =>
      elapsed < 30 ? `预计还需约 ${30 - elapsed} 秒`
      : elapsed < 90 ? `预计还需约 ${90 - elapsed} 秒`
      : '即将完成，请稍候...',
  },
  {
    id: 'zhale' as const,
    name: '炸了么',
    shortName: '炸了么',
    description: '全国 80+ 节点 HTTP 连通性检测',
    externalUrl: (d: string) => `https://zhale.me/http/?host=${encodeURIComponent(d)}&type=https`,
    logo: '💥',
    color: 'red',
    accentText: 'text-red-600',
    activeBorder: 'border-red-400',
    activeBg: 'bg-red-50',
    streamBg: 'bg-red-50 border-red-200',
    streamDot: 'bg-red-500',
    streamText: 'text-red-700',
    streamTime: 'text-red-600',
    progressBg: 'bg-red-200',
    progressFill: 'bg-red-500',
    loadingBg: 'bg-red-50 border-red-200',
    loadingDot: 'bg-red-500',
    iconBg: 'bg-red-50 border-red-200',
    expectedNodes: 80,
    estimateTime: (elapsed: number) =>
      elapsed < 30 ? `预计还需约 ${30 - elapsed} 秒`
      : elapsed < 90 ? `预计还需约 ${90 - elapsed} 秒`
      : '即将完成，请稍候...',
  },
] as const;

type ToolId = typeof TOOLS[number]['id'];
type ToolConfig = typeof TOOLS[number];

// ─── 域名状态 ─────────────────────────────────────────────────────────────────

type DomainStatus = 'idle' | 'running' | 'done';
type DomainQuality = 'good' | 'normal' | 'poor' | 'bad' | 'unknown';

interface DomainEntry {
  domain: string;       // 纯域名（不含协议/端口），用于检测
  rawUrl: string;       // 完整URL（含协议+端口），用于复制
  status: Record<ToolId, DomainStatus>;
  launched: Record<ToolId, boolean>;
  launchedAt?: Record<ToolId, number>; // 开始检测的时间戳（ms），用于组件重建时保持计时连续
  aliyunQuality?: DomainQuality;
  itdogQuality?: DomainQuality;
  zhaleQuality?: DomainQuality;
  doneAt?: Record<ToolId, number>; // 检测完成时间戳（ms）
  itdogResult?: any;    // 完整 ITDOG 检测结果（用于页面恢复时直接展示，不重新检测）
  aliyunResult?: any;   // 完整阿里云检测结果（同上）
  zhaleResult?: any;    // 完整炸了么检测结果（同上）
}

function createEntry(domain: string, rawUrl?: string): DomainEntry {
  return {
    domain,
    rawUrl: rawUrl ?? `https://${domain}`,
    status: { aliyun: 'idle', itdog: 'idle', zhale: 'idle' },
    launched: { aliyun: false, itdog: false, zhale: false },
    aliyunQuality: undefined,
    itdogQuality: undefined,
    zhaleQuality: undefined,
    doneAt: undefined,
  };
}

// 10 分钟过期常量
const EXPIRY_MS = 10 * 60 * 1000;

/** 判断某域名某工具的检测结果是否已过期（超过10分钟） */
function isExpired(entry: DomainEntry, toolId: ToolId): boolean {
  const ts = entry.doneAt?.[toolId];
  if (!ts) return false;
  return Date.now() - ts > EXPIRY_MS;
}

/** 判断 rawUrl 是否含有端口（即经过端口生成工具处理过） */
function hasPort(entry: DomainEntry): boolean {
  try {
    const url = new URL(entry.rawUrl);
    return url.port !== '' && url.port !== '80' && url.port !== '443';
  } catch {
    return /:\d+/.test(entry.rawUrl);
  }
}

/** 判断域名是否可以复制 */
function canCopyDomain(entry: DomainEntry): boolean {
  if (!hasPort(entry)) return false;
  const quality = entry.itdogQuality ?? entry.aliyunQuality ?? entry.zhaleQuality;
  if (!quality || quality === 'poor' || quality === 'bad' || quality === 'unknown') return false;
  const itdogExpired = entry.launched.itdog && isExpired(entry, 'itdog');
  const aliyunExpired = entry.launched.aliyun && isExpired(entry, 'aliyun');
  const zhaleExpired = entry.launched.zhale && isExpired(entry, 'zhale');
  if (itdogExpired || aliyunExpired || zhaleExpired) return false;
  return true;
}

// 计算域名质量评级
function calcDomainQuality(data: any): DomainQuality {
  if (!data?.rows) return 'unknown';
  const rows = data.rows as any[];
  if (rows.length === 0) return 'unknown';
  const isItdog = rows.length > 0 && 'httpCode' in rows[0];
  let failedNodes: number;
  let successRows: any[];
  if (isItdog) {
    failedNodes = rows.filter((r: any) => r.httpCode === -1 || r.httpCode >= 400).length;
    successRows = rows.filter((r: any) => r.status === 'success' && r.totalTimeMs > 0);
  } else {
    failedNodes = rows.filter((r: any) => { const c = parseInt(r.status); return !isNaN(c) && c >= 400; }).length;
    successRows = rows.filter((r: any) => { const c = parseInt(r.status); return !isNaN(c) && c >= 200 && c < 400 && r.totalTimeMs > 0; });
  }
  const avgTimeMs = successRows.length > 0
    ? Math.round(successRows.reduce((s: number, r: any) => s + r.totalTimeMs, 0) / successRows.length)
    : 99999;
  if (failedNodes <= 4 && avgTimeMs < 3000) return 'good';
  if (failedNodes <= 6 && avgTimeMs < 6000) return 'normal';
  if (failedNodes <= 8 && avgTimeMs < 8000) return 'poor';
  return 'bad';
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

function cleanDomain(input: string): string {
  let d = input.trim();
  d = d.replace(/^https?:\/\//i, '');
  d = d.replace(/^www\./i, '');
  d = d.split('/')[0].split('?')[0].split('#')[0];
  d = d.replace(/:\d+$/, '');
  return d.toLowerCase().trim();
}

function buildRawUrl(input: string): string {
  const trimmed = input.trim();
  const protoMatch = trimmed.match(/^(https?:\/\/)/i);
  const proto = protoMatch ? protoMatch[1].toLowerCase() : 'https://';
  const withoutProto = trimmed.replace(/^https?:\/\//i, '');
  const hostPort = withoutProto.split('/')[0].split('?')[0].split('#')[0];
  return proto + hostPort;
}

function isValidDomain(domain: string): boolean {
  return /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(domain);
}

// ─── 通用检测结果展示组件 ─────────────────────────────────────────────────────
// 合并原来的 ItdogDataView、AliyunDataView、ZhaleDataView 三个几乎相同的组件

interface CheckerDataViewProps {
  tool: ToolConfig;
  checkTarget: string;
  sseState: {
    streamRows: any[];
    resultData: any | null;
    loading: boolean;
    error: string | null;
    elapsed: number;
    queueInfo: any | null;
    nodeProgress: any | null;
  } | null;
  onRetry?: () => void;
}

function CheckerDataView({ tool, checkTarget, sseState, onRetry }: CheckerDataViewProps) {
  if (!sseState) return null;

  const { streamRows, resultData, loading, error, elapsed, queueInfo, nodeProgress } = sseState;
  const isAliyun = tool.id === 'aliyun';

  // 构建 displayData：优先使用最终结果，其次使用流式数据
  const displayData = resultData || (streamRows.length > 0 ? {
    domain: checkTarget,
    checkedAt: Date.now(),
    rows: streamRows,
    regionStats: [],
    ipStats: [],
    summary: {
      total: streamRows.length,
      success: isAliyun
        ? streamRows.filter((r: any) => r.status === '200' || r.totalTimeMs > 0).length
        : streamRows.filter((r: any) => r.status === 'success').length,
      failed: isAliyun
        ? streamRows.filter((r: any) => r.totalTimeMs === 0).length
        : streamRows.filter((r: any) => r.httpCode === -1 || (r.httpCode >= 400 && r.httpCode !== 0)).length,
      avgTimeMs: streamRows.length > 0
        ? Math.round(streamRows.filter((r: any) => r.totalTimeMs > 0).reduce((s: number, r: any) => s + r.totalTimeMs, 0) / Math.max(1, streamRows.filter((r: any) => r.totalTimeMs > 0).length))
        : 0,
      minTimeMs: streamRows.filter((r: any) => r.totalTimeMs > 0).length > 0
        ? Math.min(...streamRows.filter((r: any) => r.totalTimeMs > 0).map((r: any) => r.totalTimeMs))
        : 0,
      maxTimeMs: streamRows.length > 0 ? Math.max(...streamRows.map((r: any) => r.totalTimeMs)) : 0,
      minNode: '',
      maxNode: '',
    },
  } : null);

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* 加载中（无流式数据时）*/}
      {loading && streamRows.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <div className="relative">
            <div className={`w-16 h-16 rounded border ${tool.iconBg} flex items-center justify-center`}>
              <span className="text-3xl">{tool.logo}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <Activity className="w-3 h-3 text-white animate-pulse" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground mb-1">
              {queueInfo && !queueInfo.isRunning
                ? `排队中（第 ${queueInfo.position} 位）`
                : `${tool.shortName} 检测中`}
            </p>
            <p className="text-xs text-muted-foreground mb-1">
              检测目标 <code className="font-mono bg-muted px-1 rounded">{checkTarget}</code>
            </p>
            {queueInfo && !queueInfo.isRunning ? (
              <div className="space-y-1">
                <p className="text-xs text-amber-600 font-medium">
                  排队第 {queueInfo.position} 位，当前并发 {queueInfo.activeCount}/{queueInfo.dynamicConcurrent ?? queueInfo.maxConcurrent}
                </p>
                {(queueInfo.normalQueueLength ?? queueInfo.waitingCount) > 0 && (
                  <p className="text-xs text-amber-500">
                    前面还有 {queueInfo.normalQueueLength ?? queueInfo.waitingCount} 个普通任务排队
                  </p>
                )}
                {queueInfo.estimatedWaitSec > 0 && (
                  <p className="text-xs text-muted-foreground">预计等待约 {queueInfo.estimatedWaitSec} 秒</p>
                )}
                <p className="text-xs text-muted-foreground">
                  提交时间：{new Date(queueInfo.submittedAt).toLocaleTimeString('zh-CN')}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {queueInfo?.startedAt
                  ? `开始时间：${new Date(queueInfo.startedAt).toLocaleTimeString('zh-CN')}`
                  : tool.estimateTime(elapsed)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded bg-muted/50 border border-border">
            <div className={`w-2 h-2 rounded-full ${tool.loadingDot} animate-pulse`} />
            <span className="text-xs text-muted-foreground font-mono">已等待 {elapsed} 秒</span>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <div className="w-12 h-12 rounded border border-red-200 bg-red-50 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={onRetry}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            重新检测
          </Button>
        </div>
      )}

      {/* 结果展示 */}
      {displayData && (
        <div className="flex-1 overflow-auto relative">
          {/* 流式加载进度条 */}
          {loading && !resultData && (
            <div className={`sticky top-0 z-10 ${tool.streamBg} border-b px-4 py-2`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${tool.streamDot} animate-pulse`} />
                <span className={`text-xs ${tool.streamText} font-medium`}>
                  实时接收中… 已获取{' '}
                  <span className="font-bold">{nodeProgress?.received ?? streamRows.length}</span>
                  {' '}/ 
                  <span>{nodeProgress?.expected ?? tool.expectedNodes}</span>
                  {' '}个节点
                  {nodeProgress && (
                    <span className="ml-1 opacity-70">({nodeProgress.percent}%)</span>
                  )}
                </span>
                <span className={`ml-auto text-xs ${tool.streamTime} font-mono`}>{elapsed}s</span>
              </div>
              {/* 进度条（阿里云无 nodeProgress，不显示进度条） */}
              {!isAliyun && (
                <div className={`w-full h-1 ${tool.progressBg} rounded-full overflow-hidden`}>
                  <div
                    className={`h-full ${tool.progressFill} rounded-full transition-all duration-300`}
                    style={{
                      width: `${nodeProgress?.percent ?? Math.min(99, Math.round(((nodeProgress?.received ?? streamRows.length) / tool.expectedNodes) * 100))}%`
                    }}
                  />
                </div>
              )}
            </div>
          )}
          {isAliyun ? (
            <AliyunResultView data={displayData} />
          ) : (
            <ItdogResultView data={displayData} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── 持久化 helpers ──────────────────────────────────────────────────────────

interface PersistedCheckerState {
  entries: DomainEntry[];
  activeDomain: string;
  activeTool: ToolId;
  selectedTools: ToolId[];
  resetKeys: Record<string, Record<ToolId, number>>;
  savedAt: number;
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────

interface HomeProps {
  initDomains?: string[];
}

export default function Home({ initDomains }: HomeProps) {
  const [, navigate] = useLocation();
  const { user } = useAppAuth();
  const { copyDomain, isCopied } = useCopyOnce();
  const logCheckMutation = trpc.appAuth.logCheck.useMutation();
  const [inputText, setInputText] = useState('');
  const [pasteDupInfo, setPasteDupInfo] = useState<{ count: number; domains: string[] } | null>(null);

  const [persistedState, setPersistedState] = useUserStorage<PersistedCheckerState | null>(
    'checker_state_v1',
    null
  );

  const [entries, setEntries] = useState<DomainEntry[]>(() => persistedState?.entries ?? []);
  const [activeDomain, setActiveDomain] = useState<string>(() => persistedState?.activeDomain ?? '');
  const [activeTool, setActiveTool] = useState<ToolId>(() => persistedState?.activeTool ?? 'itdog');
  const [showInput, setShowInput] = useState(true);

  const [selectedTools, setSelectedTools] = useState<Set<ToolId>>(() => {
    if (persistedState?.selectedTools && persistedState.selectedTools.length > 0) {
      return new Set<ToolId>(persistedState.selectedTools);
    }
    return new Set(['itdog'] as ToolId[]);
  });

  const [resetKeys, setResetKeys] = useState<Record<string, Record<ToolId, number>>>(
    () => persistedState?.resetKeys ?? {}
  );

  useEffect(() => {
    setPersistedState({
      entries,
      activeDomain,
      activeTool,
      selectedTools: Array.from(selectedTools),
      resetKeys,
      savedAt: Date.now(),
    });
  }, [entries, activeDomain, activeTool, selectedTools, resetKeys]);

  const { startConnection, closeConnection, getState, checkDone } = useSseManager();

  const { data: queueStats } = trpc.domain.queueStats.useQuery(undefined, {
    refetchInterval: 5000,
    staleTime: 4000,
  });

  const prevEntriesRef = useRef<DomainEntry[]>([]);
  useEffect(() => {
    const prev = prevEntriesRef.current;
    // 第一轮：检查是否有 status='running' 但 SSE 已完成的条目（状态未同步 bug 修复）
    const staleRunning: { domain: string; toolId: ToolId; resetKey: number }[] = [];
    for (const entry of entries) {
      for (const toolId of ['itdog', 'aliyun', 'zhale'] as ToolId[]) {
        if (entry.status[toolId] !== 'running') continue;
        const resetKey = resetKeys[entry.domain]?.[toolId] ?? 0;
        const sseState = getState(entry.domain, toolId, resetKey);
        const isDone = checkDone(entry.domain, toolId, resetKey);
        if (isDone && sseState?.resultData) {
          staleRunning.push({ domain: entry.domain, toolId, resetKey });
        }
      }
    }
    if (staleRunning.length > 0) {
      setEntries(prev => prev.map(e => {
        const fixes = staleRunning.filter(s => s.domain === e.domain);
        if (fixes.length === 0) return e;
        let updated = { ...e, status: { ...e.status } };
        for (const { toolId, resetKey } of fixes) {
          const sseState = getState(e.domain, toolId, resetKey);
          const isDone = checkDone(e.domain, toolId, resetKey);
          if (isDone && sseState?.resultData) {
            const quality = calcDomainQuality(sseState.resultData);
            updated = {
              ...updated,
              status: { ...updated.status, [toolId]: 'done' as DomainStatus },
              ...(toolId === 'itdog'
                ? { itdogQuality: quality, itdogResult: sseState.resultData }
                : toolId === 'zhale'
                ? { zhaleQuality: quality, zhaleResult: sseState.resultData }
                : { aliyunQuality: quality, aliyunResult: sseState.resultData }),
              doneAt: { ...(updated.doneAt ?? { aliyun: 0, itdog: 0, zhale: 0 }), [toolId]: Date.now() },
            };
          }
        }
        return updated;
      }));
      return;
    }
    // 第二轮：正常启动逻辑
    for (const entry of entries) {
      for (const toolId of ['itdog', 'aliyun', 'zhale'] as ToolId[]) {
        if (!entry.launched[toolId]) continue;
        const resetKey = resetKeys[entry.domain]?.[toolId] ?? 0;
        const checkTarget = entry.rawUrl || `https://${entry.domain}`;
        const priority = entries.indexOf(entry);
        const cachedResult = toolId === 'itdog' ? entry.itdogResult : toolId === 'zhale' ? entry.zhaleResult : entry.aliyunResult;
        if (cachedResult) continue;
        const existingState = getState(entry.domain, toolId as ToolId, resetKey);
        const startedAt = existingState ? existingState.startedAt : Date.now();
        startConnection(
          entry.domain, toolId, resetKey, checkTarget, priority, startedAt,
          (quality, result) => {
            setEntries(prev => prev.map(e => {
              if (e.domain !== entry.domain) return e;
              return {
                ...e,
                status: { ...e.status, [toolId]: 'done' },
                ...(toolId === 'itdog' ? { itdogQuality: quality, itdogResult: result } : toolId === 'zhale' ? { zhaleQuality: quality, zhaleResult: result } : { aliyunQuality: quality, aliyunResult: result }),
                doneAt: { ...(e.doneAt ?? { aliyun: 0, itdog: 0, zhale: 0 }), [toolId]: Date.now() },
              };
            }));
            logCheckMutation.mutate({ domain: entry.domain, tool: toolId });
          },
          (_domain, _toolId) => {
            setEntries(prev => prev.map(e => {
              if (e.domain !== entry.domain) return e;
              return { ...e, status: { ...e.status, [toolId]: 'error' } };
            }));
          },
        );
      }
    }
    prevEntriesRef.current = entries;
  }, [entries, resetKeys]);

  // 每分钟强制重渲染一次，以更新过期状态显示
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => forceUpdate(n => n + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  // 全局心跳（每 30 秒上报一次，维持在线状态）
  const heartbeatMutation = trpc.scheduled.heartbeat.useMutation();
  useEffect(() => {
    if (!user) return;
    heartbeatMutation.mutate();
    const timer = setInterval(() => { heartbeatMutation.mutate(); }, 30_000);
    return () => clearInterval(timer);
  }, [user?.id]);

  const currentTool = TOOLS.find(t => t.id === activeTool)!;
  const activeEntry = entries.find(e => e.domain === activeDomain);

  const toggleTool = (toolId: ToolId) => {
    setSelectedTools(prev => {
      const next = new Set(prev);
      if (next.has(toolId)) {
        if (next.size <= 1) { toast.warning('至少需要选择一个检测工具'); return prev; }
        next.delete(toolId);
        if (toolId === activeTool) {
          const remaining = TOOLS.filter(t => next.has(t.id));
          if (remaining.length > 0) setActiveTool(remaining[0].id);
        }
      } else {
        next.add(toolId);
      }
      return next;
    });
  };

  // 从 sessionStorage 读取端口生成页传来的域名（一次性）
  useEffect(() => {
    const raw = sessionStorage.getItem('checker_init_domains');
    if (!raw) return;
    sessionStorage.removeItem('checker_init_domains');
    try {
      const urls: string[] = JSON.parse(raw);
      if (!Array.isArray(urls) || urls.length === 0) return;
      const parsed: { domain: string; rawUrl: string }[] = [];
      for (const url of urls) {
        const domain = cleanDomain(url);
        if (domain && isValidDomain(domain) && !parsed.find(p => p.domain === domain)) {
          parsed.push({ domain, rawUrl: url });
        }
      }
      if (parsed.length === 0) return;
      const initTools = sessionStorage.getItem('checker_init_tools') as 'itdog' | 'aliyun' | 'both' | 'zhale' | null;
      sessionStorage.removeItem('checker_init_tools');
      const toolsToUse: ToolId[] = initTools === 'aliyun' ? ['aliyun']
        : initTools === 'both' ? ['itdog', 'aliyun']
        : initTools === 'zhale' ? ['zhale']
        : ['itdog'];
      setSelectedTools(new Set<ToolId>(toolsToUse));
      setActiveTool(toolsToUse[0]);
      const importNow = Date.now();
      setEntries(() => parsed.map(({ domain: d, rawUrl }) => {
        const entry = createEntry(d, rawUrl);
        toolsToUse.forEach(t => {
          entry.launched[t] = true;
          entry.status[t] = 'running';
          if (!entry.launchedAt) entry.launchedAt = { aliyun: 0, itdog: 0, zhale: 0 };
          entry.launchedAt[t] = importNow;
        });
        return entry;
      }));
      setResetKeys(() => {
        const next: Record<string, Record<ToolId, number>> = {};
        parsed.forEach(({ domain: d }) => { next[d] = { aliyun: 0, itdog: 0, zhale: 0 }; });
        return next;
      });
      setActiveDomain(parsed[0].domain);
      setShowInput(false);
      const toolLabel = toolsToUse.map(t => t === 'itdog' ? 'ITDOG' : t === 'zhale' ? '炸了么' : '阿里云').join(' + ');
      toast.success(`已导入 ${parsed.length} 条 URL，${toolLabel} 检测已开始`, { icon: '⚡' });
    } catch { /* ignore */ }
  }, []);

  const handleAddDomains = useCallback(() => {
    const lines = inputText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: { domain: string; rawUrl: string }[] = [];
    const invalid: string[] = [];
    for (const line of lines) {
      const cleaned = cleanDomain(line);
      if (!cleaned) continue;
      if (isValidDomain(cleaned)) {
        if (!parsed.find(p => p.domain === cleaned)) {
          parsed.push({ domain: cleaned, rawUrl: buildRawUrl(line) });
        }
      } else {
        invalid.push(line);
      }
    }
    if (invalid.length > 0) {
      toast.warning(`${invalid.length} 个域名格式无效，已跳过`, {
        description: invalid.slice(0, 3).join(', ') + (invalid.length > 3 ? '...' : ''),
      });
    }
    if (parsed.length === 0) { toast.error('请输入至少一个有效域名'); return; }
    const toolsToLaunch = TOOLS.filter(t => selectedTools.has(t.id));
    setEntries(prev => {
      const merged = [...prev];
      let added = 0;
      for (const { domain: d, rawUrl } of parsed) {
        if (!merged.find(e => e.domain === d)) {
          const entry = createEntry(d, rawUrl);
          const now = Date.now();
          toolsToLaunch.forEach(t => {
            entry.launched[t.id] = true;
            entry.status[t.id] = 'running';
            if (!entry.launchedAt) entry.launchedAt = { aliyun: 0, itdog: 0, zhale: 0 };
            entry.launchedAt[t.id] = now;
          });
          merged.push(entry);
          added++;
        }
      }
      if (added > 0) {
        const toolNames = toolsToLaunch.map(t => t.shortName).join('、');
        toast.success(`已添加 ${added} 个域名，后台自动开始检测`, {
          description: `使用工具：${toolNames}`,
          icon: '⚡',
        });
      }
      return merged;
    });
    setResetKeys(prev => {
      const next = { ...prev };
      for (const { domain: d } of parsed) {
        if (!next[d]) next[d] = { aliyun: 0, itdog: 0, zhale: 0 };
      }
      return next;
    });
    if (!selectedTools.has(activeTool)) {
      const firstSelected = TOOLS.find(t => selectedTools.has(t.id));
      if (firstSelected) setActiveTool(firstSelected.id);
    }
    if (!activeDomain && parsed.length > 0) setActiveDomain(parsed[0].domain);
    setInputText('');
    setShowInput(false);
  }, [inputText, activeDomain, selectedTools, activeTool]);

  const handleRemoveDomain = (domain: string) => {
    setEntries(prev => prev.filter(e => e.domain !== domain));
    if (activeDomain === domain) {
      const remaining = entries.filter(e => e.domain !== domain);
      setActiveDomain(remaining[0]?.domain || '');
    }
  };

  const handleReset = (domain: string, toolId: ToolId) => {
    setResetKeys(prev => ({
      ...prev,
      [domain]: {
        ...(prev[domain] || { aliyun: 0, itdog: 0, zhale: 0 }),
        [toolId]: ((prev[domain]?.[toolId] ?? 0) + 1),
      },
    }));
    const resetNow = Date.now();
    setEntries(prev => prev.map(e => {
      if (e.domain !== domain) return e;
      return {
        ...e,
        status: { ...e.status, [toolId]: 'running' },
        launched: { ...e.launched, [toolId]: true },
        launchedAt: { ...(e.launchedAt ?? { aliyun: 0, itdog: 0, zhale: 0 }), [toolId]: resetNow },
        ...(toolId === 'itdog' ? { itdogResult: undefined } : toolId === 'zhale' ? { zhaleResult: undefined } : { aliyunResult: undefined }),
      };
    }));
    toast.info(`正在重新检测 ${domain}（${TOOLS.find(t => t.id === toolId)?.shortName}）`);
  };

  const handleResetAll = (toolId: ToolId) => {
    setResetKeys(prev => {
      const next = { ...prev };
      for (const entry of entries) {
        next[entry.domain] = {
          ...(next[entry.domain] || { aliyun: 0, itdog: 0, zhale: 0 }),
          [toolId]: ((next[entry.domain]?.[toolId] ?? 0) + 1),
        };
      }
      return next;
    });
    const resetAllNow = Date.now();
    setEntries(prev => prev.map(e => ({
      ...e,
      status: { ...e.status, [toolId]: 'running' },
      launched: { ...e.launched, [toolId]: true },
      launchedAt: { ...(e.launchedAt ?? { aliyun: 0, itdog: 0, zhale: 0 }), [toolId]: resetAllNow },
      ...(toolId === 'itdog' ? { itdogResult: undefined } : toolId === 'zhale' ? { zhaleResult: undefined } : { aliyunResult: undefined }),
    })));
    toast.info(`已重新检测所有域名（${TOOLS.find(t => t.id === toolId)?.shortName}）`);
  };

  const isLaunched = activeEntry?.launched[activeTool] ?? false;
  const visibleTools = TOOLS.filter(t => selectedTools.has(t.id));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav
        activeTab="checker"
        rightExtra={
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {entries.length} 个域名
                {queueStats && (queueStats.activeCount > 0 || queueStats.waitingCount > 0) ? (
                  <>
                    {queueStats.activeCount > 0 && (
                      <span className="text-green-600 dark:text-green-400">
                        {' · '}{queueStats.activeCount}/{(queueStats as any).dynamicConcurrent ?? queueStats.maxConcurrent} 检测中
                      </span>
                    )}
                    {(queueStats as any).normalQueueLength > 0 && (
                      <span className="text-orange-600 dark:text-orange-400">
                        {' · '}普通排队 {(queueStats as any).normalQueueLength}
                      </span>
                    )}
                    {queueStats.waitingCount > 0 && !((queueStats as any).normalQueueLength) && (
                      <span className="text-amber-600 dark:text-amber-400"> · {queueStats.waitingCount} 队列中</span>
                    )}
                  </>
                ) : entries.some(e => TOOLS.some(t => selectedTools.has(t.id) && e.status[t.id] === 'running')) ? (
                  <span className="text-green-600 dark:text-green-400"> · 检测中</span>
                ) : null}
              </span>
            )}
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 font-medium"
              onClick={() => setShowInput(v => !v)}
              title={showInput && entries.length > 0 ? "收起输入框" : "展开输入框，添加新域名"}>
              <Plus className="w-3.5 h-3.5" />
              {showInput && entries.length > 0 ? '收起' : '添加域名'}
            </Button>
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
        {/* ── 左侧边栏 ── */}
        <aside className="w-72 border-r border-border bg-card flex flex-col flex-shrink-0 overflow-hidden">
          {/* 输入面板 */}
          {(showInput || entries.length === 0) && (
            <div className="p-3 border-b border-border bg-muted/20 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-foreground">输入域名</p>
                <span className="text-[10px] text-muted-foreground">每行一个</span>
              </div>
              <Textarea
                placeholder={"example.com\nwww.site.net:8443\napi.domain.io:443"}
                value={inputText}
                onChange={e => {
                  const val = e.target.value;
                  const filtered = val.split('').filter(ch => {
                    if (ch === '\n') return true;
                    return /[a-zA-Z0-9:/.\.\-_~?#\[\]@!$&'()*+,;=%]/.test(ch);
                  }).join('');
                  setInputText(filtered !== val ? filtered : val);
                }}
                onPaste={e => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData('text');
                  const urlRegex = /https?:\/\/[^\s\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+/g;
                  const extracted = pasted.match(urlRegex);
                  if (extracted && extracted.length > 0) {
                    const cleaned = extracted.map(u => u.replace(/[\uff0c\u3002\uff01\uff1f\u3010\u3011\u300a\u300b\u300c\u300d\uff08\uff09]+$/, '').trim());
                    const existing = inputText.split('\n').map(l => l.trim()).filter(Boolean);
                    const existingSet = new Set(existing);
                    const dupDomains = cleaned.filter(u => existingSet.has(u));
                    const newDomains = cleaned.filter(u => !existingSet.has(u));
                    setInputText([...existing, ...newDomains].join('\n'));
                    setPasteDupInfo(dupDomains.length > 0 ? { count: dupDomains.length, domains: dupDomains } : null);
                  } else {
                    const lines = pasted.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
                    const validLines = lines.filter(l =>
                      /^[a-zA-Z0-9][a-zA-Z0-9:/.\.\-_~?#\[\]@!$&'()*+,;=%]*$/.test(l)
                    );
                    if (validLines.length > 0) {
                      const existing = inputText.split('\n').map(l => l.trim()).filter(Boolean);
                      const existingSet = new Set(existing);
                      const dupDomains = validLines.filter(u => existingSet.has(u));
                      const newDomains = validLines.filter(u => !existingSet.has(u));
                      setInputText([...existing, ...newDomains].join('\n'));
                      setPasteDupInfo(dupDomains.length > 0 ? { count: dupDomains.length, domains: dupDomains } : null);
                    }
                  }
                }}
                className="text-xs font-mono resize-y min-h-[96px] h-32 mb-1.5 bg-background overflow-x-auto"
                style={{ whiteSpace: 'pre', wordBreak: 'keep-all', overflowWrap: 'normal' }}
                onKeyDown={e => {
                  if (e.key === ' ') e.preventDefault();
                  if (e.key === 'Enter' && e.ctrlKey) handleAddDomains();
                }}
                onCompositionEnd={e => {
                  const ta = e.target as HTMLTextAreaElement;
                  const cleaned = ta.value.split('').filter(ch => {
                    if (ch === '\n') return true;
                    return /[a-zA-Z0-9:/.\.\-_~?#\[\]@!$&'()*+,;=%]/.test(ch);
                  }).join('');
                  if (cleaned !== ta.value) setInputText(cleaned);
                }}
              />
              {pasteDupInfo && pasteDupInfo.count > 0 && (
                <div className="mb-1 px-2 py-1.5 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-700">
                  <p className="font-medium">已过滤 {pasteDupInfo.count} 条重复域名：</p>
                  <ul className="font-mono mt-0.5 space-y-0.5">
                    {pasteDupInfo.domains.slice(0, 3).map((d, i) => (
                      <li key={i} className="truncate">· {d}</li>
                    ))}
                    {pasteDupInfo.domains.length > 3 && (
                      <li className="text-amber-500">…还有 {pasteDupInfo.domains.length - 3} 条</li>
                    )}
                  </ul>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
                <span className="text-amber-500">⧃↵</span> 快捷键提交 · 支持带端口 URL
              </p>

              {/* 工具选择 */}
              <div className="mb-2">
                <div className="flex items-center gap-1 mb-1.5">
                  <span className="text-[10px] text-muted-foreground font-semibold">检测工具</span>
                  <span className="text-[10px] text-muted-foreground/60">（可多选）</span>
                </div>
                <div className="flex flex-col gap-1">
                  {TOOLS.map(tool => {
                    const isSelected = selectedTools.has(tool.id);
                    return (
                      <button
                        key={tool.id}
                        onClick={() => toggleTool(tool.id)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors border ${
                          isSelected
                            ? `${tool.activeBg} ${tool.accentText} border-current/30`
                            : 'border-border bg-background text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 border ${
                          isSelected ? `${tool.streamDot} border-transparent` : 'border-muted-foreground/40'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="text-sm leading-none">{tool.logo}</span>
                        <span className="font-medium">{tool.shortName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button size="sm" className="w-full h-8 text-xs gap-1" onClick={handleAddDomains} disabled={!inputText.trim()}>
                <Zap className="w-3.5 h-3.5" />添加并后台检测
              </Button>
            </div>
          )}

          {/* 域名列表 */}
          <div className="flex-1 overflow-y-auto">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                <Globe className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground leading-relaxed">在上方输入域名<br />自动后台开始检测</p>
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                <p className="text-xs text-muted-foreground px-2 py-1.5 font-medium">
                  域名列表（{entries.length}）
                </p>
                {entries.map((entry) => {
                  const isActive = activeDomain === entry.domain;
                  const anyRunning = TOOLS.some(t => selectedTools.has(t.id) && entry.status[t.id] === 'running');
                  const anyLaunched = TOOLS.some(t => entry.launched[t.id]);
                  const latestDoneAt = (() => {
                    const times = TOOLS
                      .filter(t => selectedTools.has(t.id) && entry.doneAt?.[t.id])
                      .map(t => entry.doneAt![t.id]);
                    return times.length > 0 ? Math.max(...times) : null;
                  })();
                  const minutesAgo = latestDoneAt ? Math.floor((Date.now() - latestDoneAt) / 60_000) : null;

                  // 质量标签配置
                  const getQualityConfig = (q: DomainQuality | undefined, toolLabel: string) => {
                    if (!q) return null;
                    return q === 'good'
                      ? { label: `${toolLabel}优秀`, dot: 'bg-emerald-500', text: isActive ? 'text-emerald-200' : 'text-emerald-600' }
                      : q === 'normal'
                      ? { label: `${toolLabel}普通`, dot: 'bg-amber-400', text: isActive ? 'text-amber-200' : 'text-amber-600' }
                      : q === 'poor'
                      ? { label: `${toolLabel}差`, dot: 'bg-orange-500', text: isActive ? 'text-orange-200' : 'text-orange-600' }
                      : { label: `${toolLabel}极差`, dot: 'bg-red-500', text: isActive ? 'text-red-200' : 'text-red-500' };
                  };
                  const aliyunQualityConfig = selectedTools.has('aliyun') ? getQualityConfig(entry.aliyunQuality, '阿里云') : null;
                  const itdogQualityConfig = selectedTools.has('itdog') ? getQualityConfig(entry.itdogQuality, 'ITDOG') : null;
                  const zhaleQualityConfig = selectedTools.has('zhale') ? getQualityConfig(entry.zhaleQuality, '炸了么') : null;
                  const qualityConfig = aliyunQualityConfig || itdogQualityConfig || zhaleQualityConfig;

                  const itdogExpiredNow = entry.launched.itdog && isExpired(entry, 'itdog');
                  const aliyunExpiredNow = entry.launched.aliyun && isExpired(entry, 'aliyun');
                  const zhaleExpiredNow = entry.launched.zhale && isExpired(entry, 'zhale');
                  const anyExpired = itdogExpiredNow || aliyunExpiredNow || zhaleExpiredNow;
                  const copyAllowed = canCopyDomain(entry);
                  const entryHasPort = hasPort(entry);

                  return (
                    <div
                      key={entry.domain}
                      className={`group flex flex-col px-2 py-2 rounded cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : !entryHasPort
                          ? 'bg-red-50 border border-red-200 hover:bg-red-100 text-red-800'
                          : 'hover:bg-muted text-foreground'
                      }`}
                      onClick={() => setActiveDomain(entry.domain)}
                    >
                      <div className="flex items-center gap-1.5">
                        <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${isActive ? 'rotate-90' : 'opacity-40'}`} />
                        <span className="text-xs font-mono truncate flex-1">{entry.domain}</span>
                        {/* 一键复制按钮 */}
                        <button
                          disabled={!copyAllowed}
                          className={`allow-copy opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 rounded p-0.5 ${
                            !entryHasPort
                              ? 'text-red-400 cursor-not-allowed'
                              : !copyAllowed
                              ? 'text-muted-foreground/30 cursor-not-allowed'
                              : isActive
                                ? 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/20'
                                : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                          }`}
                          onClick={e => {
                            e.stopPropagation();
                            if (!entryHasPort) {
                              toast.warning('该域名未经端口生成工具处理，不可复制', {
                                description: '请先在"端口生成"页面为域名分配端口',
                              });
                              return;
                            }
                            if (!copyAllowed) {
                              if (anyExpired) {
                                toast.warning('检测结果已过期（超过10分钟），请重新检测后再复制');
                              } else {
                                toast.warning('仅质量为"普通"或"优秀"的域名可以复制', {
                                  description: '当前域名质量不达标，请更换域名',
                                });
                              }
                              return;
                            }
                            copyDomain(entry.domain, entry.rawUrl);
                          }}
                          title={
                            !entryHasPort ? '未变更端口，不可复制'
                            : copyAllowed ? '复制域名'
                            : anyExpired ? '检测已过期，需重新检测'
                            : '质量不足，不可复制'
                          }
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          className={`opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 rounded p-0.5 ${
                            isActive
                              ? 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/20'
                              : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                          }`}
                          onClick={e => { e.stopPropagation(); handleRemoveDomain(entry.domain); }}
                          title="删除"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {/* 质量评级标签 */}
                      {(aliyunQualityConfig || itdogQualityConfig || zhaleQualityConfig) && (
                        <div className="flex items-center gap-1.5 pl-4 mt-0.5 flex-wrap">
                          {[
                            { cfg: aliyunQualityConfig, expired: aliyunExpiredNow, label: '阿里云' },
                            { cfg: itdogQualityConfig, expired: itdogExpiredNow, label: 'ITDOG' },
                            { cfg: zhaleQualityConfig, expired: zhaleExpiredNow, label: '炸了么' },
                          ].map(({ cfg, expired, label }) => cfg && (
                            <span key={label} className="flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${expired ? 'bg-gray-400' : cfg.dot}`} />
                              <span className={`text-[10px] font-medium ${expired ? (isActive ? 'text-primary-foreground/40' : 'text-muted-foreground/60') : cfg.text}`}>
                                {expired ? `${label}已过期` : cfg.label}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                      {/* 状态指示 */}
                      <div className="flex items-center gap-2 pl-4 mt-0.5">
                        {anyRunning && (
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isActive ? 'text-primary-foreground/80' : 'text-emerald-600'}`}>
                            <Activity className="w-2.5 h-2.5 animate-pulse" />
                            检测中
                          </span>
                        )}
                        {!anyRunning && anyExpired && (
                          <span className={`text-[10px] font-medium ${isActive ? 'text-primary-foreground/60' : 'text-amber-600'}`}>
                            已过期
                          </span>
                        )}
                        {!anyRunning && anyLaunched && !qualityConfig && !anyExpired && (
                          <span className={`text-[10px] ${isActive ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            已完成
                          </span>
                        )}
                        {!anyRunning && latestDoneAt && (
                          <span
                            className={`text-[10px] ${isActive ? 'text-primary-foreground/50' : 'text-muted-foreground/70'}`}
                            title={`上次检测：${new Date(latestDoneAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`}
                          >
                            {minutesAgo === 0 ? '刚刚' : minutesAgo === 1 ? '1分钟前' : `${minutesAgo}分钟前`}
                          </span>
                        )}
                        {/* 工具状态点 */}
                        <div className="flex items-center gap-1 ml-auto">
                          {TOOLS.filter(t => selectedTools.has(t.id)).map(t => {
                            const s = entry.status[t.id];
                            const launched = entry.launched[t.id];
                            return (
                              <span
                                key={t.id}
                                title={`${t.shortName}: ${s === 'running' ? '检测中' : launched ? '已完成' : '未开始'}`}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  s === 'running' ? 'bg-emerald-400 animate-pulse' :
                                  launched ? (isActive ? 'bg-primary-foreground/60' : 'bg-slate-400') :
                                  (isActive ? 'bg-primary-foreground/30' : 'bg-slate-200')
                                }`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* ── 主内容区 ── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 工具 Tab 栏 */}
          <div className="border-b border-border bg-card flex-shrink-0">
            <div className="px-4 flex items-center gap-0.5 h-11">
              {visibleTools.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    activeTool === tool.id
                      ? `${tool.activeBg} ${tool.accentText} border border-current/20`
                      : 'border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <span className="text-sm">{tool.logo}</span>
                  <span>{tool.shortName}</span>
                  {/* 检测中数量徽章 */}
                  {(() => {
                    const cnt = entries.filter(e => e.status[tool.id] === 'running').length;
                    return cnt > 0 ? (
                      <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                        {cnt}
                      </span>
                    ) : null;
                  })()}
                </button>
              ))}
              <div className="flex-1" />
              {/* 操作按钮 */}
              {activeDomain && (
                <div className="flex items-center gap-1">
                  {isLaunched && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground"
                      onClick={() => handleReset(activeDomain, activeTool)}
                      title="重新检测当前域名">
                      <RefreshCw className="w-3.5 h-3.5" />
                      重检
                    </Button>
                  )}
                  {entries.length > 1 && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground"
                      onClick={() => handleResetAll(activeTool)}
                      title="重新检测所有域名">
                      <RefreshCw className="w-3.5 h-3.5" />
                      全部重检
                    </Button>
                  )}
                  <a href={currentTool.externalUrl(activeDomain)} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-muted transition-colors text-muted-foreground" title="在新标签页打开原始工具">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* 当前域名信息栏 */}
            {activeDomain && (() => {
              const activeQuality = activeTool === 'itdog' ? activeEntry?.itdogQuality
                : activeTool === 'zhale' ? activeEntry?.zhaleQuality
                : activeEntry?.aliyunQuality;
              const qualityMap: Record<string, { label: string; cls: string }> = {
                good: { label: '优秀', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
                normal: { label: '普通', cls: 'text-amber-600 bg-amber-50 border-amber-200' },
                poor: { label: '差', cls: 'text-orange-600 bg-orange-50 border-orange-200' },
                bad: { label: '极差', cls: 'text-red-600 bg-red-50 border-red-200' },
              };
              const qInfo = activeQuality ? qualityMap[activeQuality] : null;
              return (
                <div className="px-4 py-1.5 flex items-center gap-3 bg-muted/20 border-t border-border/50">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground flex-shrink-0">目标：</span>
                    <code className="text-xs font-mono font-semibold text-foreground bg-background border border-border rounded px-2 py-0.5 truncate max-w-[240px]">
                      {activeDomain}
                    </code>
                    {activeEntry?.status[activeTool] === 'running' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium flex-shrink-0 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                        <Activity className="w-2.5 h-2.5 animate-pulse" />
                        检测中
                      </span>
                    ) : qInfo ? (
                      <span className={`inline-flex items-center text-[10px] font-semibold flex-shrink-0 border rounded px-1.5 py-0.5 ${qInfo.cls}`}>
                        {qInfo.label}
                      </span>
                    ) : null}
                  </div>
                  {activeEntry?.status[activeTool] !== 'running' && (
                    <span className="text-[10px] text-muted-foreground hidden md:inline flex-shrink-0">
                      已自动触发检测
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* 结果展示区域 */}
          <div className="flex-1 overflow-hidden relative">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-5 p-8">
                <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                  <Globe className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <div className="text-center max-w-sm space-y-2">
                  <p className="text-base font-semibold text-foreground">开始域名检测</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    在左侧输入域名，系统将自动后台运行检测，支持多域名并行，无需等待。
                  </p>
                  <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>多节点并发</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>实时结果</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block"></span>质量评级</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full relative">
                {entries.map(entry =>
                  TOOLS.filter(t => selectedTools.has(t.id)).map(tool => {
                    const isVisible = entry.domain === activeDomain && tool.id === activeTool;
                    const launched = entry.launched[tool.id];
                    const resetKey = resetKeys[entry.domain]?.[tool.id] ?? 0;

                    if (!launched) {
                      if (isVisible) {
                        return (
                          <div
                            key={`${entry.domain}-${tool.id}-unlaunched`}
                            className="w-full h-full absolute inset-0 flex flex-col items-center justify-center gap-4 p-8"
                          >
                            <div className="w-14 h-14 rounded bg-muted flex items-center justify-center">
                              <Activity className="w-7 h-7 text-muted-foreground/40" />
                            </div>
                            <div className="text-center space-y-1.5">
                              <p className="text-sm font-semibold text-foreground">{tool.shortName} 尚未检测</p>
                              <p className="text-xs text-muted-foreground">该域名未使用 {tool.shortName} 工具检测，点击下方立即检测</p>
                            </div>
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => handleReset(entry.domain, tool.id)}>
                              <RefreshCw className="w-3.5 h-3.5" />
                              立即检测
                            </Button>
                          </div>
                        );
                      }
                      return null;
                    }

                    // 获取缓存结果或 SSE 实时状态
                    const cachedResult = tool.id === 'itdog' ? entry.itdogResult
                      : tool.id === 'zhale' ? entry.zhaleResult
                      : entry.aliyunResult;
                    const checkTarget = entry.rawUrl || `https://${entry.domain}`;
                    const sseState = cachedResult
                      ? { streamRows: [], resultData: cachedResult, loading: false, error: null, elapsed: 0, queueInfo: null, nodeProgress: null }
                      : getState(entry.domain, tool.id, resetKey);

                    return (
                      <div
                        key={`${entry.domain}-${tool.id}-${resetKey}`}
                        className="w-full h-full absolute inset-0"
                        style={{ display: isVisible ? 'flex' : 'none', flexDirection: 'column' }}
                      >
                        <CheckerDataView
                          tool={tool}
                          checkTarget={checkTarget}
                          sseState={sseState}
                          onRetry={() => handleReset(entry.domain, tool.id)}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
