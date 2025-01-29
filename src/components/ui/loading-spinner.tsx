import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  className?: string;
  variant?: 'default' | 'primary' | 'secondary';
}

const sizeStyles = {
  sm: "h-3 w-3 text-xs",
  md: "h-4 w-4 text-sm",
  lg: "h-6 w-6 text-base"
} as const;

const variantStyles = {
  default: "text-muted-foreground",
  primary: "text-primary",
  secondary: "text-secondary"
} as const;

const InlineSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ text, size = 'md', variant = 'default', className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      <Loader2 className={cn(
        "animate-spin",
        sizeStyles[size],
        variantStyles[variant]
      )} />
      {text && (
        <span className={cn(
          "text-muted-foreground",
          {
            'text-xs': size === 'sm',
            'text-sm': size === 'md',
            'text-base': size === 'lg'
          }
        )}>
          {text}
        </span>
      )}
    </div>
  )
);

const FullScreenSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ text, size = 'lg', variant = 'default', className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "fixed inset-0 bg-background/80 backdrop-blur-sm",
        "flex flex-col items-center justify-center",
        className
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 className={cn(
          "animate-spin",
          sizeStyles[size],
          variantStyles[variant]
        )} />
        {text && (
          <span className={cn(
            "font-medium",
            {
              'text-sm': size === 'sm',
              'text-base': size === 'md',
              'text-lg': size === 'lg'
            }
          )}>
            {text}
          </span>
        )}
      </div>
    </div>
  )
);

export const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ text, size = 'md', fullScreen = false, className, variant = 'default', ...props }, ref) => {
    const Component = fullScreen ? FullScreenSpinner : InlineSpinner;
    return (
      <Component
        ref={ref}
        text={text}
        size={size}
        variant={variant}
        className={className}
        {...props}
      />
    );
  }
);

InlineSpinner.displayName = "InlineSpinner";
FullScreenSpinner.displayName = "FullScreenSpinner";
LoadingSpinner.displayName = "LoadingSpinner";

export default LoadingSpinner;