"use client";

import { useState, useCallback, useRef } from "react";

const PRESS_MIN_MS = 100;

/**
 * Tracks hover and press state via pointer + touch events so the press
 * animation works for mouse, trackpad click, and finger tap.
 * Uses a minimum press duration so fast taps still show the animation.
 */
export function usePressable(disabled?: boolean) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const pressStartedAt = useRef(0);
  const releaseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPressedTrue = useCallback(() => {
    if (disabled) return;
    if (releaseTimeout.current) {
      clearTimeout(releaseTimeout.current);
      releaseTimeout.current = null;
    }
    pressStartedAt.current = Date.now();
    setIsPressed(true);
  }, [disabled]);

  const setPressedFalse = useCallback(() => {
    const elapsed = Date.now() - pressStartedAt.current;
    const delay = Math.max(0, PRESS_MIN_MS - elapsed);

    const release = () => {
      releaseTimeout.current = null;
      setIsPressed(false);
    };

    if (delay > 0) {
      releaseTimeout.current = setTimeout(release, delay);
    } else {
      release();
    }
  }, []);

  const onPointerEnter = useCallback(() => {
    if (!disabled) setIsHovered(true);
  }, [disabled]);

  const onPointerLeave = useCallback(() => {
    setIsHovered(false);
    if (releaseTimeout.current) {
      clearTimeout(releaseTimeout.current);
      releaseTimeout.current = null;
    }
    setIsPressed(false);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      setPressedTrue();
    },
    [disabled, setPressedTrue]
  );

  const onPointerUp = useCallback(setPressedFalse, [setPressedFalse]);

  const onPointerCancel = useCallback(setPressedFalse, [setPressedFalse]);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      setPressedTrue();
    },
    [disabled, setPressedTrue]
  );

  const onTouchEnd = useCallback(setPressedFalse, [setPressedFalse]);

  const onTouchCancel = useCallback(setPressedFalse, [setPressedFalse]);

  return {
    isHovered,
    isPressed,
    pressableProps: {
      onPointerEnter,
      onPointerLeave,
      onPointerDown,
      onPointerUp,
      onPointerCancel,
      onTouchStart,
      onTouchEnd,
      onTouchCancel,
      style: { touchAction: "manipulation" as const },
    },
  };
}
