import { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { cn } from '../../lib/utils';

interface Props {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [open]);

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="block w-6 h-6 rounded border border-border cursor-pointer hover:scale-110 transition-transform"
        style={{ backgroundColor: value }}
        title="Pick color"
      />
      {open && (
        <div className="absolute z-50 top-full mt-2 right-0 bg-surface border border-border rounded-lg shadow-xl p-3">
          <HexColorPicker color={value} onChange={onChange} />
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-text-muted">#</span>
            <input
              type="text"
              value={value.replace('#', '')}
              onChange={e => {
                const val = e.target.value.replace('#', '');
                if (/^[0-9a-f]{0,6}$/i.test(val)) {
                  onChange('#' + val);
                }
              }}
              className="flex-1 bg-bg border border-border rounded px-2 py-1 text-xs text-text font-mono focus:outline-none focus:border-text/30"
              maxLength={6}
            />
          </div>
        </div>
      )}
    </div>
  );
}
