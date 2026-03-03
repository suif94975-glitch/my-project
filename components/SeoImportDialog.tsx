/**
 * SEO 域名上传弹窗
 * 特性：
 * - 支持两种模式：
 *   1. 站点卡片模式（siteType 已指定）：直接显示各分类输入框
 *   2. 全局模式（siteType 为 null）：先选择站点，再输入各分类域名
 * - SEO 专用 6 类分类：WEB/H5/全站/体育/福建敏感区域名WEB/福建敏感区域名H5
 * - 每个输入框只允许输入一条域名（自动过滤空格和非域名字符）
 * - 通过域名中的端口号自动判断 CDN 类型（无需手动选择）
 * - 无需选择域名分类（每个分类有独立输入框）
 */
import { useState, useCallback } from 'react';
import { Upload, CheckCircle2, AlertCircle, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  SEO_CATEGORIES, SEO_CATEGORY_LABELS, SITE_TYPES, PORT_GROUPS,
  type SeoDomainCategory, type SiteType,
} from '@/lib/domainConstants';

// 从域名字符串中提取端口号
function extractPort(raw: string): number | undefined {
  const match = raw.match(/:(\d{2,5})(?:\/|$)/);
  if (match) {
    const port = parseInt(match[1], 10);
    if (port >= 1 && port <= 65535) return port;
  }
  return undefined;
}

// 通过端口号判断 CDN 类型
function detectCdnFromPort(port: number | undefined): string | null {
  if (!port) return null;
  for (const group of PORT_GROUPS) {
    if ((group.ports as unknown as number[]).includes(port)) {
      return group.title;
    }
  }
  return null;
}

// 清理域名输入：去掉空格、中文字符等，只保留合法域名字符
function cleanDomainInput(raw: string): string {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/[\u4e00-\u9fa5]/g, '');
  cleaned = cleaned.replace(/\s+/g, '');
  return cleaned;
}

// 验证域名格式（允许带端口）
function isValidDomainInput(value: string): boolean {
  if (!value) return false;
  const withoutProtocol = value.replace(/^https?:\/\//i, '');
  return /^[a-zA-Z0-9][a-zA-Z0-9\-_.]*\.[a-zA-Z]{2,}(:\d{2,5})?$/.test(withoutProtocol);
}

interface CategoryInput {
  value: string;
  error: string | null;
  cdnDetected: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  siteType: SiteType | null;
  onSuccess: () => void;
}

export default function SeoImportDialog({ open, onClose, siteType: propSiteType, onSuccess }: Props) {
  // 当 propSiteType 为 null 时，用户需要在弹窗内选择站点
  const [selectedSiteType, setSelectedSiteType] = useState<SiteType | ''>(propSiteType ?? '');

  // 实际使用的站点类型
  const effectiveSiteType = propSiteType ?? (selectedSiteType || null);

  // 每个 SEO 分类对应一个输入框状态
  const [inputs, setInputs] = useState<Record<SeoDomainCategory, CategoryInput>>(() => {
    const init: Partial<Record<SeoDomainCategory, CategoryInput>> = {};
    for (const cat of SEO_CATEGORIES) {
      init[cat] = { value: '', error: null, cdnDetected: null };
    }
    return init as Record<SeoDomainCategory, CategoryInput>;
  });
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<Array<{ category: SeoDomainCategory; success: boolean; message: string }>>([]);
  const [submitted, setSubmitted] = useState(false);

  const utils = trpc.useUtils();
  const addMutation = trpc.seo.addSeoDomain.useMutation();

  const handleInputChange = useCallback((category: SeoDomainCategory, raw: string) => {
    const cleaned = cleanDomainInput(raw);
    const port = extractPort(cleaned);
    const cdnDetected = detectCdnFromPort(port);
    setInputs(prev => ({
      ...prev,
      [category]: {
        value: cleaned,
        error: null,
        cdnDetected,
      },
    }));
  }, []);

  const handleSubmit = async () => {
    if (!effectiveSiteType) {
      toast.error('请先选择站点');
      return;
    }

    const toSubmit: Array<{ category: SeoDomainCategory; domain: string; port?: number }> = [];
    const newInputs = { ...inputs };
    let hasError = false;

    for (const cat of SEO_CATEGORIES) {
      const input = inputs[cat];
      if (!input.value) continue;
      if (!isValidDomainInput(input.value)) {
        newInputs[cat] = { ...input, error: '域名格式不正确，例如：example.com 或 example.com:8443' };
        hasError = true;
        continue;
      }
      const port = extractPort(input.value);
      toSubmit.push({ category: cat, domain: input.value, port });
    }

    if (hasError) {
      setInputs(newInputs);
      return;
    }

    if (toSubmit.length === 0) {
      toast.error('请至少输入一个域名');
      return;
    }

    setSubmitting(true);
    const resultList: Array<{ category: SeoDomainCategory; success: boolean; message: string }> = [];

    for (const item of toSubmit) {
      try {
        const res = await addMutation.mutateAsync({
          domain: item.domain,
          category: item.category,
          siteType: effectiveSiteType,
          port: item.port,
        });
        const cdnLabel = res.cdnType ? `（CDN: ${res.cdnType}）` : '';
        resultList.push({
          category: item.category,
          success: true,
          message: `${SEO_CATEGORY_LABELS[item.category]} 上传成功${cdnLabel}`,
        });
      } catch (err: any) {
        resultList.push({
          category: item.category,
          success: false,
          message: `${SEO_CATEGORY_LABELS[item.category]} 失败：${err.message}`,
        });
      }
    }

    setSubmitting(false);
    setResults(resultList);
    setSubmitted(true);

    const successCount = resultList.filter(r => r.success).length;
    if (successCount > 0) {
      utils.seo.getNavData.invalidate();
      onSuccess();
    }
  };

  const handleClose = () => {
    setInputs(() => {
      const init: Partial<Record<SeoDomainCategory, CategoryInput>> = {};
      for (const cat of SEO_CATEGORIES) {
        init[cat] = { value: '', error: null, cdnDetected: null };
      }
      return init as Record<SeoDomainCategory, CategoryInput>;
    });
    setResults([]);
    setSubmitted(false);
    if (!propSiteType) setSelectedSiteType('');
    onClose();
  };

  const filledCount = SEO_CATEGORIES.filter(cat => inputs[cat].value).length;

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            上传 SEO 域名{effectiveSiteType ? ` — ${effectiveSiteType}` : ''}
          </DialogTitle>
          <DialogDescription>
            每个分类单独输入一条域名，系统将通过端口号自动识别 CDN 类型
          </DialogDescription>
        </DialogHeader>

        {!submitted ? (
          <div className="space-y-3 py-1">
            {/* 全局模式：显示站点选择 */}
            {!propSiteType && (
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">
                  选择站点 <span className="text-red-500">*</span>
                </label>
                <Select
                  value={selectedSiteType}
                  onValueChange={(v) => setSelectedSiteType(v as SiteType)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="请选择站点..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SITE_TYPES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 分类输入框（全局模式下需先选站点） */}
            {(propSiteType || selectedSiteType) && SEO_CATEGORIES.map(cat => {
              const input = inputs[cat];
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-foreground">
                      {SEO_CATEGORY_LABELS[cat]}
                    </label>
                    {input.cdnDetected && (
                      <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                        CDN: {input.cdnDetected}
                      </span>
                    )}
                  </div>
                  <Input
                    value={input.value}
                    onChange={e => handleInputChange(cat, e.target.value)}
                    placeholder={`例如：example.com:8443`}
                    className={`h-8 text-sm font-mono ${input.error ? 'border-red-400 focus:border-red-400' : ''}`}
                    disabled={submitting}
                  />
                  {input.error && (
                    <p className="text-xs text-red-500 mt-0.5">{input.error}</p>
                  )}
                </div>
              );
            })}

            {/* 全局模式下未选站点时的提示 */}
            {!propSiteType && !selectedSiteType && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                请先选择站点，然后为各分类输入域名
              </p>
            )}

            {(propSiteType || selectedSiteType) && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                提示：输入框自动过滤空格和中文字符；域名中包含端口号时（如 example.com:8443），系统将自动识别 CDN 类型
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 py-1">
            <p className="text-sm font-medium text-foreground mb-3">上传结果</p>
            {results.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 px-3 py-2 rounded text-sm ${
                  r.success
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {r.success ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <span>{r.message}</span>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose}>
            {submitted ? '关闭' : '取消'}
          </Button>
          {!submitted && (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || filledCount === 0 || !effectiveSiteType}
              className="gap-1.5"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  上传 {filledCount > 0 ? `(${filledCount})` : ''}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
