import { forwardRef } from 'react';
import { cn } from '../lib/utils';

/**
 * Visual representation of a French BD album page (21.5 × 29.3 cm).
 * Two variants: small thumbnail with truncated notes, or full editable page.
 *
 * Uses the theme's surface colors so the page reads as a "card" in whichever
 * color scheme is active — no jarring white-on-dark contrast.
 */

interface BaseProps {
  order: number;
  notes: string;
  className?: string;
}

interface ThumbProps extends BaseProps {
  variant: 'thumb';
  href?: string;
  onClick?: () => void;
}

interface FullProps extends BaseProps {
  variant: 'full';
  onChange: (notes: string) => void;
  autoFocus?: boolean;
}

type Props = ThumbProps | FullProps;

const PAGE_STYLE: React.CSSProperties = {
  aspectRatio: '21.5 / 29.3',
};

export const BdPage = forwardRef<HTMLDivElement, Props>(function BdPage(props, ref) {
  if (props.variant === 'thumb') {
    const { order, notes, className, href, onClick } = props;
    const inner = (
      <div
        ref={ref}
        style={PAGE_STYLE}
        className={cn(
          'relative bg-surface-light text-text rounded-sm border border-border shadow-md',
          'hover:shadow-lg hover:-translate-y-0.5 hover:border-text/20 transition-all cursor-pointer overflow-hidden',
          className,
        )}
      >
        <div className="absolute inset-0 p-3 flex flex-col">
          <p className="text-[10px] text-text/80 leading-snug whitespace-pre-wrap flex-1 overflow-hidden">
            {notes || <span className="italic text-text-muted">empty page</span>}
          </p>
          <div className="mt-2 pt-1.5 border-t border-border flex items-center justify-between text-[9px] text-text-muted">
            <span>page</span>
            <span className="font-mono">{order}</span>
          </div>
        </div>
      </div>
    );
    if (href) {
      return (
        <a href={href} className="block">
          {inner}
        </a>
      );
    }
    if (onClick) {
      return (
        <button onClick={onClick} className="block w-full text-left">
          {inner}
        </button>
      );
    }
    return inner;
  }

  // Full variant — editable
  const { order, notes, className, onChange, autoFocus } = props;
  return (
    <div
      ref={ref}
      style={PAGE_STYLE}
      className={cn(
        'relative bg-surface-light text-text rounded-sm border border-border shadow-2xl mx-auto',
        className,
      )}
    >
      <textarea
        value={notes}
        onChange={e => onChange(e.target.value)}
        autoFocus={autoFocus}
        placeholder="Write your ideas for this page…"
        className={cn(
          'absolute inset-0 w-full h-full bg-transparent resize-none focus:outline-none',
          'p-8 pb-14 text-sm leading-relaxed text-text placeholder:text-text-muted/60',
        )}
      />
      <div className="absolute bottom-3 left-0 right-0 px-8 flex items-center justify-between text-xs text-text-muted pointer-events-none">
        <span>21.5 × 29.3 cm</span>
        <span className="font-mono">page {order}</span>
      </div>
    </div>
  );
});
