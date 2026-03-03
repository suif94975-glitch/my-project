import { useState, useRef } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  DOMAIN_CATEGORIES, CATEGORY_LABELS,
  type DomainCategory,
} from '@/lib/domainConstants';

interface CategoryMultiSelectProps {
  selected: Set<DomainCategory>;
  onChange: (next: Set<DomainCategory>) => void;
}

export default function CategoryMultiSelect({ selected, onChange }: CategoryMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const label = selected.size === 0
    ? '全部类别'
    : selected.size === 1
      ? CATEGORY_LABELS[Array.from(selected)[0]]
      : `已选 ${selected.size} 类`;

  const toggle = (c: DomainCategory) => {
    const next = new Set(selected);
    next.has(c) ? next.delete(c) : next.add(c);
    onChange(next);
  };

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const dropdownHeight = Math.min(DOMAIN_CATEGORIES.length + 1, 10) * 32 + 8;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow >= dropdownHeight
        ? rect.bottom + 4
        : rect.top - dropdownHeight - 4;
      setDropPos({ top, left: rect.left, width: Math.max(rect.width, 160) });
    }
    setOpen(v => !v);
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className={`h-8 text-xs px-3 rounded border flex items-center gap-1.5 min-w-[120px] justify-between transition-colors ${
          selected.size > 0
            ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
            : 'border-input bg-background text-foreground hover:bg-muted'
        }`}
      >
        <span>{label}</span>
        <ChevronDown className="w-3 h-3 flex-shrink-0" />
      </button>
      {open && dropPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 bg-popover border border-border rounded-md shadow-lg py-1 overflow-y-auto"
            style={{ top: dropPos.top, left: dropPos.left, minWidth: dropPos.width, maxHeight: 320 }}
          >
            <button
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2"
              onClick={() => { onChange(new Set()); setOpen(false); }}
            >
              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${selected.size === 0 ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                {selected.size === 0 && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
              </span>
              全部类别
            </button>
            {DOMAIN_CATEGORIES.map(c => (
              <button
                key={c}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2"
                onClick={() => toggle(c)}
              >
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${selected.has(c) ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                  {selected.has(c) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                </span>
                {CATEGORY_LABELS[c]}{c === 'lite_h5' ? '（复用H5）' : ''}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
