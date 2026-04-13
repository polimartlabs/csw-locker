
import React from 'react';
import { cn } from '@/lib/utils';

interface OptionButtonProps {
  isSelected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const OptionButton = ({
  isSelected,
  onClick,
  children,
  className,
  disabled = false
}: OptionButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center px-4 py-3 rounded-lg border transition-all duration-200 font-medium",
        isSelected
          ? "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
          : "bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:border-slate-500 hover:text-white",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
};

export default OptionButton;
