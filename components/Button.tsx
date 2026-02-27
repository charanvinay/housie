"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const baseClass = "cursor-pointer select-none w-full flex items-center justify-center font-medium text-lg py-4 px-6 rounded-xl";

type ButtonBaseProps = {
  variant: "primary" | "secondary";
  children: React.ReactNode;
  className?: string;
};

type ButtonAsLink = ButtonBaseProps & {
  href: string;
  type?: never;
  disabled?: never;
  onClick?: never;
};

type ButtonAsButton = ButtonBaseProps & {
  href?: never;
  type?: "submit" | "button";
  disabled?: boolean;
  onClick?: () => void;
};

export type ButtonProps = ButtonAsLink | ButtonAsButton;

export function Button({
  variant,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const variantClass = variant === "primary" ? "btn-primary" : "btn-secondary";
  const classes = `${baseClass} ${variantClass} ${className}`.trim();

  if ("href" in rest && rest.href) {
    return (
      <Link href={rest.href} className="block">
        <motion.span
          className={classes}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.1 }}
        >
          {children}
        </motion.span>
      </Link>
    );
  }

  const { type = "button", disabled, onClick } = rest;
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={classes}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.1 }}
    >
      {children}
    </motion.button>
  );
}
