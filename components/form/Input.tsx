import { forwardRef } from "react";

type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "className"
> & {
  className?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`input-field ${className}`.trim()}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
