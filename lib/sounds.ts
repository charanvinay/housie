"use client";

import { useState, useEffect, useCallback } from "react";

export type SoundName =
  | "mouseClick"
  | "coin"
  | "catLaugh"
  | "fahh"
  | "gameOver"
  | "iGotThis";

export const SOUND_PATHS: Record<SoundName, string> = {
  mouseClick: "/mouse-click-sound.mp3",
  coin: "/coin.mp3",
  catLaugh: "/cat-laugh.mp3",
  fahh: "/fahh.mp3",
  gameOver: "/game-over.mp3",
  iGotThis: "/i-got-this.mp3",
};

const MAX_POOL_PER_SOUND = 4;
const MUTE_STORAGE_KEY = "housie_sound_muted";

export class Sounds {
  private static pool: Map<string, HTMLAudioElement[]> = new Map();
  private static _muted: boolean = false;
  private static listeners: Set<(muted: boolean) => void> = new Set();
  private static initialized: boolean = false;

  private static init(): void {
    if (Sounds.initialized) return;
    Sounds.initialized = true;
    if (typeof window !== "undefined") {
      try {
        Sounds._muted = localStorage.getItem(MUTE_STORAGE_KEY) === "true";
      } catch {}
    }
  }

  static isMuted(): boolean {
    Sounds.init();
    return Sounds._muted;
  }

  static setMuted(muted: boolean): void {
    Sounds.init();
    Sounds._muted = muted;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(MUTE_STORAGE_KEY, muted ? "true" : "false");
      } catch {}
    }
    Sounds.listeners.forEach((listener) => {
      try {
        listener(muted);
      } catch {}
    });
  }

  static toggleMute(): boolean {
    const next = !Sounds.isMuted();
    Sounds.setMuted(next);
    return next;
  }

  static subscribe(listener: (muted: boolean) => void): () => void {
    Sounds.listeners.add(listener);
    return () => {
      Sounds.listeners.delete(listener);
    };
  }

  /**
   * Play any sound by name or custom path.
   * Example: Sounds.play("mouseClick") or Sounds.play("/mouse-click-sound.mp3")
   */
  static play = (sound: SoundName | (string & {})): void => {
    if (typeof window === "undefined") return;
    if (Sounds.isMuted()) return;

    try {
      const path =
        sound in SOUND_PATHS
          ? SOUND_PATHS[sound as SoundName]
          : sound.startsWith("/")
          ? sound
          : `/${sound}.mp3`;

      let soundPool = Sounds.pool.get(path);
      if (!soundPool) {
        soundPool = [];
        Sounds.pool.set(path, soundPool);
      }

      // Reuse an idle/ended element, or spawn up to MAX_POOL_PER_SOUND
      let audio = soundPool.find((a) => a.paused || a.ended);
      if (!audio) {
        if (soundPool.length < MAX_POOL_PER_SOUND) {
          audio = new Audio(path);
          soundPool.push(audio);
        } else {
          audio = soundPool[0];
        }
      }

      audio.currentTime = 0;
      audio.play().catch(() => {
        // Silently catch autoplay restrictions before first user gesture
      });
    } catch {
      // Ignore audio initialization errors
    }
  };

  /**
   * Play the button click sound (/mouse-click-sound.mp3)
   */
  static mouseClick = (): void => {
    Sounds.play("mouseClick");
  };

  static coin = (): void => {
    Sounds.play("coin");
  };

  static catLaugh = (): void => {
    Sounds.play("catLaugh");
  };

  static fahh = (): void => {
    Sounds.play("fahh");
  };

  static gameOver = (): void => {
    Sounds.play("gameOver");
  };

  static iGotThis = (): void => {
    Sounds.play("iGotThis");
  };
}

export function useSoundMuted() {
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    setMutedState(Sounds.isMuted());
    return Sounds.subscribe((newMuted) => {
      setMutedState(newMuted);
    });
  }, []);

  const toggleMute = useCallback(() => {
    return Sounds.toggleMute();
  }, []);

  return { muted, toggleMute, setMuted: Sounds.setMuted };
}

if (typeof window !== "undefined") {
  try {
    const preload = new Audio(SOUND_PATHS.mouseClick);
    preload.preload = "auto";
    (Sounds as unknown as { pool: Map<string, HTMLAudioElement[]> }).pool?.set(
      SOUND_PATHS.mouseClick,
      [preload]
    );
  } catch {
    // Ignore preload error
  }
}

export default Sounds;
