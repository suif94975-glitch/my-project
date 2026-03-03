/**
 * SEO 在用域名导航页
 * 功能：
 * - 按站点（A1-A9）+ 分类（WEB/H5/全站/体育等）分组展示当前在用 SEO 域名
 * - 支持单域名上传（每个分类独立输入框，通过端口自动识别 CDN 类型）
 * - 支持触发检测（调用后端检测引擎）
 * - 显示检测状态（颜色标记）
 * - 支持单条删除和一键清空分类
 * - 每条域名旁显示检测工具标签，支持点击切换
 * - 新增「已检测待使用」Tab：展示预热完成的候选域名
 */
import { useState, useMemo } from 'react';
import {
  Globe, Upload, RefreshCw,
  ExternalLink, Copy, ChevronDown, ChevronUp, Zap, Trash2, X, Clock, CheckCircle2, Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import AppNav from '@/components/AppNav';
import { trpc } from '@/lib/trpc';
import SeoImportDialog from '@/components/SeoImportDialog';
import {
  SITE_TYPES, CATEGORY_LABELS,
  type DomainCategory, type SiteType,
} from '@/lib/domainConstants';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── 常量 ──────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  ok:      { label: '正常',   color: 'bg-green-100 text-green-700 border-green-200',  dot: 'bg-green-500' },
  warn:    { label: '警告',   color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  poor:    { label: '质量差', color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  error:   { label: '异常',   color: 'bg-red-100 text-red-700 border-red-200',        dot: 'bg-red-500' },
  pending: { label: '待检测', color: 'bg-gray-100 text-gray-500 border-gray-200',     dot: 'bg-gray-400' },
} as const;

type CheckTool = 'itdog' | 'aliyun' | 'zhale';

const CHECK_TOOL_CONFIG: Record<CheckTool, { label: string; color: string }> = {
  itdog:  { label: 'ITDOG',  color: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' },
  aliyun: { label: '阿里云', color: 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100' },
  zhale:  { label: '炸了么', color: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100' },
};

// ─── 子组件 ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  const cfg = STATUS_CONFIG[(status ?? 'pending') as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function CheckToolBadge({ id, checkTool, onSwitch, isSwitching }: {
  id: number;
  checkTool: CheckTool | null;
  onSwitch: (id: number, tool: CheckTool) => void;
  isSwitching: boolean;
}) {
  const tool = (checkTool ?? 'itdog') as CheckTool;
  const cfg = CHECK_TOOL_CONFIG[tool];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={isSwitching}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border transition-colors cursor-pointer disabled:opacity-50 ${cfg.color}`}
          title="点击切换检测工具"
        >
          {isSwitching ? (
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
          ) : null}
          {cfg.label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-28">
        {(Object.entries(CHECK_TOOL_CONFIG) as [CheckTool, typeof CHECK_TOOL_CONFIG[CheckTool]][]).map(([key, c]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => onSwitch(id, key)}
            className={`text-xs cursor-pointer ${key === tool ? 'font-medium' : ''}`}
          >
            {c.label}
            {key === tool && <span className="ml-auto text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DomainRow({ id, domain, status, summary, checkTool, onCopy, onDelete, onSwitchTool, isDeleting, isSwitchingTool }: {
  id: number;
  domain: string;
  status: string | null;
  summary: string | null;
  checkTool: CheckTool | null;
  onCopy: (d: string) => void;
  onDelete: (id: number, domain: string) => void;
  onSwitchTool: (id: number, tool: CheckTool) => void;
  isDeleting: boolean;
  isSwitchingTool: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-muted/40 group">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <StatusBadge status={status} />
        <span className="font-mono text-sm text-foreground truncate" title={domain}>{domain}</span>
        {summary && (
          <span className="text-xs text-muted-foreground hidden lg:inline truncate max-w-36" title={summary}>
            {summary}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* 检测工具标签（始终显示） */}
        <CheckToolBadge
          id={id}
          checkTool={checkTool}
          onSwitch={onSwitchTool}
          isSwitching={isSwitchingTool}
        />
        {/* hover 显示的操作按钮 */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onCopy(domain)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="复制域名"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <a
            href={domain.startsWith('http') ? domain : `https://${domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="在新标签页打开"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => onDelete(id, domain)}
            disabled={isDeleting}
            className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40"
            title="删除域名"
          >
            {isDeleting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <X className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategorySection({ category, domains, onCopy, onDelete, onClearCategory, onSwitchTool, deletingIds, switchingToolIds }: {
  category: DomainCategory;
  domains: Array<{ id: number; domain: string; lastStatus: string | null; lastSummary: string | null; checkTool: CheckTool | null }>;
  onCopy: (d: string) => void;
  onDelete: (id: number, domain: string) => void;
  onClearCategory: (category: DomainCategory, label: string) => void;
  onSwitchTool: (id: number, tool: CheckTool) => void;
  deletingIds: Set<number>;
  switchingToolIds: Set<number>;
}) {
  const label = CATEGORY_LABELS[category] ?? category;
  const badCount = domains.filter(d => d.lastStatus === 'poor' || d.lastStatus === 'error').length;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">{domains.length} 个</span>
          {badCount > 0 && (
            <span className="text-xs text-red-600 font-medium">{badCount} 个质量差</span>
          )}
        </div>
        {domains.length > 0 && (
          <button
            onClick={() => onClearCategory(category, label)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
            title={`清空 ${label} 分类所有域名`}
          >
            <Trash2 className="w-3 h-3" />
            清空
          </button>
        )}
      </div>
      <div className="divide-y divide-border/50">
        {domains.length === 0 ? (
          <div className="py-3 px-3 text-sm text-muted-foreground text-center">暂无域名</div>
        ) : (
          domains.map(d => (
            <DomainRow
              key={d.id}
              id={d.id}
              domain={d.domain}
              status={d.lastStatus}
              summary={d.lastSummary}
              checkTool={d.checkTool}
              onCopy={onCopy}
              onDelete={onDelete}
              onSwitchTool={onSwitchTool}
              isDeleting={deletingIds.has(d.id)}
              isSwitchingTool={switchingToolIds.has(d.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SiteCard({
  siteType,
  categories,
  onCopy,
  onTriggerCheck,
  onUpload,
  isChecking,
  onDelete,
  onClearCategory,
  onSwitchTool,
  deletingIds,
  switchingToolIds,
}: {
  siteType: string;
  categories: Record<string, Array<{ id: number; domain: string; lastStatus: string | null; lastSummary: string | null; checkTool: CheckTool | null }>>;
  onCopy: (d: string) => void;
  onTriggerCheck: (siteType: string) => void;
  onUpload: (siteType: SiteType) => void;
  isChecking: boolean;
  onDelete: (id: number, domain: string) => void;
  onClearCategory: (siteType: string, category: DomainCategory, label: string) => void;
  onSwitchTool: (id: number, tool: CheckTool) => void;
  deletingIds: Set<number>;
  switchingToolIds: Set<number>;
}) {
  const [expanded, setExpanded] = useState(true);
  const allDomains = Object.values(categories).flat();
  const badCount = allDomains.filter(d => d.lastStatus === 'poor' || d.lastStatus === 'error').length;
  const totalCount = allDomains.length;

  return (
    <div className="border border-border rounded-xl overflow-hidden shadow-sm">
      {/* 站点头部 */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-card cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{siteType}</span>
              <span className="text-xs text-muted-foreground">{totalCount} 个域名</span>
              {badCount > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0">
                  {badCount} 个质量差
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpload(siteType as SiteType)}
            className="h-7 px-2 text-xs gap-1"
          >
            <Upload className="w-3 h-3" />
            上传域名
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onTriggerCheck(siteType)}
            disabled={isChecking}
            className="h-7 px-2 text-xs gap-1"
          >
            {isChecking ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Zap className="w-3 h-3" />
            )}
            检测
          </Button>
          <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 分类列表 */}
      {expanded && (
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 bg-muted/10">
          {Object.entries(categories).map(([cat, domains]) => (
            <CategorySection
              key={cat}
              category={cat as DomainCategory}
              domains={domains}
              onCopy={onCopy}
              onDelete={onDelete}
              onClearCategory={(category, label) => onClearCategory(siteType, category, label)}
              onSwitchTool={onSwitchTool}
              deletingIds={deletingIds}
              switchingToolIds={switchingToolIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 预热域名展示组件 ────────────────────────────────────────────────────────────

type PreheatDomain = {
  id: number;
  domain: string;
  category: string;
  siteType: string | null;
  preheatStatus: string | null;
  preheatAt: Date | null;
  lastStatus: string | null;
  lastSummary: string | null;
  lastFailNodes: number | null;
  lastAvgLatencyMs: number | null;
  lastCheckedAt: Date | null;
};

function PreheatCategoryCard({ category, domain }: { category: string; domain: PreheatDomain }) {
  const label = CATEGORY_LABELS[category as DomainCategory] ?? category;
  const handleCopy = () => {
    navigator.clipboard.writeText(domain.domain).then(() => toast.success('已复制到剪贴板')).catch(() => toast.error('复制失败'));
  };
  const preheatTime = domain.preheatAt ? new Date(domain.preheatAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
  return (
    <div className="border border-emerald-200 rounded-lg overflow-hidden bg-emerald-50/40">
      <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border-b border-emerald-200">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-medium text-sm text-emerald-800">{label}</span>
        </div>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border bg-emerald-100 text-emerald-700 border-emerald-300">
          已检测待使用
        </span>
      </div>
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-sm text-foreground truncate flex-1" title={domain.domain}>{domain.domain}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="复制域名"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <a
              href={domain.domain.startsWith('http') ? domain.domain : `https://${domain.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="在新标签页打开"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <StatusBadge status={domain.lastStatus} />
          {domain.lastSummary && (
            <span className="truncate max-w-40" title={domain.lastSummary}>{domain.lastSummary}</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>预热时间：{preheatTime}</span>
        </div>
      </div>
    </div>
  );
}

function PreheatSiteCard({ siteType, categories }: {
  siteType: string;
  categories: Record<string, PreheatDomain>;
}) {
  const [expanded, setExpanded] = useState(true);
  const count = Object.keys(categories).length;

  return (
    <div className="border border-emerald-200 rounded-xl overflow-hidden shadow-sm">
      <div
        className="flex items-center justify-between px-4 py-3 bg-emerald-50/60 cursor-pointer hover:bg-emerald-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{siteType}</span>
              <span className="text-xs text-muted-foreground">{count} 个分类已就绪</span>
              <Badge className="text-xs px-1.5 py-0 bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">
                已检测待使用
              </Badge>
            </div>
          </div>
        </div>
        <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {expanded && (
        <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 bg-muted/5">
          {Object.entries(categories).map(([cat, domain]) => (
            <PreheatCategoryCard key={cat} category={cat} domain={domain} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────────────────────

export default function SeoNav() {
  const [importSiteType, setImportSiteType] = useState<SiteType | null>(null);
  const [globalImportOpen, setGlobalImportOpen] = useState(false);
  const [filterSite, setFilterSite] = useState<string>('all');
  const [checkingSites, setCheckingSites] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [switchingToolIds, setSwitchingToolIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<'active' | 'preheat'>('active');
  const [preheatTriggering, setPreheatTriggering] = useState(false);

  // 确认对话框状态
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; domain: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState<{ siteType: string; category: DomainCategory; label: string } | null>(null);

  // 获取 SEO 导航数据
  const navQuery = trpc.seo.getNavData.useQuery({
    siteType: filterSite === 'all' ? undefined : filterSite,
  }, { refetchInterval: 30000 });

  // 获取预热域名数据
  const preheatQuery = trpc.seo.getPreheatDomains.useQuery({
    siteType: filterSite === 'all' ? undefined : filterSite,
  }, { refetchInterval: 60000 });

  const utils = trpc.useUtils();

  // 触发检测
  const triggerCheckMutation = trpc.seo.triggerCheck.useMutation({
    onSuccess: (data, vars) => {
      toast.success(`${vars.siteType} 检测完成，共检测 ${data.checked} 个域名`);
      utils.seo.getNavData.invalidate();
      setCheckingSites(prev => { const s = new Set(prev); s.delete(vars.siteType); return s; });
    },
    onError: (err, vars) => {
      toast.error(`${vars.siteType} 检测失败：${err.message}`);
      setCheckingSites(prev => { const s = new Set(prev); s.delete(vars.siteType); return s; });
    },
  });

  // 手动触发预热
  const triggerPreheatMutation = trpc.seo.triggerPreheat.useMutation({
    onSuccess: (data) => {
      setPreheatTriggering(false);
      if (data.success) {
        toast.success(data.message);
        // 切换到预热 Tab，并在 15 秒后自动刷新
        setActiveTab('preheat');
        setTimeout(() => preheatQuery.refetch(), 15000);
      } else {
        toast.warning(data.message);
      }
    },
    onError: (err) => {
      setPreheatTriggering(false);
      toast.error(`预热启动失败：${err.message}`);
    },
  });

  // 删除单条域名
  const deleteMutation = trpc.seo.deleteNavDomain.useMutation({
    onSuccess: (_data, vars) => {
      toast.success('域名已删除');
      setDeletingIds(prev => { const s = new Set(prev); s.delete(vars.id); return s; });
      utils.seo.getNavData.invalidate();
    },
    onError: (err, vars) => {
      toast.error(`删除失败：${err.message}`);
      setDeletingIds(prev => { const s = new Set(prev); s.delete(vars.id); return s; });
    },
  });

  // 一键清空分类
  const clearMutation = trpc.seo.clearNavCategory.useMutation({
    onSuccess: () => {
      toast.success('已清空该分类所有域名');
      utils.seo.getNavData.invalidate();
    },
    onError: (err) => {
      toast.error(`清空失败：${err.message}`);
    },
  });

  // 切换检测工具
  const switchToolMutation = trpc.seo.updateCheckTool.useMutation({
    onSuccess: (_data, vars) => {
      const toolLabel = CHECK_TOOL_CONFIG[vars.checkTool as CheckTool]?.label ?? vars.checkTool;
      toast.success(`已切换为 ${toolLabel}`);
      setSwitchingToolIds(prev => { const s = new Set(prev); s.delete(vars.id); return s; });
      utils.seo.getNavData.invalidate();
    },
    onError: (err, vars) => {
      toast.error(`切换失败：${err.message}`);
      setSwitchingToolIds(prev => { const s = new Set(prev); s.delete(vars.id); return s; });
    },
  });

  const handleTriggerCheck = (siteType: string) => {
    setCheckingSites(prev => new Set(prev).add(siteType));
    triggerCheckMutation.mutate({ siteType, tool: 'itdog' });
  };

  const handleCopy = (domain: string) => {
    navigator.clipboard.writeText(domain).then(() => {
      toast.success('已复制到剪贴板');
    }).catch(() => {
      toast.error('复制失败');
    });
  };

  const handleUpload = (siteType: SiteType) => {
    setImportSiteType(siteType);
  };

  const handleDeleteClick = (id: number, domain: string) => {
    setConfirmDelete({ id, domain });
  };

  const handleDeleteConfirm = () => {
    if (!confirmDelete) return;
    setDeletingIds(prev => new Set(prev).add(confirmDelete.id));
    deleteMutation.mutate({ id: confirmDelete.id });
    setConfirmDelete(null);
  };

  const handleClearClick = (siteType: string, category: DomainCategory, label: string) => {
    setConfirmClear({ siteType, category, label });
  };

  const handleClearConfirm = () => {
    if (!confirmClear) return;
    clearMutation.mutate({ siteType: confirmClear.siteType, category: confirmClear.category });
    setConfirmClear(null);
  };

  const handleSwitchTool = (id: number, tool: CheckTool) => {
    setSwitchingToolIds(prev => new Set(prev).add(id));
    switchToolMutation.mutate({ id, checkTool: tool });
  };

  const grouped = navQuery.data?.grouped ?? {};
  const preheatGrouped = preheatQuery.data?.grouped ?? {};
  const preheatTotal = preheatQuery.data?.total ?? 0;

  // 过滤后的站点列表
  const filteredSites = useMemo(() => {
    if (filterSite === 'all') return Object.keys(grouped).sort();
    return Object.keys(grouped).filter(s => s === filterSite);
  }, [grouped, filterSite]);

  const filteredPreheatSites = useMemo(() => {
    if (filterSite === 'all') return Object.keys(preheatGrouped).sort();
    return Object.keys(preheatGrouped).filter(s => s === filterSite);
  }, [preheatGrouped, filterSite]);

  // 统计
  const stats = useMemo(() => {
    const allDomains = Object.values(grouped).flatMap(cats => Object.values(cats).flat());
    return {
      total: allDomains.length,
      ok: allDomains.filter(d => d.lastStatus === 'ok').length,
      warn: allDomains.filter(d => d.lastStatus === 'warn').length,
      poor: allDomains.filter(d => d.lastStatus === 'poor' || d.lastStatus === 'error').length,
      unchecked: allDomains.filter(d => !d.lastStatus || d.lastStatus === 'pending').length,
    };
  }, [grouped]);

  return (
    <div className="min-h-screen bg-background">
      <AppNav activeTab="seo-nav" />

      <div className="container py-6 space-y-5">
        {/* 页头 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">SEO 在用域名导航</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              当前在用 SEO 域名，按站点和分类分组展示
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setGlobalImportOpen(true)}
              className="gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              上传域名
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPreheatTriggering(true);
                triggerPreheatMutation.mutate();
              }}
              disabled={preheatTriggering || triggerPreheatMutation.isPending}
              className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-white"
              title="立即运行一轮预热，将库存域名模拟检测并缓存结果"
            >
              {preheatTriggering ? (
                <><div className="w-3.5 h-3.5 border-2 border-emerald-300/30 border-t-emerald-600 rounded-full animate-spin" />预热中</>
              ) : (
                <><Flame className="w-3.5 h-3.5" />立即预热</>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { navQuery.refetch(); preheatQuery.refetch(); }}
              disabled={navQuery.isFetching || preheatQuery.isFetching}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(navQuery.isFetching || preheatQuery.isFetching) ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: '在用域名', value: stats.total, color: 'text-foreground' },
            { label: '状态正常', value: stats.ok, color: 'text-green-600' },
            { label: '质量差/异常', value: stats.poor, color: 'text-red-600' },
            { label: '未检测', value: stats.unchecked, color: 'text-muted-foreground' },
            { label: '已检测待使用', value: preheatTotal, color: 'text-emerald-600' },
          ].map(s => (
            <div
              key={s.label}
              className={`bg-card border rounded-lg p-3 cursor-pointer transition-colors ${
                s.label === '已检测待使用'
                  ? activeTab === 'preheat'
                    ? 'border-emerald-400 bg-emerald-50/60'
                    : 'border-border hover:border-emerald-300 hover:bg-emerald-50/30'
                  : 'border-border'
              }`}
              onClick={() => s.label === '已检测待使用' && setActiveTab(activeTab === 'preheat' ? 'active' : 'preheat')}
              title={s.label === '已检测待使用' ? '点击切换到预热域名列表' : undefined}
            >
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab 切换 */}
        <div className="flex items-center gap-1 border-b border-border">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'active'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            在用域名
            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{stats.total}</span>
          </button>
          <button
            onClick={() => setActiveTab('preheat')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
              activeTab === 'preheat'
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            已检测待使用
            {preheatTotal > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{preheatTotal}</span>
            )}
          </button>
        </div>

        {/* 过滤器 */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground flex-shrink-0">站点筛选</span>
          <Select value={filterSite} onValueChange={setFilterSite}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部站点</SelectItem>
              {SITE_TYPES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 在用域名 Tab */}
        {activeTab === 'active' && (
          navQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>加载中...</span>
            </div>
          ) : filteredSites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4">
              <Globe className="w-10 h-10 opacity-30" />
              <p className="text-sm">暂无 SEO 在用域名</p>
              <Button
                onClick={() => setGlobalImportOpen(true)}
                className="gap-1.5"
              >
                <Upload className="w-4 h-4" />
                上传域名
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSites.map(siteType => (
                <SiteCard
                  key={siteType}
                  siteType={siteType}
                  categories={grouped[siteType] ?? {}}
                  onCopy={handleCopy}
                  onTriggerCheck={handleTriggerCheck}
                  onUpload={handleUpload}
                  isChecking={checkingSites.has(siteType)}
                  onDelete={handleDeleteClick}
                  onClearCategory={handleClearClick}
                  onSwitchTool={handleSwitchTool}
                  deletingIds={deletingIds}
                  switchingToolIds={switchingToolIds}
                />
              ))}
            </div>
          )
        )}

        {/* 已检测待使用 Tab */}
        {activeTab === 'preheat' && (
          preheatQuery.isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>加载中...</span>
            </div>
          ) : filteredPreheatSites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4">
              <CheckCircle2 className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">暂无预热完成的候选域名</p>
              <p className="text-xs text-center max-w-xs">
                系统将在非高峰期（北京时间 08:00-14:00）自动对库存 SEO 域名进行预检测，
                通过检测的域名将在此处展示，换域时优先使用。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>
                  以下域名已通过预检测，质量评级为「正常」或「优秀」，换域时将优先使用（跳过实时检测，大幅缩短换域时间）。
                  每个分类展示最早预热的一条。
                </span>
              </div>
              {filteredPreheatSites.map(siteType => (
                <PreheatSiteCard
                  key={siteType}
                  siteType={siteType}
                  categories={preheatGrouped[siteType] ?? {}}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* 全局上传弹窗（无预选站点） */}
      {globalImportOpen && (
        <SeoImportDialog
          open={globalImportOpen}
          onClose={() => setGlobalImportOpen(false)}
          siteType={null}
          onSuccess={() => {
            navQuery.refetch();
            setGlobalImportOpen(false);
          }}
        />
      )}

      {/* 站点卡片上传弹窗（预选站点） */}
      {importSiteType && (
        <SeoImportDialog
          open={!!importSiteType}
          onClose={() => setImportSiteType(null)}
          siteType={importSiteType}
          onSuccess={() => {
            navQuery.refetch();
            toast.success('SEO 域名上传成功');
          }}
        />
      )}

      {/* 删除单条确认对话框 */}
      <AlertDialog open={!!confirmDelete} onOpenChange={open => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除域名</AlertDialogTitle>
            <AlertDialogDescription>
              确定要从 SEO 导航中删除域名 <span className="font-mono font-medium text-foreground">{confirmDelete?.domain}</span> 吗？
              <br />
              删除后该域名将回归库存，不再显示在导航页。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 一键清空分类确认对话框 */}
      <AlertDialog open={!!confirmClear} onOpenChange={open => !open && setConfirmClear(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清空分类</AlertDialogTitle>
            <AlertDialogDescription>
              确定要清空站点 <span className="font-medium text-foreground">{confirmClear?.siteType}</span> 下「<span className="font-medium text-foreground">{confirmClear?.label}</span>」分类的所有在用域名吗？
              <br />
              清空后所有域名将回归库存，不再显示在导航页。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              确认清空
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
