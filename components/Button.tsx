"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { usePressable } from "@/components/usePressable";

const baseClass = "cursor-pointer select-none w-full flex items-center justify-center font-medium text-lg py-4 px-6 rounded-xl";

const transition = { type: "tween" as const, duration: 0.12 };
const tapTransition = { type: "tween" as const, duration: 0.08 };
const tapStyle = { scale: 0.92, y: 3 };
const hoverStyle = { scale: 1, y: -2 };
const restStyle = { scale: 1, y: 0 };

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
  const disabled = "disabled" in rest ? rest.disabled : false;
  const { isHovered, isPressed, pressableProps } = usePressable(disabled);

  const animate =
    isPressed ? tapStyle : isHovered ? hoverStyle : restStyle;
  const transitionConfig = isPressed ? tapTransition : transition;

  if ("href" in rest && rest.href) {
    return (
      <Link href={rest.href} className="block">
        <motion.span
          className={classes}
          initial={restStyle}
          animate={animate}
          transition={transitionConfig}
          {...pressableProps}
        >
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
      initial={restStyle}
      animate={animate}
      transition={transitionConfig}
      {...pressableProps}
    >
      {children}
    </motion.button>
  );
}
