
import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SecondaryButtonProps extends ButtonProps {
  children: React.ReactNode;
}

const SecondaryButton = React.forwardRef<HTMLButtonElement, SecondaryButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="outline"
        className={cn(
          "border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700 hover:text-white hover:border-slate-500",
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

SecondaryButton.displayName = "SecondaryButton";

export default SecondaryButton;
