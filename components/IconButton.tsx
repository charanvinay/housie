"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { usePressable } from "@/components/usePressable";

const iconOnlyClass = "btn-icon size-10 p-0";
const withLabelClass = "btn-icon gap-2 px-4 py-2";

const transition = { type: "tween" as const, duration: 0.12 };
const tapTransition = { type: "tween" as const, duration: 0.08 };
const tapStyle = { scale: 0.88, y: 3 };
const hoverStyle = { scale: 1, y: -2 };
const restStyle = { scale: 1, y: 0 };

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
  const disabled = "disabled" in rest ? rest.disabled : false;
  const { isHovered, isPressed, pressableProps } = usePressable(disabled);

  const animate = isPressed ? tapStyle : isHovered ? hoverStyle : restStyle;
  const transitionConfig = isPressed ? tapTransition : transition;

  if ("href" in rest && rest.href) {
    return (
      <Link
        href={rest.href}
        className="inline-block"
        aria-label={rest["aria-label"]}
      >
        <motion.span
          className={classes}
          initial={restStyle}
          animate={animate}
          transition={transitionConfig}
          {...pressableProps}
        >
          {icon}
          {children}
        </motion.span>
      </Link>
    );
  }

  const { type = "button", onClick } = rest;
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={classes}
      aria-label={rest["aria-label"]}
      initial={restStyle}
      animate={animate}
      transition={transitionConfig}
      {...pressableProps}
    >
      {icon}
      {children}
    </motion.button>
  );
}
