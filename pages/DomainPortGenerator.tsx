import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Zap, RefreshCw, ClipboardList, ArrowRight,
  Shuffle, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import AppNav from '@/components/AppNav';
import CopyBtn from '@/components/CopyBtn';
import CategoryMultiSelect from '@/components/CategoryMultiSelect';
import DetectionCompleteDialog from '@/components/DetectionCompleteDialog';
import { trpc } from '@/lib/trpc';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DOMAIN_CATEGORIES, CATEGORY_LABELS, SITE_TYPES, CDN_TYPES, CDN_TYPE_LABELS,
  PORT_GROUPS, CHECK_TOOLS, cleanDomain,
  type DomainCategory, type SiteType, type CdnType, type CheckToolId,
} from '@/lib/domainConstants';

interface VendorWithStats {
  id: number;
  name: string;
  totalDomains: number;
  categoryCounts: Partial<Record<DomainCategory, number>>;
  siteCounts?: Partial<Record<SiteType, number>>;
  cdnCounts?: Partial<Record<CdnType, number>>;
  cdnType?: string | null;
}

interface GeneratedResult {
  category: DomainCategory;
  categoryLabel: string;
  domain: string;
  port: number;
  url: string;
  siteType?: string | null;
  cdnType?: string | null;
  vendorId?: number | null;
}

export default function DomainPortGenerator() {
  const [, navigate] = useLocation();

  const vendorsQuery = trpc.vendor.listVendorsWithStats.useQuery(undefined, { retry: false });
  const vendors: VendorWithStats[] = (vendorsQuery.data || []) as VendorWithStats[];
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const hasAutoSelected = useRef(false);
  if (vendors.length > 0 && !selectedVendorId && !hasAutoSelected.current) {
    hasAutoSelected.current = true;
    Promise.resolve().then(() => setSelectedVendorId(vendors[0].id));
  }

  const [genMode, setGenMode] = useState<'vendor' | 'manual'>('vendor');
  const [manualGenText, setManualGenText] = useState('');
  const [randomVendor, setRandomVendor] = useState(false);
  const [manualPortGroups, setManualPortGroups] = useState<Set<string>>(new Set(PORT_GROUPS.map(g => g.id)));
  const toggleManualPortGroup = (id: string) => {
    setManualPortGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
  };

  const [genPoolType, setGenPoolType] = useState<'main' | 'seo'>('main');
  const [genFilterSite, setGenFilterSite] = useState<SiteType | undefined>(undefined);
  const [genFilterCdn, setGenFilterCdn] = useState<CdnType | undefined>(undefined);
  const [genFilterCategories, setGenFilterCategories] = useState<Set<DomainCategory>>(new Set());
  const [categoryCount, setCategoryCount] = useState<number>(1);
  const [autoPortGroupIds, setAutoPortGroupIds] = useState<string[] | null>(null);

  const handleCdnChange = (cdn: CdnType | undefined) => {
    setGenFilterCdn(cdn);
    setAutoPortGroupIds(cdn ? [cdn] : null);
  };

  const libraryStatsQuery = trpc.vendor.getLibraryStats.useQuery(
    { poolType: genPoolType },
    { retry: false }
  );
  const availableCdnTypes = (() => {
    const cdnStats = libraryStatsQuery.data?.cdnStats ?? [];
    const siteCdnMatrix = libraryStatsQuery.data?.siteCdnMatrix ?? {};
    if (!genFilterSite) {
      return CDN_TYPES.filter(c => cdnStats.some(s => s.cdnType === c && s.remaining > 0));
    }
    const availableForSite = siteCdnMatrix[genFilterSite] ?? [];
    return CDN_TYPES.filter(c => availableForSite.includes(c));
  })();

  const selectedCategory = genFilterCategories.size === 1 ? Array.from(genFilterCategories)[0] : undefined;
  const stockQuery = trpc.vendor.getCategoryStock.useQuery(
    { vendorId: selectedVendorId ?? undefined, category: selectedCategory, siteType: genFilterSite, cdnType: genFilterCdn, poolType: genPoolType },
    { enabled: genFilterCategories.size === 1, retry: false }
  );
  const stockAvailable = stockQuery.data?.available ?? null;
  useEffect(() => {
    if (stockAvailable !== null && categoryCount > stockAvailable) {
      setCategoryCount(Math.max(1, stockAvailable));
    }
  }, [stockAvailable]);

  const [generatedResults, setGeneratedResults] = useState<GeneratedResult[]>(() => {
    try { return JSON.parse(sessionStorage.getItem('gen_results') || '[]'); } catch { return []; }
  });
  const [hasGenerated, setHasGenerated] = useState(() => sessionStorage.getItem('gen_has_generated') === '1');
  const [usedDomains, setUsedDomains] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem('gen_used_domains') || '[]')); } catch { return new Set(); }
  });
  useEffect(() => {
    if (generatedResults.length > 0) {
      sessionStorage.setItem('gen_results', JSON.stringify(generatedResults));
      sessionStorage.setItem('gen_has_generated', hasGenerated ? '1' : '0');
    }
  }, [generatedResults, hasGenerated]);
  useEffect(() => {
    sessionStorage.setItem('gen_used_domains', JSON.stringify(Array.from(usedDomains)));
  }, [usedDomains]);

  const [detectionDialogOpen, setDetectionDialogOpen] = useState(false);
  const [selectedCheckTool, setSelectedCheckTool] = useState<CheckToolId>('itdog');
  const [lastPortGroupIds, setLastPortGroupIds] = useState<string[]>([]);
  const [lastGenMode, setLastGenMode] = useState<'vendor' | 'manual'>('vendor');

  const generateMut = trpc.vendor.generateUrls.useMutation({
    onSuccess: (data) => {
      const filtered = genFilterCategories.size > 0
        ? (data.results as GeneratedResult[]).filter(r => {
            if (genFilterCategories.has('lite_h5') && r.category === 'h5') return true;
            return genFilterCategories.has(r.category);
          })
        : (data.results as GeneratedResult[]);
      setGeneratedResults(filtered);
      setHasGenerated(true);
      setUsedDomains(new Set());
      if (randomVendor && (data as any).effectiveCdnType) {
        setLastPortGroupIds([(data as any).effectiveCdnType]);
      }
      if (filtered.length === 0) {
        toast.warning('该厂商暂无匹配的域名数据，请检查域名库或过滤条件');
      } else {
        toast.success(`已生成 ${filtered.length} 条域名 URL`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const markUsedMut = trpc.vendor.markDomainUsed.useMutation({
    onError: (e) => toast.error('标记失败: ' + e.message),
  });
  const handleToggleUsed = useCallback((domain: string, currentlyUsed: boolean) => {
    if (!selectedVendorId) return;
    const newUsed = !currentlyUsed;
    setUsedDomains(prev => {
      const next = new Set(prev);
      newUsed ? next.add(domain) : next.delete(domain);
      return next;
    });
    markUsedMut.mutate({ domain, vendorId: selectedVendorId, used: newUsed });
  }, [selectedVendorId, markUsedMut]);

  const availableDomains = generatedResults.map(r => r.domain);
  const allSelected = availableDomains.length > 0 && availableDomains.every(d => usedDomains.has(d));
  const someSelected = availableDomains.some(d => usedDomains.has(d));
  const handleSelectAll = useCallback(() => {
    if (!selectedVendorId) return;
    const shouldSelectAll = !allSelected;
    setUsedDomains(prev => {
      const next = new Set(prev);
      availableDomains.forEach(d => shouldSelectAll ? next.add(d) : next.delete(d));
      return next;
    });
    availableDomains.forEach(domain => {
      const currentlyUsed = usedDomains.has(domain);
      if (currentlyUsed !== shouldSelectAll) {
        markUsedMut.mutate({ domain, vendorId: selectedVendorId, used: shouldSelectAll });
      }
    });
  }, [selectedVendorId, allSelected, availableDomains, usedDomains, markUsedMut]);

  const handleGenerate = useCallback(() => {
    if (genMode === 'manual') {
      const domains = manualGenText.split('\n').map(l => cleanDomain(l)).filter(Boolean);
      if (domains.length === 0) { toast.error('请输入至少一个域名'); return; }
      const selectedPorts = PORT_GROUPS.filter(g => manualPortGroups.has(g.id)).flatMap(g => [...g.ports]);
      const results: GeneratedResult[] = domains.map((domain, i) => {
        const port = selectedPorts[Math.floor(Math.random() * selectedPorts.length)];
        return { category: 'web', categoryLabel: `域名${i + 1}`, domain, url: `https://${domain}:${port}`, port };
      });
      setGeneratedResults(results);
      setHasGenerated(true);
      setUsedDomains(new Set());
      setLastPortGroupIds(Array.from(manualPortGroups));
      setLastGenMode('manual');
      toast.success(`已生成 ${results.length} 条域名 URL`);
      return;
    }
    if (!randomVendor && !selectedVendorId) { toast.error('请先选择厂商'); return; }
    const portGroupIds = autoPortGroupIds ?? PORT_GROUPS.map(g => g.id);
    setLastPortGroupIds(portGroupIds as string[]);
    setLastGenMode('vendor');
    generateMut.mutate({
      vendorId: randomVendor ? (vendors[0]?.id || 0) : (selectedVendorId || 0),
      portGroupIds: portGroupIds as string[],
      randomVendor,
      siteType: genFilterSite,
      cdnType: genFilterCdn,
      categories: Array.from(genFilterCategories),
      categoryCount: genFilterCategories.size === 1 ? Math.max(1, Math.min(categoryCount, 50)) : 1,
      poolType: genPoolType,
    });
  }, [selectedVendorId, randomVendor, vendors, genFilterSite, genFilterCdn, genFilterCategories, categoryCount, genMode, manualGenText, manualPortGroups, autoPortGroupIds, genPoolType]);

  const handleSendToChecker = useCallback(() => {
    if (!generatedResults.length) return;
    sessionStorage.setItem('checker_init_domains', JSON.stringify(generatedResults.map(r => r.url)));
    sessionStorage.setItem('checker_init_tools', selectedCheckTool);
    navigate('/checker');
    toast.success(`已将 ${generatedResults.length} 条 URL 发送到检测页`);
  }, [generatedResults, selectedCheckTool, navigate]);

  const formatText = generatedResults.map(r => `${r.categoryLabel}：${r.url}`).join('\n');
  const copyFormatted = useCallback(async () => {
    try { await navigator.clipboard.writeText(formatText); toast.success('已复制格式化内容'); }
    catch { toast.error('复制失败'); }
  }, [formatText]);

  const hasActiveFilter = genFilterSite || genFilterCdn || genFilterCategories.size > 0 || genPoolType !== 'main';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav activeTab="generator" />
      <section className="container py-6 flex-1">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded border border-primary/20 bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">端口批量生成</h1>
              <p className="text-xs text-muted-foreground">按厂商+端口组生成域名，每类别自动分配一个端口</p>
            </div>
          </div>

          <div className="flex gap-1 p-1 rounded-lg bg-muted">
            {(['vendor', 'manual'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => { setGenMode(mode); setHasGenerated(false); setGeneratedResults([]); }}
                className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${genMode === mode ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {mode === 'vendor' ? '🏢 厂商域名库' : '✏️ 手动输入域名'}
              </button>
            ))}
          </div>

          {genMode === 'manual' && !hasGenerated && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">输入域名列表</p>
              <p className="text-xs text-muted-foreground">每行一个域名，支持 example.com 或 https://example.com 格式</p>
              <Textarea
                placeholder={"example.com\nwww.test.com\nhttps://another.com"}
                value={manualGenText}
                onChange={e => setManualGenText(e.target.value)}
                className="font-mono text-sm h-40 resize-y"
              />
              {manualGenText.trim() && (
                <p className="text-xs text-muted-foreground">
                  已输入 {manualGenText.split('\n').map(l => cleanDomain(l)).filter(Boolean).length} 个域名
                </p>
              )}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">选择端口组</p>
                <div className="flex gap-2 flex-wrap">
                  {PORT_GROUPS.map(g => {
                    const isSelected = manualPortGroups.has(g.id);
                    const colorMap: Record<string, string> = {
                      blue: isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-card text-blue-700 border-blue-300 hover:bg-blue-50',
                      violet: isSelected ? 'bg-violet-600 text-white border-violet-600' : 'bg-card text-violet-700 border-violet-300 hover:bg-violet-50',
                      emerald: isSelected ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-card text-emerald-700 border-emerald-300 hover:bg-emerald-50',
                    };
                    return (
                      <button
                        key={g.id}
                        onClick={() => toggleManualPortGroup(g.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium transition-colors ${colorMap[g.color]}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : g.color === 'blue' ? 'bg-blue-500' : g.color === 'violet' ? 'bg-violet-500' : 'bg-emerald-500'}`} />
                        {g.title}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">已选 {manualPortGroups.size} 个端口组，将从对应端口中随机分配</p>
              </div>
            </div>
          )}

          {genMode === 'vendor' && !hasGenerated && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">域名维度过滤（可不限）</p>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-xs text-muted-foreground">随机厂商</span>
                  <div
                    onClick={() => setRandomVendor(v => !v)}
                    className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${randomVendor ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${randomVendor ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <Shuffle className={`w-3.5 h-3.5 ${randomVendor ? 'text-primary' : 'text-muted-foreground'}`} />
                </label>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Select value={genPoolType} onValueChange={v => {
                  setGenPoolType(v as 'main' | 'seo');
                  setGenFilterCdn(undefined);
                  setAutoPortGroupIds(null);
                }}>
                  <SelectTrigger className="h-8 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">💼 主推域名库</SelectItem>
                    <SelectItem value="seo">🔍 SEO 域名库</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={genFilterSite || '__all__'} onValueChange={v => {
                  setGenFilterSite(v === '__all__' ? undefined : v as SiteType);
                  setGenFilterCdn(undefined);
                  setAutoPortGroupIds(null);
                }}>
                  <SelectTrigger className="h-8 text-xs w-28">
                    <SelectValue placeholder="全部站点" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">全部站点</SelectItem>
                    {SITE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {!randomVendor && (
                  <Select
                    value={selectedVendorId ? String(selectedVendorId) : '__all__'}
                    onValueChange={v => {
                      const vid = v === '__all__' ? null : Number(v);
                      setSelectedVendorId(vid);
                      if (vid) {
                        const vendor = vendors.find(vv => vv.id === vid);
                        if (vendor?.cdnType) {
                          const cdnVal = vendor.cdnType as CdnType;
                          setGenFilterCdn(cdnVal);
                          setAutoPortGroupIds([cdnVal]);
                        } else {
                          setGenFilterCdn(undefined);
                          setAutoPortGroupIds(null);
                        }
                      } else {
                        setGenFilterCdn(undefined);
                        setAutoPortGroupIds(null);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs w-36">
                      <SelectValue placeholder="全部厂商" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">全部厂商</SelectItem>
                      {vendors.map(v => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.name}{v.cdnType ? ` (${v.cdnType.toUpperCase()})` : ' ⚠️'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <CategoryMultiSelect selected={genFilterCategories} onChange={setGenFilterCategories} />
                {genFilterCategories.size === 1 && (() => {
                  const isOverStock = stockAvailable !== null && categoryCount > stockAvailable;
                  const isNoStock = stockAvailable !== null && stockAvailable === 0;
                  return (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">数量</span>
                      <input
                        type="number"
                        min={1}
                        max={stockAvailable !== null ? Math.max(1, stockAvailable) : 50}
                        value={categoryCount}
                        disabled={isNoStock}
                        onChange={e => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v)) {
                            const maxVal = stockAvailable !== null ? Math.max(1, stockAvailable) : 50;
                            setCategoryCount(Math.max(1, Math.min(maxVal, v)));
                          }
                        }}
                        className={`h-8 w-16 text-xs px-2 rounded border text-center focus:outline-none focus:ring-1 ${
                          isNoStock
                            ? 'border-red-300 bg-red-50 text-red-400 cursor-not-allowed'
                            : isOverStock
                            ? 'border-orange-400 bg-orange-50 text-orange-700 focus:ring-orange-400'
                            : 'border-input bg-background text-foreground focus:ring-primary'
                        }`}
                      />
                      {stockAvailable !== null && (
                        <span className={`text-xs ${isNoStock ? 'text-red-500 font-medium' : isOverStock ? 'text-orange-600' : 'text-muted-foreground'}`}>
                          {isNoStock ? '无库存' : `库存 ${stockAvailable}`}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
              {hasActiveFilter && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {genPoolType !== 'main' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">SEO 域名库</span>
                  )}
                  {genFilterSite && (
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">站点: {genFilterSite}</span>
                  )}
                  {genFilterCdn && (
                    <span className="text-xs px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">CDN: {CDN_TYPE_LABELS[genFilterCdn]}</span>
                  )}
                  {autoPortGroupIds && (
                    <span className="text-xs px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                      ✓ 自动匹配端口组: {autoPortGroupIds.map(id => PORT_GROUPS.find(g => g.id === id)?.title).join(', ')}
                    </span>
                  )}
                  {Array.from(genFilterCategories).map(c => (
                    <span key={c} className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      类别: {CATEGORY_LABELS[c]}{c === 'lite_h5' ? '（复用H5）' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {!hasGenerated && (
            <Button
              onClick={handleGenerate}
              disabled={
                generateMut.isPending ||
                (genMode === 'vendor' && !randomVendor && !selectedVendorId) ||
                (genMode === 'manual' && !manualGenText.trim())
              }
              className="w-full h-11 font-semibold gap-2"
            >
              {generateMut.isPending
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />生成中...</>
                : <><Zap className="w-4 h-4" />生成域名 URL</>
              }
            </Button>
          )}

          {hasGenerated && generatedResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">生成结果</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{generatedResults.length} 条</span>
                  {lastGenMode === 'vendor' && randomVendor ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">随机厂商模式</span>
                  ) : lastPortGroupIds.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                      端口组：{lastPortGroupIds.map(id => PORT_GROUPS.find(g => g.id === id)?.title ?? id).join(' + ')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      sessionStorage.removeItem('gen_results');
                      sessionStorage.removeItem('gen_has_generated');
                      sessionStorage.removeItem('gen_used_domains');
                      setHasGenerated(false);
                      setGeneratedResults([]);
                      setUsedDomains(new Set());
                    }}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="w-3 h-3" />重新生成
                  </button>
                  <button
                    onClick={copyFormatted}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-primary hover:bg-primary/90 text-primary-foreground transition-colors font-medium"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />一键复制
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
                <div className="flex items-center gap-1.5 text-xs text-amber-700 min-w-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span>谨慎操作：勾选域名后将被数据库标记为已使用，后续将不会再使用对应域名</span>
                </div>
                {genMode === 'vendor' && availableDomains.length > 0 && (
                  <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0 select-none">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = !allSelected && someSelected; }}
                      onChange={handleSelectAll}
                      className="w-4 h-4 accent-red-500 cursor-pointer"
                    />
                    <span className="text-xs text-amber-700 font-medium whitespace-nowrap">
                      {allSelected ? '取消全选' : '全部标记已使用'}
                    </span>
                  </label>
                )}
              </div>

              <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
                {DOMAIN_CATEGORIES.map(cat => {
                  const r = generatedResults.find(r => r.category === cat);
                  const isUsed = r ? usedDomains.has(r.domain) : false;
                  return (
                    <div key={cat} className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${r ? (isUsed ? 'bg-red-50/60 dark:bg-red-950/20' : 'hover:bg-muted/30') : 'opacity-40 bg-muted/10'}`}>
                      {r ? (
                        <input
                          type="checkbox"
                          checked={isUsed}
                          onChange={() => handleToggleUsed(r.domain, isUsed)}
                          className="w-4 h-4 flex-shrink-0 accent-red-500 cursor-pointer"
                          title={isUsed ? '取消已使用标记' : '标记为已使用'}
                        />
                      ) : <div className="w-4 h-4 flex-shrink-0" />}
                      <span className="text-xs font-medium text-muted-foreground w-20 flex-shrink-0">{CATEGORY_LABELS[cat]}：</span>
                      {r ? (
                        <>
                          <span className={`font-mono text-sm flex-1 truncate ${isUsed ? 'line-through text-red-400 dark:text-red-500' : 'text-foreground'}`}>{r.url}</span>
                          {r.siteType && <span className="text-xs px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700 flex-shrink-0">站:{r.siteType}</span>}
                          {r.cdnType && <span className="text-xs px-1.5 py-0.5 rounded border border-violet-200 bg-violet-50 text-violet-700 flex-shrink-0">CDN:{CDN_TYPE_LABELS[r.cdnType as CdnType] || r.cdnType}</span>}
                          {randomVendor && r.vendorId && (() => { const v = vendors.find(vv => vv.id === r.vendorId); return v ? <span className="text-xs px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 flex-shrink-0">{v.name}</span> : null; })()}
                          {isUsed && <span className="text-xs text-red-500 font-medium flex-shrink-0">已使用</span>}
                          {!isUsed && <CopyBtn text={r.url} />}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground italic flex-1">
                          {genMode === 'vendor' && genFilterCdn
                            ? `该类别暂无 ${CDN_TYPE_LABELS[genFilterCdn]} 域名`
                            : genMode === 'vendor' && autoPortGroupIds && autoPortGroupIds.length > 0
                            ? '该类别暂无匹配域名'
                            : '未配置域名'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="rounded border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">格式化复制内容预览</p>
                  <CopyBtn text={formatText} />
                </div>
                <pre className="text-xs text-foreground font-mono whitespace-pre-wrap leading-relaxed">{formatText}</pre>
              </div>

              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <p className="text-xs font-semibold text-foreground">选择检测工具</p>
                <div className="grid grid-cols-4 gap-2">
                  {CHECK_TOOLS.map(tool => (
                    <button
                      key={tool.id}
                      onClick={() => setSelectedCheckTool(tool.id)}
                      className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded border-2 text-xs font-medium transition-all ${selectedCheckTool === tool.id ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'}`}
                    >
                      <span className="text-base leading-none">{tool.icon}</span>
                      <span>{tool.label}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="gap-2 h-10" onClick={() => setDetectionDialogOpen(true)}>
                    检测完毕，查看结果
                  </Button>
                  <Button className="gap-2 h-10" onClick={handleSendToChecker}>
                    <ArrowRight className="w-4 h-4" />
                    前往检测（{CHECK_TOOLS.find(t => t.id === selectedCheckTool)?.label}）
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <DetectionCompleteDialog
        open={detectionDialogOpen}
        onClose={() => setDetectionDialogOpen(false)}
        results={generatedResults}
      />
    </div>
  );
}
