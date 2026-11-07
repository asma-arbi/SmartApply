import * as React from "react";
import { cn } from "@/lib/utils";
import { fieldClass } from "@/lib/constants";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        {...props}
        className={cn(
          fieldClass,
          "appearance-none bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat pr-9",
          className,
        )}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          ...props.style,
        }}
      >
        {children}
      </select>
    );
  },
);

Select.displayName = "Select";
