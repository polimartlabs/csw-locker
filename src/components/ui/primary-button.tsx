
import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PrimaryButtonProps extends ButtonProps {
  children: React.ReactNode;
}

const PrimaryButton = React.forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  ({ disabled, className, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          disabled ? "border-slate-600 bg-purple-700/20 opacity-60 cursor-not-allowed hover:bg-purple-700/20" :
            "bg-purple-600 hover:bg-purple-700 text-white",
          className
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

PrimaryButton.displayName = "PrimaryButton";

export default PrimaryButton;
