
import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RedButtonProps extends ButtonProps {
  children: React.ReactNode;
}

const RedButton = React.forwardRef<HTMLButtonElement, RedButtonProps>(
  ({ disabled, className, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          disabled ? "border-red-600/50 bg-red-600/10 text-red-400/60 opacity-60 cursor-not-allowed hover:bg-red-600/10" :
            "border-red-600/50 text-red-400 hover:bg-red-600/10 hover:text-red-300 hover:border-red-500",
          className
        )}
        variant="outline"
        disabled={disabled}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

RedButton.displayName = "RedButton";

export default RedButton;
