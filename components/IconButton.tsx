"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const iconOnlyClass = "btn-icon size-10 p-0";
const withLabelClass = "btn-icon gap-2 px-4 py-2";

const motionProps = {
  initial: { scale: 1, y: 0 },
  whileHover: { scale: 1, y: -2 },
  whileTap: { scale: 0.92, y: 0 },
  transition: { type: "tween" as const, duration: 0.12 },
};

type IconButtonBaseProps = {
  icon: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  "aria-label"?: string;
};

type IconButtonAsLink = IconButtonBaseProps & {
  href: string;
  type?: never;
  disabled?: never;
  onClick?: never;
};

type IconButtonAsButton = IconButtonBaseProps & {
  href?: never;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
};

export type IconButtonProps = IconButtonAsLink | IconButtonAsButton;

export function IconButton({
  icon,
  children,
  className = "",
  ...rest
}: IconButtonProps) {
  const isIconOnly = !children;
  const shapeClass = isIconOnly ? iconOnlyClass : withLabelClass;
  const classes = `${shapeClass} ${className}`.trim();

  if ("href" in rest && rest.href) {
    return (
      <Link href={rest.href} className="inline-block" aria-label={rest["aria-label"]}>
        <motion.span className={classes} {...motionProps}>
          {icon}
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
      aria-label={rest["aria-label"]}
      {...motionProps}
      whileHover={disabled ? undefined : motionProps.whileHover}
      whileTap={disabled ? undefined : motionProps.whileTap}
    >
      {icon}
      {children}
    </motion.button>
  );
}
