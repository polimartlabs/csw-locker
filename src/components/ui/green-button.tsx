
import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GreenButtonProps extends ButtonProps {
  children: React.ReactNode;
}

const GreenButton = React.forwardRef<HTMLButtonElement, GreenButtonProps>(
  ({ disabled, className, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          disabled ? "border-green-600 bg-green-700/20 opacity-60 cursor-not-allowed hover:bg-green-700/20" :
            "bg-green-600 hover:bg-green-700 text-white",
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

GreenButton.displayName = "GreenButton";

export default GreenButton;
