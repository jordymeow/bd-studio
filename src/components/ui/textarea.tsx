import * as React from 'react';
import { cn } from '../../lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full bg-transparent border border-border rounded-md px-3 py-1.5 text-sm text-text resize-none',
      'placeholder:text-text-muted/50',
      'focus:outline-none focus:ring-1 focus:ring-text/20 focus:border-text/30',
      'transition-colors',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
