import { useCallback } from 'react';
import { CheckCircle2, ClipboardList, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { DOMAIN_CATEGORIES, CATEGORY_LABELS, type DomainCategory } from '@/lib/domainConstants';
import { useState } from 'react';

interface GeneratedResult {
  category: DomainCategory;
  categoryLabel: string;
  domain: string;
  port: number;
  url: string;
}

function CopyBtnInline({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error('复制失败'); }
  }, [text]);
  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
      title="复制"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

interface DetectionCompleteDialogProps {
  open: boolean;
  onClose: () => void;
  results: GeneratedResult[];
}

export default function DetectionCompleteDialog({ open, onClose, results }: DetectionCompleteDialogProps) {
  const formatText = results.map(r => `${r.categoryLabel}：${r.url}`).join('\n');
  const copyAll = useCallback(async () => {
    try { await navigator.clipboard.writeText(formatText); toast.success('已复制格式化内容'); }
    catch { toast.error('复制失败'); }
  }, [formatText]);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            域名已检测完毕
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">对应域名组已生成，可直接复制使用：</p>
          <div className="rounded border border-border overflow-hidden divide-y divide-border">
            {DOMAIN_CATEGORIES.map(cat => {
              const r = results.find(r => r.category === cat);
              return (
                <div key={cat} className={`flex items-center gap-2 px-3 py-2 ${r ? '' : 'opacity-40'}`}>
                  <span className="text-xs font-medium text-muted-foreground w-20 flex-shrink-0">{CATEGORY_LABELS[cat]}：</span>
                  {r ? (
                    <>
                      <span className="font-mono text-xs text-foreground flex-1 truncate">{r.url}</span>
                      <CopyBtnInline text={r.url} />
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">未配置</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">关闭</Button>
          <Button onClick={copyAll} className="flex-1 gap-2">
            <ClipboardList className="w-4 h-4" />一键复制全部
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
