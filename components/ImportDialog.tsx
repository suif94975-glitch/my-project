/**
 * 域名导入弹窗（统一版）
 * 合并原有「导入域名」和「三维度上传」两个弹窗
 * 支持：手动输入 + Excel 导入；可选站点/CDN/分类三维度
 */
import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DOMAIN_CATEGORIES, CATEGORY_LABELS, SEO_CATEGORIES, SEO_CATEGORY_LABELS,
  SITE_TYPES, CDN_TYPES, CDN_TYPE_LABELS,
  cleanDomain, type DomainCategory, type SiteType, type CdnType,
} from '@/lib/domainConstants';

interface DomainEntry {
  domain: string;
  category: DomainCategory;
  siteType?: SiteType;
  cdnType?: CdnType;
  valid: boolean;
  error?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  vendorId: number;
  vendorName: string;
  vendorCdnType?: CdnType | null; // 厂商绑定的 CDN 类型，若有则自动填充并锁定
  onSuccess: () => void;
  showResetCooldown?: boolean; // 是否显示「自动重置冷却状态」复选框
  poolType?: 'main' | 'seo'; // 域名库类型，默认 main
}

// Excel 模板下载（含三维度列）
async function downloadExcelTemplate(vendorName: string, poolType: 'main' | 'seo' = 'main') {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const isSeo = poolType === 'seo';
  const categories = isSeo ? SEO_CATEGORIES : DOMAIN_CATEGORIES;
  const labels = isSeo ? SEO_CATEGORY_LABELS : CATEGORY_LABELS;
  for (const cat of categories) {
    const label = (labels as Record<string, string>)[cat];
    const exampleRows = SITE_TYPES.flatMap(site =>
      CDN_TYPES.map(cdn => [
        `example-${cat}-${site.toLowerCase()}-${cdn}.com`,
        label, site, CDN_TYPE_LABELS[cdn],
      ])
    ).slice(0, 5);
    const ws = XLSX.utils.aoa_to_sheet([['域名', '分类', '站点', 'CDN'], ...exampleRows]);
    ws['!cols'] = [{ wch: 40 }, { wch: isSeo ? 20 : 16 }, { wch: 8 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, label);
  }
  const infoWs = XLSX.utils.aoa_to_sheet([
    ['字段说明'],
    ['域名', '必填，纯域名格式（如 example.com），不含 https://'],
    ['分类', `必填，可选值：${categories.map(c => (labels as Record<string, string>)[c]).join('、')}`],
    ['站点', `可选，可选值：${SITE_TYPES.join('、')}`],
    ['CDN', `可选，可选值：${Object.values(CDN_TYPE_LABELS).join('、')}`],
    [],
    ['厂商', vendorName],
    ['生成时间', new Date().toLocaleString('zh-CN')],
  ]);
  infoWs['!cols'] = [{ wch: 12 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, infoWs, '说明');
  const prefix = isSeo ? 'SEO域名导入模板' : '域名导入模板';
  XLSX.writeFile(wb, `${prefix}_${vendorName || '厂商'}.xlsx`);
}

// Excel 解析预览列表
function ExcelPreview({ items }: { items: DomainEntry[] }) {
  const valid = items.filter(d => d.valid);
  const invalid = items.filter(d => !d.valid);
  return (
    <div className="space-y-2">
      <div className="rounded border border-border overflow-hidden">
        <div className="px-3 py-2 bg-muted/50 border-b border-border">
          <span className="text-xs font-medium text-emerald-700">✓ 有效域名：{valid.length} 条</span>
        </div>
        <div className="max-h-36 overflow-y-auto divide-y divide-border">
          {valid.slice(0, 50).map((item, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              <span className="font-mono flex-1 truncate">{item.domain}</span>
              <span className="text-muted-foreground shrink-0">{CATEGORY_LABELS[item.category]}</span>
              {item.siteType && <span className="text-blue-600 shrink-0">{item.siteType}</span>}
              {item.cdnType && <span className="text-violet-600 shrink-0">{CDN_TYPE_LABELS[item.cdnType]}</span>}
            </div>
          ))}
          {valid.length > 50 && (
            <div className="px-3 py-1.5 text-xs text-muted-foreground text-center">还有 {valid.length - 50} 条...</div>
          )}
        </div>
      </div>
      {invalid.length > 0 && (
        <div className="rounded border border-red-200 overflow-hidden">
          <div className="px-3 py-2 bg-red-50 border-b border-red-200">
            <span className="text-xs font-medium text-red-600">✗ 无效域名：{invalid.length} 条（将被跳过）</span>
          </div>
          <div className="max-h-36 overflow-y-auto divide-y divide-red-100">
            {invalid.map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs bg-red-50/40">
                <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                <span className="font-mono flex-1 truncate text-red-700">{item.domain}</span>
                <span className="text-red-500 shrink-0 font-medium">{CATEGORY_LABELS[item.category]}</span>
                {item.siteType && <span className="text-red-400 shrink-0">{item.siteType}</span>}
                {item.cdnType && <span className="text-red-400 shrink-0">{CDN_TYPE_LABELS[item.cdnType]}</span>}
                {item.error && <span className="text-red-400 shrink-0 text-[10px]">{item.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ImportDialog({ open, onClose, vendorId, vendorName, vendorCdnType, onSuccess, showResetCooldown, poolType }: Props) {
  const [tab, setTab] = useState<'manual' | 'excel'>('manual');
  const [resetCooldown, setResetCooldown] = useState(false);

  // 手动模式状态
  const [selectedSite, setSelectedSite] = useState<SiteType | ''>('');
  // CDN 初始化：如果厂商绑定了 CDN 类型，自动填充
  const [selectedCdn, setSelectedCdn] = useState<CdnType | ''>(vendorCdnType ?? '');
  const [selectedCategory, setSelectedCategory] = useState<DomainCategory>('web');
  const [manualText, setManualText] = useState('');

  // Excel 模式状态
  const [excelPreview, setExcelPreview] = useState<DomainEntry[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMut = trpc.vendor.importDomains.useMutation({
    onSuccess: (data) => {
      const poolLabel = (data as any).poolType === 'seo' ? 'SEO域名库' : '主推域名库';
      const parts = [`已导入至「${poolLabel}」：${data.inserted} 条`];
      if (data.skipped > 0) parts.push(`跳过重复 ${data.skipped} 条`);
      if ((data as any).mismatchRejected > 0) parts.push(`拒绝 CDN 不匹配 ${(data as any).mismatchRejected} 条`);
      toast.success(parts.join('，'));
      // SEO 库导入时，如果有与主推库重复的域名，展示警告
      const crossDups = (data as any).crossPoolDuplicates as string[] | undefined;
      if (crossDups && crossDups.length > 0) {
        const examples = crossDups.slice(0, 3).join('、');
        toast.warning(
          `警告：${crossDups.length} 个域名已存在于主推库（${examples}${crossDups.length > 3 ? '等' : ''}），已导入至 SEO 库，请确认是否有误。`,
          { duration: 8000 }
        );
      }
      onSuccess();
      onClose();
      setManualText('');
      setExcelPreview([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const parseExcelMut = trpc.vendor.parseExcel.useMutation({
    onSuccess: (data) => {
      setExcelPreview(data as DomainEntry[]);
      const valid = data.filter(d => d.valid).length;
      toast.info(`解析完成：${valid} 条有效，${data.length - valid} 条无效`);
    },
    onError: (e) => toast.error(`解析失败：${e.message}`),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const base64 = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
    parseExcelMut.mutate({ fileBase64: base64, vendorId });
  };

  const handleManualImport = () => {
    const lines = manualText.split('\n').map(l => cleanDomain(l)).filter(Boolean);
    if (lines.length === 0) { toast.error('请输入至少一个域名'); return; }
    // 如果厂商绑定了 CDN，使用厂商 CDN；否则使用用户选择的 CDN
    const effectiveCdn = vendorCdnType ?? selectedCdn;
    // CDN 类型未填写时给出警告（不阻止导入）
    if (!effectiveCdn) {
      toast.warning(`注意：未选择 CDN 类型，${lines.length} 条域名将无法匹配端口组，建议先选择 CDN 类型再导入。`, { duration: 5000 });
    }
    importMut.mutate({
      vendorId,
      domains: lines.map(domain => ({
        domain,
        category: selectedCategory,
        siteType: selectedSite || undefined,
        cdnType: effectiveCdn || undefined,
      })),
      resetCooldown: showResetCooldown ? resetCooldown : false,
      poolType: poolType ?? 'main',
    });
  };

  const handleExcelImport = () => {
    const valid = excelPreview.filter(d => d.valid);
    if (valid.length === 0) { toast.error('没有有效的域名可导入'); return; }
    // 如果厂商绑定了 CDN，自动为无 CDN 的域名填充厂商 CDN
    const domainsToImport = vendorCdnType
      ? valid.map(d => ({ ...d, cdnType: d.cdnType ?? vendorCdnType }))
      : valid;
    // 统计无 CDN 类型的有效条目，给出警告
    const noCdnCount = domainsToImport.filter(d => !d.cdnType).length;
    if (noCdnCount > 0) {
      const examples = domainsToImport.filter(d => !d.cdnType).slice(0, 3).map(d => d.domain).join('、');
      toast.warning(
        `注意：${noCdnCount} 条域名未填写 CDN 类型（如：${examples}${noCdnCount > 3 ? '等' : ''}），这些域名将无法匹配端口组。建议在 Excel 中填写 CDN 列再导入。`,
        { duration: 6000 }
      );
    }
    importMut.mutate({ vendorId, domains: domainsToImport, resetCooldown: showResetCooldown ? resetCooldown : false, poolType: poolType ?? 'main' });
  };

  const manualCount = manualText.split('\n').map(l => cleanDomain(l)).filter(Boolean).length;
  const validExcelCount = excelPreview.filter(d => d.valid).length;

  const TABS = [
    { id: 'manual' as const, label: '手动输入', icon: <Upload className="w-3.5 h-3.5" /> },
    { id: 'excel' as const, label: 'Excel 导入', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>导入域名 — {vendorName}</DialogTitle>
        </DialogHeader>

        {/* Tab 切换 */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors ${tab === t.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {tab === 'manual' ? (
          <div className="space-y-4">
            {/* 三维度选择器 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">站点类型</label>
                <Select value={selectedSite || '__none__'} onValueChange={v => setSelectedSite(v === '__none__' ? '' : v as SiteType)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="不限站点" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">不限站点</SelectItem>
                    {SITE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">CDN 类型</label>
                {vendorCdnType ? (
                  <div className="h-8 flex items-center px-3 rounded border border-purple-300 bg-purple-50 gap-2">
                    <span className="text-xs font-medium text-purple-700">{CDN_TYPE_LABELS[vendorCdnType]}</span>
                    <span className="text-xs text-purple-500">厂商绑定</span>
                  </div>
                ) : (
                  <Select value={selectedCdn || '__none__'} onValueChange={v => setSelectedCdn(v === '__none__' ? '' : v as CdnType)}>
                    <SelectTrigger className={`h-8 text-xs ${!selectedCdn ? 'border-amber-400 ring-1 ring-amber-200' : ''}`}>
                      <SelectValue placeholder="不限 CDN" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">不限 CDN</SelectItem>
                      {CDN_TYPES.map(c => <SelectItem key={c} value={c}>{CDN_TYPE_LABELS[c]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {!vendorCdnType && !selectedCdn && (
                  <p className="text-xs text-amber-600">建议选择，否则无法匹配端口</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">域名分类</label>
                <Select value={selectedCategory} onValueChange={v => setSelectedCategory(v as DomainCategory)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOMAIN_CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 当前标签预览 */}
            <div className="flex items-center gap-2 px-3 py-2 rounded bg-muted/50 border border-border flex-wrap">
              <span className="text-xs text-muted-foreground">当前标签：</span>
              {selectedSite
                ? <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">{selectedSite}</span>
                : <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">不限站点</span>
              }
              {selectedCdn
                ? <span className="text-xs px-2 py-0.5 rounded bg-violet-100 text-violet-700 border border-violet-200">{CDN_TYPE_LABELS[selectedCdn as CdnType]}</span>
                : <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">不限CDN</span>
              }
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">{CATEGORY_LABELS[selectedCategory]}</span>
            </div>

            {/* 域名输入 */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">域名列表（每行一个）</label>
              <Textarea
                placeholder={'example.com\nwww.site.net'}
                value={manualText}
                onChange={e => setManualText(e.target.value)}
                className="font-mono text-sm min-h-[120px] resize-y"
              />
              <p className="text-xs text-muted-foreground">
                {manualCount} 条域名，将标记为「{CATEGORY_LABELS[selectedCategory]}」
                {selectedSite ? `、站点「${selectedSite}」` : ''}
                {selectedCdn ? `、CDN「${CDN_TYPE_LABELS[selectedCdn as CdnType]}」` : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => downloadExcelTemplate(vendorName, poolType ?? 'main')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <Download className="w-4 h-4" />
              下载 Excel 导入模板（域名/分类/站点/CDN）
            </button>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-6 rounded border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {excelFileName || '点击上传 .xlsx 文件'}
              </p>
              {parseExcelMut.isPending && <p className="text-xs text-primary">解析中...</p>}
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
            {excelPreview.length > 0 && <ExcelPreview items={excelPreview} />}
          </div>
        )}

        {/* 自动重置冷却状态复选框（可选显示） */}
        {showResetCooldown && (
          <div className="flex items-start gap-2 px-1 py-2 rounded bg-amber-50 border border-amber-200">
            <input
              type="checkbox"
              id="reset-cooldown-cb"
              checked={resetCooldown}
              onChange={e => setResetCooldown(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-border accent-amber-500 cursor-pointer"
            />
            <label htmlFor="reset-cooldown-cb" className="text-xs text-amber-800 cursor-pointer leading-relaxed">
              <span className="font-semibold flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                导入后自动重置冷却状态
              </span>
              勾选后，导入完成将清除该厂商的小库存告警冷却记录，使下次小库存告警可立即触发
            </label>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">取消</Button>
          <Button
            onClick={tab === 'manual' ? handleManualImport : handleExcelImport}
            disabled={importMut.isPending || (tab === 'manual' ? manualCount === 0 : validExcelCount === 0)}
            className="flex-1"
          >
            {importMut.isPending ? '导入中...' : `导入 ${tab === 'manual' ? manualCount : validExcelCount} 条`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
