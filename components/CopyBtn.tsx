import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyBtnProps {
  text: string;
  className?: string;
}

export default function CopyBtn({ text, className = '' }: CopyBtnProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`flex-shrink-0 p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors ${className}`}
      title="复制"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-green-500" />
        : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}
