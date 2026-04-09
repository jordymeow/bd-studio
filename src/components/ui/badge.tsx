import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-accent/15 text-accent',
        warning: 'bg-warning/15 text-warning',
        danger: 'bg-danger/15 text-danger',
        success: 'bg-success/15 text-success',
        muted: 'bg-surface-light text-text-muted',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
export type { BadgeProps };
