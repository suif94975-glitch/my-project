import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Search, Trash2, RefreshCw, ChevronLeft, ChevronRight,
  Database, AlertCircle, CheckSquare, Square, Download,
  BarChart3, ChevronDown, ChevronUp, Globe, Plus, Pencil, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import AppNav from '@/components/AppNav';
import { trpc } from '@/lib/trpc';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import ImportDialog from '@/components/ImportDialog';
import {
  DOMAIN_CATEGORIES, CATEGORY_LABELS, SEO_CATEGORIES, SEO_CATEGORY_LABELS,
  SITE_TYPES, CDN_TYPES, CDN_TYPE_LABELS,
  type DomainCategory, type SiteType, type CdnType,
} from '@/lib/domainConstants';

const CATEGORY_COLORS: Record<DomainCategory, string> = {
  web: 'bg-blue-50 text-blue-700 border-blue-200',
  h5: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  full: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  sports: 'bg-orange-50 text-orange-700 border-orange-200',
  live: 'bg-red-50 text-red-700 border-red-200',
  proxy_web: 'bg-purple-50 text-purple-700 border-purple-200',
  proxy_h5: 'bg-violet-50 text-violet-700 border-violet-200',
  lite_h5: 'bg-teal-50 text-teal-700 border-teal-200',
  lite_sports_h5: 'bg-amber-50 text-amber-700 border-amber-200',
  fujian_web: 'bg-rose-50 text-rose-700 border-rose-200',
  fujian_h5: 'bg-pink-50 text-pink-700 border-pink-200',
};
const CDN_BIND_OPTIONS = [
  { value: '__none__', label: '不绑定' },
  { value: 'a8', label: 'A8' },
  { value: 'a8543', label: 'A-8543' },
  { value: 'toff', label: 'Toff' },
];
const PAGE_SIZE = 50;
type PoolType = 'main' | 'seo';

function VendorPanel({ onRefresh }: { onRefresh: () => void }) {
  const [newName, setNewName] = useState('');
  const [newCdnType, setNewCdnType] = useState('__none__');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editCdnType, setEditCdnType] = useState('__none__');
  const [expanded, setExpanded] = useState(true);
  const vendorsQuery = trpc.vendor.listVendors.useQuery(undefined, { retry: false });
  const vendors = vendorsQuery.data || [];
  const createMut = trpc.vendor.createVendor.useMutation({
    onSuccess: () => { setNewName(''); setNewCdnType('__none__'); vendorsQuery.refetch(); onRefresh(); toast.success('厂商已创建'); },
    onError: (e) => toast.error(e.message),
  });
  const renameMut = trpc.vendor.renameVendor.useMutation({
    onSuccess: () => { setEditId(null); vendorsQuery.refetch(); onRefresh(); toast.success('已保存'); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.vendor.deleteVendor.useMutation({
    onSuccess: () => { vendorsQuery.refetch(); onRefresh(); toast.success('厂商已删除'); },
    onError: (e) => toast.error(e.message),
  });
  const handleSaveEdit = (id: number) => {
    renameMut.mutate({ id, name: editName, cdnType: editCdnType === '__none__' ? null : (editCdnType as 'a8' | 'a8543' | 'toff') });
  };
  const handleCreate = () => {
    if (!newName.trim()) return;
    createMut.mutate({ name: newName, cdnType: newCdnType === '__none__' ? null : (newCdnType as 'a8' | 'a8543' | 'toff') });
  };
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">厂商管理</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{vendors.length}</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="border-t border-border">
          {vendors.length > 0 && (
            <div className="divide-y divide-border">
              {vendors.map(v => (
                <div key={v.id} className="px-4 py-2.5">
                  {editId === v.id ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-sm w-32 min-w-0" autoFocus onKeyDown={e => { if (e.key === 'Escape') setEditId(null); }} />
                      <Select value={editCdnType} onValueChange={setEditCdnType}>
                        <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="绑定CDN" /></SelectTrigger>
                        <SelectContent>{CDN_BIND_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="sm" className="h-7 px-2 text-xs" onClick={() => handleSaveEdit(v.id)} disabled={!editName.trim() || renameMut.isPending}>保存</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditId(null)}>取消</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground flex-1 truncate">{v.name}</span>
                      {(v as any).cdnType ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 flex-shrink-0">CDN:{(CDN_TYPE_LABELS as Record<string, string>)[(v as any).cdnType] ?? (v as any).cdnType}</span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-300 flex-shrink-0 flex items-center gap-0.5" title="该厂商未绑定CDN，随机模式下CDN不确定">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                          未绑定CDN
                        </span>
                      )}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => { setEditId(v.id); setEditName(v.name); setEditCdnType((v as any).cdnType ?? '__none__'); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="编辑"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { if (confirm(`确认删除厂商「${v.name}」及其所有域名？`)) deleteMut.mutate({ id: v.id }); }} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors" title="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="px-4 py-3 border-t border-border flex gap-2 flex-wrap">
            <Input placeholder="新厂商名称" value={newName} onChange={e => setNewName(e.target.value)} className="h-8 text-sm w-32 min-w-0" onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }} />
            <Select value={newCdnType} onValueChange={setNewCdnType}>
              <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="绑定CDN" /></SelectTrigger>
              <SelectContent>{CDN_BIND_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" className="h-8 px-3 gap-1" onClick={handleCreate} disabled={!newName.trim() || createMut.isPending}><Plus className="w-3.5 h-3.5" />添加</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DomainPoolPanel({ poolType }: { poolType: PoolType }) {
  const [filterVendorId, setFilterVendorId] = useState<number | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState<DomainCategory | undefined>(undefined);
  const [filterSite, setFilterSite] = useState<SiteType | undefined>(undefined);
  const [filterCdn, setFilterCdn] = useState<CdnType | undefined>(undefined);
  const [filterUsageStatus, setFilterUsageStatus] = useState<'all' | 'used' | 'skipped' | 'unused'>('all');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importVendorId, setImportVendorId] = useState<number | null>(null);
  const [importVendorName, setImportVendorName] = useState('');
  const [importVendorCdnType, setImportVendorCdnType] = useState<CdnType | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchText); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);
  useEffect(() => { setPage(1); setSelectedIds(new Set()); }, [filterVendorId, filterCategory, filterSite, filterCdn, filterUsageStatus]);

  const vendorsQuery = trpc.vendor.listVendors.useQuery(undefined, { retry: false });
  const vendors = vendorsQuery.data || [];
  const domainsQuery = trpc.vendor.listDomains.useQuery({
    vendorId: filterVendorId, category: filterCategory, siteType: filterSite, cdnType: filterCdn,
    search: debouncedSearch || undefined, page, pageSize: PAGE_SIZE, poolType,
    usageStatus: filterUsageStatus === 'all' ? undefined : filterUsageStatus,
  }, { retry: false });
  const items = domainsQuery.data?.items || [];
  const total = domainsQuery.data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const deleteMut = trpc.vendor.deleteDomain.useMutation({
    onSuccess: () => {
      toast.success('已删除');
      const id = deleteConfirmId;
      setDeleteConfirmId(null);
      setSelectedIds(prev => { const next = new Set(prev); if (id !== null) next.delete(id); return next; });
      domainsQuery.refetch();
    },
    onError: (e) => toast.error(e.message),
  });
  const batchDeleteMut = trpc.vendor.batchDeleteDomains.useMutation({
    onSuccess: (data) => { toast.success(`已删除 ${data.deleted} 条`); setBatchDeleteConfirm(false); setSelectedIds(new Set()); domainsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatusMut = trpc.vendor.updateDomainStatus.useMutation({
    onSuccess: () => { domainsQuery.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const allCurrentIds = items.map(d => d.id);
  const allSelected = allCurrentIds.length > 0 && allCurrentIds.every(id => selectedIds.has(id));
  const someSelected = allCurrentIds.some(id => selectedIds.has(id));
  const toggleSelectAll = useCallback(() => {
    if (allSelected) setSelectedIds(prev => { const next = new Set(prev); allCurrentIds.forEach(id => next.delete(id)); return next; });
    else setSelectedIds(prev => { const next = new Set(prev); allCurrentIds.forEach(id => next.add(id)); return next; });
  }, [allSelected, allCurrentIds]);
  const toggleSelectOne = useCallback((id: number) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }, []);
  const resetFilters = () => { setFilterVendorId(undefined); setFilterCategory(undefined); setFilterSite(undefined); setFilterCdn(undefined); setFilterUsageStatus('all'); setSearchText(''); setPage(1); };

  const statsQuery = trpc.vendor.getLibraryStats.useQuery({ poolType }, { retry: false });
  const stats = statsQuery.data;
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!stats?.siteVendorCategoryDetail) return;
    const autoExpand = new Set<string>();
    for (const [site, vs] of Object.entries(stats.siteVendorCategoryDetail)) {
      if ((vs as any[]).some((v: any) => Object.values(v.categories).some((c: any) => c.remaining < 3))) autoExpand.add(site);
    }
    if (autoExpand.size > 0) setExpandedSites(prev => { const next = new Set(prev); autoExpand.forEach(s => next.add(s)); return next; });
  }, [stats]);

  const exportMut = trpc.vendor.exportDomains.useMutation({
    onSuccess: (data) => {
      const binary = atob(data.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = data.filename; a.click(); URL.revokeObjectURL(url);
      toast.success(`导出成功，共 ${data.total} 条域名`);
    },
    onError: (e) => toast.error('导出失败: ' + e.message),
  });
  const handleExport = useCallback(() => {
    exportMut.mutate({ vendorId: filterVendorId, category: filterCategory, siteType: filterSite, cdnType: filterCdn, search: debouncedSearch || undefined });
  }, [filterVendorId, filterCategory, filterSite, filterCdn, debouncedSearch]);

  const hasFilters = filterVendorId !== undefined || filterCategory !== undefined || filterSite !== undefined || filterCdn !== undefined || filterUsageStatus !== 'all' || searchText !== '';
  const openImportForVendor = (vendorId: number, vendorName: string, vendorCdnType?: string | null) => {
    setImportVendorId(vendorId); setImportVendorName(vendorName); setImportVendorCdnType((vendorCdnType as CdnType) ?? null); setImportDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <VendorPanel onRefresh={() => { vendorsQuery.refetch(); domainsQuery.refetch(); statsQuery.refetch(); }} />

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Upload className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">导入域名</span>
        </div>
        {vendors.length === 0 ? (
          <p className="text-xs text-muted-foreground">请先在上方创建厂商，再导入域名</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {vendors.map(v => (
              <Button key={v.id} variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openImportForVendor(v.id, v.name, (v as any).cdnType)}>
                <Plus className="w-3 h-3" />导入至 {v.name}
                {(v as any).cdnType && <span className="ml-0.5 px-1 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] leading-none">{(CDN_TYPE_LABELS as Record<string, string>)[(v as any).cdnType]}</span>}
              </Button>
            ))}
          </div>
        )}
      </div>

      {stats && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{poolType === 'main' ? '主推' : 'SEO'} 域名库统计</span>
            <button onClick={() => statsQuery.refetch()} className="ml-auto p-1 rounded text-muted-foreground hover:text-foreground transition-colors"><RefreshCw className={`w-3.5 h-3.5 ${statsQuery.isFetching ? 'animate-spin' : ''}`} /></button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-center">
              <div className="text-2xl font-bold text-foreground">{stats.total.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-0.5">总域名数</div>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-center">
              <div className="text-2xl font-bold text-amber-700">{stats.used.toLocaleString()}</div>
              <div className="text-xs text-amber-600 mt-0.5">已使用</div>
            </div>
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-center">
              <div className="text-2xl font-bold text-green-700">{stats.remaining.toLocaleString()}</div>
              <div className="text-xs text-green-600 mt-0.5">剩余可用</div>
            </div>
          </div>
          {stats.vendorStats.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">厂商分布</div>
              <div className="flex flex-wrap gap-1.5">
                {stats.vendorStats.map((v: any) => (
                  <div key={v.vendorId} className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-muted/20 text-xs">
                    <span className="font-medium text-foreground">{v.vendorName}</span>
                    <span className="text-muted-foreground">共{v.total}</span>
                    {v.used > 0 && <span className="text-amber-600">用{v.used}</span>}
                    <span className="text-green-600 font-medium">余{v.remaining}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {stats.siteStats && stats.siteStats.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">站点分布</div>
              <div className="space-y-1.5">
                {stats.siteStats.sort((a: any, b: any) => a.siteType.localeCompare(b.siteType)).map((s: any) => {
                  const isExpanded = expandedSites.has(s.siteType);
                  const detail = stats.siteVendorCategoryDetail?.[s.siteType] ?? [];
                  const hasLowStock = (detail as any[]).some((v: any) => Object.values(v.categories).some((c: any) => c.remaining < 3));
                  return (
                    <div key={s.siteType} className={`rounded border ${hasLowStock ? 'border-orange-300 bg-orange-50/50' : 'border-blue-200 bg-blue-50/50'}`}>
                      <button className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-black/5 transition-colors rounded" onClick={() => setExpandedSites(prev => { const next = new Set(prev); next.has(s.siteType) ? next.delete(s.siteType) : next.add(s.siteType); return next; })}>
                        <span className={`font-semibold ${hasLowStock ? 'text-orange-700' : 'text-blue-700'}`}>{s.siteType}</span>
                        <span className="text-muted-foreground">共{s.total}</span>
                        {s.used > 0 && <span className="text-amber-600">用{s.used}</span>}
                        <span className={`font-medium ${s.remaining < 3 ? 'text-red-600' : s.remaining < 10 ? 'text-orange-600' : 'text-green-600'}`}>余{s.remaining}</span>
                        {hasLowStock && <span className="ml-1 text-orange-600 text-[10px] font-medium px-1 py-0.5 rounded bg-orange-100 border border-orange-200">库存预警</span>}
                        <span className="ml-auto">{isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}</span>
                      </button>
                      {isExpanded && (detail as any[]).length > 0 && (
                        <div className="px-2.5 pb-2 space-y-1.5">
                          {(detail as any[]).map((v: any) => (
                            <div key={v.vendorId} className="rounded bg-white/60 border border-white/80 px-2 py-1.5">
                              <div className="text-xs font-medium text-foreground mb-1">{v.vendorName}</div>
                              <div className="flex flex-wrap gap-1">
                                {DOMAIN_CATEGORIES.map((cat: DomainCategory) => {
                                  const c = v.categories[cat];
                                  if (!c) return null;
                                  const isLow = c.remaining < 3;
                                  return (
                                    <div key={cat} className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${isLow ? 'border-red-300 bg-red-50 text-red-700' : 'border-border bg-muted/30 text-muted-foreground'}`}>
                                      <span>{CATEGORY_LABELS[cat]}</span>
                                      <span className={`font-medium ${isLow ? 'text-red-600' : 'text-green-600'}`}>余{c.remaining}</span>
                                      {isLow && <span className="text-red-500">⚠</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {stats.cdnStats && stats.cdnStats.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1.5">CDN 分布</div>
              <div className="flex flex-wrap gap-1">
                {stats.cdnStats.map((c: any) => (
                  <div key={c.cdnType} className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-violet-200 bg-violet-50 text-xs">
                    <span className="font-medium text-violet-700">{c.cdnLabel}</span>
                    <span className="text-violet-500">{c.total}</span>
                    {c.remaining < c.total && <span className="text-green-600">余{c.remaining}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{total > 0 ? `共 ${total} 条域名` : '暂无域名数据'}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleExport} disabled={exportMut.isPending || total === 0}>
            {exportMut.isPending ? <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            导出 Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => domainsQuery.refetch()}><RefreshCw className="w-3.5 h-3.5" />刷新</Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="搜索域名..." value={searchText} onChange={e => setSearchText(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
          <Select value={filterVendorId !== undefined ? String(filterVendorId) : '__all__'} onValueChange={v => setFilterVendorId(v === '__all__' ? undefined : Number(v))}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="全部厂商" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">全部厂商</SelectItem>{vendors.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterCategory || '__all__'} onValueChange={v => setFilterCategory(v === '__all__' ? undefined : v as DomainCategory)}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="全部分类" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">全部分类</SelectItem>{(poolType === 'seo' ? SEO_CATEGORIES : DOMAIN_CATEGORIES).map(c => <SelectItem key={c} value={c}>{poolType === 'seo' ? SEO_CATEGORY_LABELS[c as keyof typeof SEO_CATEGORY_LABELS] : CATEGORY_LABELS[c as DomainCategory]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterSite || '__all__'} onValueChange={v => setFilterSite(v === '__all__' ? undefined : v as SiteType)}>
            <SelectTrigger className="h-8 text-xs w-24"><SelectValue placeholder="全部站点" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">全部站点</SelectItem>{SITE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterCdn || '__all__'} onValueChange={v => setFilterCdn(v === '__all__' ? undefined : v as CdnType)}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="全部 CDN" /></SelectTrigger>
            <SelectContent><SelectItem value="__all__">全部 CDN</SelectItem>{CDN_TYPES.map(c => <SelectItem key={c} value={c}>{CDN_TYPE_LABELS[c]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterUsageStatus} onValueChange={v => setFilterUsageStatus(v as 'all' | 'used' | 'skipped' | 'unused')}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="全部状态" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="used">已被使用</SelectItem>
              <SelectItem value="skipped">跳过使用</SelectItem>
              <SelectItem value="unused">未使用</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && <button onClick={resetFilters} className="text-xs px-2.5 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">重置</button>}
        </div>
        {hasFilters && (
          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">当前筛选：</span>
            {filterVendorId !== undefined && <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">厂商: {vendors.find(v => v.id === filterVendorId)?.name || filterVendorId}</span>}
            {filterCategory && <span className={`text-xs px-2 py-0.5 rounded border ${CATEGORY_COLORS[filterCategory]}`}>分类: {CATEGORY_LABELS[filterCategory]}</span>}
            {filterSite && <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">站点: {filterSite}</span>}
            {filterCdn && <span className="text-xs px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">CDN: {CDN_TYPE_LABELS[filterCdn]}</span>}
            {filterUsageStatus !== 'all' && <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">状态: {{ used: '已被使用', skipped: '跳过使用', unused: '未使用' }[filterUsageStatus]}</span>}
            {debouncedSearch && <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">搜索: "{debouncedSearch}"</span>}
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-red-200 bg-red-50">
          <span className="text-sm font-medium text-red-700">已选 {selectedIds.size} 条</span>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-red-500 hover:text-red-700 underline">取消选择</button>
          <div className="flex-1" />
          <Button size="sm" variant="outline" className="h-7 gap-1.5 border-red-300 text-red-600 hover:bg-red-100 hover:text-red-700" onClick={() => setBatchDeleteConfirm(true)}>
            <Trash2 className="w-3.5 h-3.5" />批量删除 ({selectedIds.size})
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
          <button onClick={toggleSelectAll} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : someSelected ? <div className="w-4 h-4 rounded border-2 border-primary bg-primary/20" /> : <Square className="w-4 h-4" />}
          </button>
          <span className="flex-1 min-w-0">域名</span>
          <span className="w-20 flex-shrink-0 hidden sm:block">分类</span>
          <span className="w-14 flex-shrink-0 hidden md:block">站点</span>
          <span className="w-16 flex-shrink-0 hidden md:block">CDN</span>
          <span className="w-20 flex-shrink-0 hidden lg:block">厂商</span>
          <span className="w-24 flex-shrink-0 hidden xl:block">使用状态</span>
          <span className="w-28 flex-shrink-0 hidden 2xl:block">创建时间</span>
          <span className="w-8 flex-shrink-0">操作</span>
        </div>
        {domainsQuery.isLoading && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 opacity-50" />加载中...</div>
        )}
        {!domainsQuery.isLoading && items.length === 0 && (
          <div className="px-4 py-12 text-center">
            <Database className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">{hasFilters ? '没有符合筛选条件的域名' : '暂无域名数据'}</p>
            {hasFilters && <button onClick={resetFilters} className="mt-2 text-xs text-primary hover:underline">清除筛选条件</button>}
          </div>
        )}
        {!domainsQuery.isLoading && items.length > 0 && (
          <div className="divide-y divide-border">
            {items.map(item => {
              const isSelected = selectedIds.has(item.id);
              const cat = item.category as DomainCategory;
              const isUsed = item.isUsed === true;
              const isSkipped = (item as any).skipFlag === true;
              const isPreheatOk = (item as any).preheatStatus === 'ok' && !isUsed && (item as any).source === 'stock';
              // 行背景高亮：已使用=红色，跳过=黄色，预热就绪=绿色
              const rowBg = isUsed ? 'bg-red-50 border-l-2 border-red-300' : isSkipped ? 'bg-amber-50 border-l-2 border-amber-300' : isPreheatOk ? 'bg-emerald-50 border-l-2 border-emerald-300' : '';
              return (
                <div key={item.id} className={`flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors ${isSelected ? 'bg-primary/5' : ''} ${rowBg}`}>
                  <button onClick={() => toggleSelectOne(item.id)} className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors">
                    {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                  </button>
                  <span className="flex-1 min-w-0 font-mono text-sm text-foreground truncate" title={item.domain}>
                    {item.domain}
                  </span>
                  <span className="w-20 flex-shrink-0 hidden sm:block">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[cat] || 'bg-muted text-muted-foreground border-border'}`}>{CATEGORY_LABELS[cat] || cat}</span>
                  </span>
                  <span className="w-14 flex-shrink-0 hidden md:block">
                    {item.siteType ? <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">{item.siteType}</span> : <span className="text-xs text-muted-foreground/50">—</span>}
                  </span>
                  <span className="w-16 flex-shrink-0 hidden md:block">
                    {item.cdnType ? <span className="text-xs px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">{CDN_TYPE_LABELS[item.cdnType as CdnType] || item.cdnType}</span> : <span className="text-xs text-muted-foreground/50">—</span>}
                  </span>
                  <span className="w-20 flex-shrink-0 hidden lg:block text-xs text-muted-foreground truncate" title={item.vendorName || ''}>{item.vendorName || '—'}</span>
                  {/* 使用状态列 */}
                  <span className="w-24 flex-shrink-0 hidden xl:flex items-center gap-1">
                    {isUsed ? (
                      <button
                        onClick={() => updateStatusMut.mutate({ id: item.id, isUsed: false })}
                        className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 border border-red-200 hover:bg-red-200 transition-colors cursor-pointer"
                        title="点击取消已使用标记"
                      >已被使用</button>
                    ) : isSkipped ? (
                      <button
                        onClick={() => updateStatusMut.mutate({ id: item.id, skipFlag: false })}
                        className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 transition-colors cursor-pointer"
                        title="点击取消跳过标记"
                      >跳过使用</button>
                    ) : isPreheatOk ? (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-300" title="已通过预检测，换域时优先使用">已检测待使用</span>
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">未使用</span>
                    )}
                  </span>
                  <span className="w-28 flex-shrink-0 hidden 2xl:block text-xs text-muted-foreground">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                  <div className="w-8 flex-shrink-0 flex justify-end">
                    <button onClick={() => setDeleteConfirmId(item.id)} className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors" title="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">第 {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} 条，共 {total} 条</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-3.5 h-3.5" /></button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) pageNum = i + 1;
              else if (page <= 4) pageNum = i + 1;
              else if (page >= totalPages - 3) pageNum = totalPages - 6 + i;
              else pageNum = page - 3 + i;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-7 h-7 rounded border text-xs font-medium transition-colors ${page === pageNum ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'}`}>{pageNum}</button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}

      {importVendorId && (
        <ImportDialog
          open={importDialogOpen}
          onClose={() => { setImportDialogOpen(false); setImportVendorId(null); setImportVendorCdnType(null); }}
          vendorId={importVendorId}
          vendorName={importVendorName}
          vendorCdnType={importVendorCdnType}
          poolType={poolType}
          showResetCooldown={poolType === 'main'}
          onSuccess={() => { domainsQuery.refetch(); statsQuery.refetch(); }}
        />
      )}

      <Dialog open={deleteConfirmId !== null} onOpenChange={v => { if (!v) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><AlertCircle className="w-5 h-5" />确认删除</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">确认删除该域名？此操作不可撤销。</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="flex-1">取消</Button>
            <Button variant="destructive" onClick={() => { if (deleteConfirmId !== null) deleteMut.mutate({ id: deleteConfirmId }); }} disabled={deleteMut.isPending} className="flex-1">{deleteMut.isPending ? '删除中...' : '确认删除'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={batchDeleteConfirm} onOpenChange={v => { if (!v) setBatchDeleteConfirm(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-600"><AlertCircle className="w-5 h-5" />批量删除确认</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">确认删除选中的 <strong className="text-foreground">{selectedIds.size}</strong> 条域名？此操作不可撤销。</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBatchDeleteConfirm(false)} className="flex-1">取消</Button>
            <Button variant="destructive" onClick={() => batchDeleteMut.mutate({ ids: Array.from(selectedIds) })} disabled={batchDeleteMut.isPending} className="flex-1">{batchDeleteMut.isPending ? '删除中...' : `删除 ${selectedIds.size} 条`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DomainLibrary() {
  const [activePool, setActivePool] = useState<PoolType>('main');
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav activeTab="library" />
      <section className="container py-6 flex-1">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded border border-primary/20 bg-primary/10 flex items-center justify-center">
              <Database className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">域名库管理</h1>
              <p className="text-xs text-muted-foreground">管理主推域名库与 SEO 域名库</p>
            </div>
          </div>
          <div className="flex gap-1 p-1 rounded-lg bg-muted">
            <button onClick={() => setActivePool('main')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${activePool === 'main' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Globe className="w-4 h-4" />主推域名库
            </button>
            <button onClick={() => setActivePool('seo')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${activePool === 'seo' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Search className="w-4 h-4" />SEO 域名库
            </button>
          </div>
          <DomainPoolPanel key={activePool} poolType={activePool} />
        </div>
      </section>
    </div>
  );
}
