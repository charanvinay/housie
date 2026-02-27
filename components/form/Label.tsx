type LabelProps = {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
};

export function Label({
  htmlFor,
  children,
  required,
  className = "",
}: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`form-label ${className}`.trim()}
    >
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}
