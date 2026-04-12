import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface TabDef {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

/**
 * Minimal controlled tab header. The parent owns `active` state so it can
 * decide whether to conditionally render tab bodies or keep them mounted.
 */
export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn('flex items-center gap-1 border-b border-border', className)}
    >
      {tabs.map(t => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm transition-colors -mb-px border-b-2',
              isActive
                ? 'text-text border-accent'
                : 'text-text-muted border-transparent hover:text-text',
            )}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
