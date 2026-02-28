"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { usePressable } from "@/components/usePressable";

const DISABLED_TO_ENABLED_DELAY_MS = 450;

const baseClass = "cursor-pointer select-none w-full flex items-center justify-center font-medium text-base md:text-lg py-2 md:py-4 px-4 md:px-6 rounded-xl";

const transition = { type: "tween" as const, duration: 0.12 };
const tapTransition = { type: "tween" as const, duration: 0.08 };
const tapStyle = { scale: 0.92, y: 3 };
const hoverStyle = { scale: 1, y: -2 };
const restStyle = { scale: 1, y: 0 };

type ButtonBaseProps = {
  variant: "primary" | "secondary" | "yellow";
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
  const variantClass =
    variant === "primary"
      ? "btn-primary"
      : variant === "yellow"
        ? "btn-yellow"
        : "btn-secondary";
  const disabled = "disabled" in rest ? rest.disabled : false;
  const [domDisabled, setDomDisabled] = useState(disabled);
  const prevDisabledRef = useRef(disabled);

  useEffect(() => {
    if (disabled) {
      prevDisabledRef.current = true;
      setDomDisabled(true);
      return;
    }
    if (prevDisabledRef.current) {
      setDomDisabled(true);
      const id = setTimeout(() => {
        prevDisabledRef.current = false;
        setDomDisabled(false);
      }, DISABLED_TO_ENABLED_DELAY_MS);
      return () => clearTimeout(id);
    }
    setDomDisabled(false);
  }, [disabled]);

  const disabledCursorClass = domDisabled ? "cursor-not-allowed" : "";
  const classes = `${baseClass} ${variantClass} ${disabledCursorClass} ${className}`.trim();
  const { isHovered, isPressed, pressableProps } = usePressable(domDisabled);

  const animate =
    isPressed ? tapStyle : isHovered ? hoverStyle : restStyle;
  const transitionConfig = isPressed ? tapTransition : transition;
  const animateWithOpacity = {
    ...animate,
    opacity: disabled ? 0.6 : 1,
  };
  const transitionWithOpacity = {
    ...transitionConfig,
    opacity: { duration: 0.4, ease: "easeOut" as const },
  };

  if ("href" in rest && rest.href) {
    return (
      <Link href={rest.href} className="block">
        <motion.span
          className={classes}
          initial={restStyle}
          animate={animateWithOpacity}
          transition={transitionWithOpacity}
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
      disabled={domDisabled}
      onClick={onClick}
      className={classes}
      initial={restStyle}
      animate={animateWithOpacity}
      transition={transitionWithOpacity}
      {...pressableProps}
    >
      {children}
    </motion.button>
  );
}
