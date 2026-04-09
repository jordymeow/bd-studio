import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'rounded-md font-medium transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-text/20',
  {
    variants: {
      variant: {
        default: 'bg-text text-bg hover:bg-text/90',
        secondary: 'bg-surface-light text-text hover:bg-border',
        outline: 'border border-border text-text hover:bg-surface-light',
        ghost: 'text-text-muted hover:text-text hover:bg-surface-light',
        danger: 'text-danger hover:bg-danger/10',
        link: 'text-text-muted hover:text-text underline-offset-4 hover:underline',
        accent: 'bg-accent text-bg hover:bg-accent-hover',
      },
      size: {
        default: 'h-8 px-3 text-sm',
        sm: 'h-7 px-2.5 text-xs',
        lg: 'h-9 px-4 text-sm',
        icon: 'h-8 w-8 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
export type { ButtonProps };
