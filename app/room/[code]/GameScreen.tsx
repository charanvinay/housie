"use client";

import { Button } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
import type { ClaimEntry, RoomState } from "./types";
import {
  CLAIM_LABELS,
  getAllNumbersInTicket,
  getNumbersInRow,
} from "./room-utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useIsMobileUserAgent } from "@/hooks/useIsMobileUserAgent";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { RecentDrawnNumbers } from "./RecentDrawnNumbers";

export type GameScreenProps = {
  room: RoomState;
  isHost: boolean;
  myId: string;
  drawing: boolean;
  /** When host starts a draw; server broadcasts so all clients start coin sound together */
  drawStartedAt: number | null;
  onDrawStarted: () => void;
  onDrawNumber: () => void;
  selectedByTicket: Record<number, Set<number>>;
  onToggleNumber: (ticketIndex: number, num: number) => void;
  claiming: boolean;
  claimError: string;
  onClaim: (
    ticketIndex: number,
    claimTypes: (
      | "jaldiFive"
      | "firstLine"
      | "middleLine"
      | "lastLine"
      | "housie"
    )[],
    jaldiFiveNumbers?: number[]
  ) => void;
};

const COIN_PICK_DURATION_MS = 550;

/** Coin sound plays from click until new number appears. Put your file at: public/coin.mp3 */
const COIN_SOUND_PATH = "/coin.mp3";
/** Coin audio duration in ms (0:01.399) – API is called after this delay so the number appears when the sound ends. */
const COIN_SOUND_DURATION_MS = 1399;
/** Play when current player is eligible for any claim (each time a new number is drawn and they're eligible). Put at: public/i-got-this.mp3 */
const I_GOT_THIS_SOUND_PATH = "/i-got-this.mp3";

const ticketSlideVariants = {
  enter: (direction: number) => ({
    y: direction > 0 ? 60 : -80,
    opacity: 0,
    scale: direction > 0 ? 0.85 : 1,
  }),
  center: { y: 0, opacity: 1, scale: 1 },
  exit: (direction: number) => ({
    y: direction > 0 ? -80 : 0,
    opacity: 0,
    scale: direction > 0 ? 1 : 0.85,
  }),
};

export function GameScreen({
  room,
  isHost,
  myId,
  drawing,
  drawStartedAt,
  onDrawStarted,
  onDrawNumber,
  selectedByTicket,
  onToggleNumber,
  claiming,
  claimError,
  onClaim,
}: GameScreenProps) {
  const tickets =
    (room.playerTickets && myId ? room.playerTickets[myId] : null) ?? [];
  const drawn = room.drawnNumbers ?? [];
  const currentNumber = drawn.length > 0 ? drawn[drawn.length - 1]! : null;
  const drawnSet = new Set(drawn);

  const [coinHidden, setCoinHidden] = useState(false);
  const prevDrawing = useRef(drawing);
  const isMobile = useIsMobile();
  const isMobileUserAgent = useIsMobileUserAgent();
  /** On mobile devices always use single-ticket + arrows layout (even after orientation lock to landscape). */
  const isMobileLayout = isMobile || isMobileUserAgent;
  const [currentTicketIndex, setCurrentTicketIndex] = useState(0);
  /** 1 = next (exit up, enter scale); -1 = prev (exit scale, enter from top) */
  const [ticketDirection, setTicketDirection] = useState(0);
  const [ticketsFit, setTicketsFit] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const ticketsContentRef = useRef<HTMLDivElement>(null);
  const coinSoundRef = useRef<HTMLAudioElement | null>(null);
  const iGotThisSoundRef = useRef<HTMLAudioElement | null>(null);
  const prevDrawnLengthRef = useRef(drawn.length);
  const prevDrawStartedAtRef = useRef<number | null>(null);
  /** Only play "i got this" when user *just became* eligible this draw, not when they were already eligible */
  const wasEligibleLastDrawRef = useRef(false);

  const hasEligibleClaim = useMemo(() => {
    const alreadyClaimedByMe = (arr?: ClaimEntry[]) =>
      arr?.some((e) => e.playerId === myId) ?? false;
    const noOneClaimedYet = (arr?: ClaimEntry[]) => !arr?.length;
    for (let ti = 0; ti < tickets.length; ti++) {
      const ticket = tickets[ti]!;
      const selected = selectedByTicket[ti] ?? new Set<number>();
      const selectedList = Array.from(selected);
      const row0 = getNumbersInRow(ticket, 0);
      const row1 = getNumbersInRow(ticket, 1);
      const row2 = getNumbersInRow(ticket, 2);
      const all15 = getAllNumbersInTicket(ticket);
      const jaldiFiveOk =
        selectedList.length === 5 &&
        selectedList.every((n) => drawnSet.has(n)) &&
        noOneClaimedYet(room.jaldiFiveClaimed) &&
        !alreadyClaimedByMe(room.jaldiFiveClaimed);
      const firstLineOk =
        row0.length === 5 &&
        row0.every((n) => drawnSet.has(n)) &&
        noOneClaimedYet(room.firstLineClaimed) &&
        !alreadyClaimedByMe(room.firstLineClaimed);
      const middleLineOk =
        row1.length === 5 &&
        row1.every((n) => drawnSet.has(n)) &&
        noOneClaimedYet(room.middleLineClaimed) &&
        !alreadyClaimedByMe(room.middleLineClaimed);
      const lastLineOk =
        row2.length === 5 &&
        row2.every((n) => drawnSet.has(n)) &&
        noOneClaimedYet(room.lastLineClaimed) &&
        !alreadyClaimedByMe(room.lastLineClaimed);
      const housieOk =
        all15.length === 15 &&
        all15.every((n) => drawnSet.has(n)) &&
        noOneClaimedYet(room.housieClaimed) &&
        !alreadyClaimedByMe(room.housieClaimed);
      if (jaldiFiveOk || firstLineOk || middleLineOk || lastLineOk || housieOk)
        return true;
    }
    return false;
  }, [room, tickets, selectedByTicket, drawnSet, myId]);

  useEffect(() => {
    const audio = new Audio(COIN_SOUND_PATH);
    coinSoundRef.current = audio;
    return () => {
      audio.pause();
      coinSoundRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = new Audio(I_GOT_THIS_SOUND_PATH);
    iGotThisSoundRef.current = audio;
    return () => {
      audio.pause();
      iGotThisSoundRef.current = null;
    };
  }, []);

  // When draw_started is received (host clicked or socket broadcast), start coin sound (loop) for everyone
  useEffect(() => {
    if (
      drawStartedAt != null &&
      drawStartedAt !== prevDrawStartedAtRef.current
    ) {
      prevDrawStartedAtRef.current = drawStartedAt;
      const audio = coinSoundRef.current;
      if (audio) {
        audio.loop = false;
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    }
  }, [drawStartedAt]);

  // When a new number appears: stop coin sound for everyone; play i-got-this when this user is eligible for a claim (overlay would show). Only update "was eligible" when a draw actually happened so we don't mark eligible from selection-only.
  useEffect(() => {
    const newNumberDrawn = drawn.length > prevDrawnLengthRef.current;
    if (newNumberDrawn) {
      const coinAudio = coinSoundRef.current;
      if (coinAudio) {
        coinAudio.pause();
        coinAudio.currentTime = 0;
        coinAudio.loop = false;
      }
      // Play when this user is eligible after this draw (including jaldi five when 5th selected number just came)
      if (hasEligibleClaim) {
        const iGotThis = iGotThisSoundRef.current;
        if (iGotThis) {
          iGotThis.currentTime = 0;
          iGotThis.play().catch(() => {});
        }
      }
      wasEligibleLastDrawRef.current = hasEligibleClaim;
    }
    prevDrawnLengthRef.current = drawn.length;
  }, [drawn.length, hasEligibleClaim]);

  const goToPrevTicket = () => {
    if (currentTicketIndex <= 0) return;
    setTicketDirection(-1);
    setCurrentTicketIndex((i) => Math.max(0, i - 1));
  };
  const goToNextTicket = () => {
    if (currentTicketIndex >= tickets.length - 1) return;
    setTicketDirection(1);
    setCurrentTicketIndex((i) => Math.min(tickets.length - 1, i + 1));
  };

  useEffect(() => {
    if (currentTicketIndex >= tickets.length && tickets.length > 0) {
      setCurrentTicketIndex(tickets.length - 1);
    }
  }, [tickets.length, currentTicketIndex]);

  // On mobile we use single-ticket + arrows (no scroll); skip scroll-fit check
  useEffect(() => {
    if (isMobileLayout) {
      setTicketsFit(true);
      return;
    }
    const container = scrollContainerRef.current;
    const content = ticketsContentRef.current;
    if (!container || !content) {
      setTicketsFit(true);
      return;
    }
    const check = () => {
      const containerHeight = container.clientHeight;
      const contentHeight = content.scrollHeight;
      setTicketsFit(contentHeight <= containerHeight);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(container);
    ro.observe(content);
    return () => ro.disconnect();
  }, [tickets.length, isMobileLayout, currentTicketIndex]);

  const handlePickNext = () => {
    if (!isHost || drawing || drawn.length >= 90) return;
    onDrawStarted();
    if (currentNumber !== null) {
      setCoinHidden(true);
    }
    setTimeout(() => {
      onDrawNumber();
    }, COIN_SOUND_DURATION_MS);
  };

  useEffect(() => {
    if (prevDrawing.current && !drawing && coinHidden) {
      setCoinHidden(false);
    }
    prevDrawing.current = drawing;
  }, [drawing, coinHidden]);

  return (
    <div className="grid grid-cols-3 grid-rows-[auto_minmax(0,1fr)] gap-0 w-full h-full min-h-0 overflow-hidden">
      <RecentDrawnNumbers drawn={drawn} />

      {/* Left: 1/3 – coin + pick button (sticky) */}
      <div
        className={`col-span-1 flex flex-col items-center justify-center h-full sticky top-6 self-start ${
          isMobileLayout ? "px-2 py-4" : "px-4 py-6"
        }`}
      >
        <div
          className={`w-full flex items-center justify-center shrink-0 ${
            isMobileLayout
              ? "max-w-[120px] min-h-[120px]"
              : "max-w-[180px] min-h-[180px]"
          }`}
        >
          <AnimatePresence mode="wait">
            {currentNumber !== null && !coinHidden && (
              <motion.div
                key={currentNumber}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "tween", duration: 0.25 }}
                className={`relative w-full aspect-square rounded-full flex items-center justify-center overflow-hidden bg-green-600 border-green-300 ${
                  isMobileLayout
                    ? "max-w-[120px] border-[3px]"
                    : "max-w-[180px] border-[5px]"
                }`}
                style={{
                  boxShadow:
                    "3px 8px 0 rgba(21, 128, 61, 0.85), 4px 10px 20px rgba(0, 0, 0, 0.3)",
                }}
              >
                <span
                  className={`flex items-center justify-center font-bold text-green-300 leading-none text-center w-full h-full ${
                    isMobileLayout ? "text-5xl" : "text-6xl"
                  }`}
                  style={{
                    textShadow:
                      "0 4px 12px rgba(21, 128, 61, 0.95), 0 0 20px rgba(134, 239, 172, 0.3)",
                  }}
                >
                  {currentNumber}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {isHost && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              type: "tween",
              duration: 0.3,
              ease: "easeOut",
              delay: 0.15,
            }}
            className={`w-full ${
              isMobileLayout ? "max-w-[220px] mt-8" : "max-w-[240px] mt-18"
            }`}
          >
            <Button
              type="button"
              variant="yellow"
              onClick={handlePickNext}
              disabled={drawing || drawn.length >= 90}
              className={`w-full whitespace-nowrap ${
                isMobileLayout
                  ? "min-w-[220px] max-w-[280px]"
                  : "min-w-[200px] max-w-[240px]"
              }`}
            >
              Pick next number
            </Button>
          </motion.div>
        )}
      </div>

      {/* Right: 2/3 – tickets column (scrollable); center when content fits, top when needs scroll */}
      <div
        ref={scrollContainerRef}
        className={`tickets-scroll col-span-2 flex min-h-0 flex-col gap-0 overflow-y-auto ${
          isMobileLayout ? "px-1 py-2" : "px-2 py-4"
        } ${ticketsFit ? "justify-center" : "justify-start"}`}
      >
        <div ref={ticketsContentRef} className="flex flex-col shrink-0">
          {claimError && (
            <p className="text-sm text-red-600 text-center mb-2">
              {claimError}
            </p>
          )}

          <div
            className={
              isMobileLayout && tickets.length > 1
                ? "flex flex-1 min-h-0 gap-6"
                : "flex flex-col"
            }
          >
            <div
              className={
                isMobileLayout && tickets.length > 1
                  ? "relative flex flex-1 min-h-0 flex-col min-w-0"
                  : "flex flex-col"
              }
            >
              {tickets.length === 0 ? (
                <p className="text-theme-muted text-sm py-4">No tickets.</p>
              ) : (
                <>
                  {/* Tinder-style stack: (tickets.length - 1) card shadows behind active ticket on mobile */}
                  {isMobileLayout &&
                    tickets.length > 1 &&
                    Array.from({ length: tickets.length - 1 }).map((_, i) => {
                      const inset = 6 * (i + 1);
                      const offset = 4 * (i + 1);
                      return (
                        <div
                          key={`stack-${i}`}
                          className="absolute rounded-lg border border-slate-400/30 bg-ticket/50 pointer-events-none"
                          style={{
                            left: `${inset}px`,
                            right: `${inset}px`,
                            top: `${offset}px`,
                            bottom: `${-offset}px`,
                            boxShadow:
                              "0 2px 4px -1px rgba(0,0,0,0.18), 0 1px 2px -1px rgba(0,0,0,0.1)",
                            zIndex: i,
                          }}
                        />
                      );
                    })}
                  <AnimatePresence
                    initial={false}
                    mode="wait"
                    custom={ticketDirection}
                  >
                    {(isMobileLayout
                      ? [currentTicketIndex]
                      : Array.from({ length: tickets.length }, (_, i) => i)
                    ).map((ticketIndex) => {
                      const ticket = tickets[ticketIndex]!;
                      const selected =
                        selectedByTicket[ticketIndex] ?? new Set();
                      const selectedList = Array.from(selected);
                      const alreadyClaimedByMe = (arr?: ClaimEntry[]) =>
                        arr?.some((e) => e.playerId === myId) ?? false;
                      const noOneClaimedYet = (arr?: ClaimEntry[]) =>
                        !arr?.length;

                      const row0 = getNumbersInRow(ticket, 0);
                      const row1 = getNumbersInRow(ticket, 1);
                      const row2 = getNumbersInRow(ticket, 2);
                      const all15 = getAllNumbersInTicket(ticket);

                      const jaldiFiveOk =
                        selectedList.length === 5 &&
                        selectedList.every((n) => drawnSet.has(n)) &&
                        noOneClaimedYet(room.jaldiFiveClaimed) &&
                        !alreadyClaimedByMe(room.jaldiFiveClaimed);

                      const firstLineOk =
                        row0.length === 5 &&
                        row0.every((n) => drawnSet.has(n)) &&
                        noOneClaimedYet(room.firstLineClaimed) &&
                        !alreadyClaimedByMe(room.firstLineClaimed);

                      const middleLineOk =
                        row1.length === 5 &&
                        row1.every((n) => drawnSet.has(n)) &&
                        noOneClaimedYet(room.middleLineClaimed) &&
                        !alreadyClaimedByMe(room.middleLineClaimed);

                      const lastLineOk =
                        row2.length === 5 &&
                        row2.every((n) => drawnSet.has(n)) &&
                        noOneClaimedYet(room.lastLineClaimed) &&
                        !alreadyClaimedByMe(room.lastLineClaimed);

                      const housieOk =
                        all15.length === 15 &&
                        all15.every((n) => drawnSet.has(n)) &&
                        noOneClaimedYet(room.housieClaimed) &&
                        !alreadyClaimedByMe(room.housieClaimed);
                      const row0Complete =
                        row0.length === 5 && row0.every((n) => drawnSet.has(n));
                      const row1Complete =
                        row1.length === 5 && row1.every((n) => drawnSet.has(n));
                      const row2Complete =
                        row2.length === 5 && row2.every((n) => drawnSet.has(n));

                      const eligibleTypes: (
                        | "jaldiFive"
                        | "firstLine"
                        | "middleLine"
                        | "lastLine"
                        | "housie"
                      )[] = [];
                      if (jaldiFiveOk) eligibleTypes.push("jaldiFive");
                      if (firstLineOk) eligibleTypes.push("firstLine");
                      if (middleLineOk) eligibleTypes.push("middleLine");
                      if (lastLineOk) eligibleTypes.push("lastLine");
                      if (housieOk) eligibleTypes.push("housie");

                      const hasAnyClaim = eligibleTypes.length > 0;

                      const handleClaimClick = () => {
                        onClaim(
                          ticketIndex,
                          eligibleTypes,
                          eligibleTypes.includes("jaldiFive")
                            ? selectedList
                            : undefined
                        );
                      };

                      return (
                        <motion.div
                          key={ticketIndex}
                          custom={ticketDirection}
                          variants={
                            isMobileLayout && tickets.length > 1
                              ? ticketSlideVariants
                              : undefined
                          }
                          initial={
                            isMobileLayout && tickets.length > 1
                              ? "enter"
                              : { y: 24, opacity: 0 }
                          }
                          animate={
                            isMobileLayout && tickets.length > 1
                              ? "center"
                              : { y: 0, opacity: 1 }
                          }
                          exit={
                            isMobileLayout && tickets.length > 1
                              ? "exit"
                              : undefined
                          }
                          transition={{
                            type: "tween",
                            duration:
                              isMobileLayout && tickets.length > 1 ? 0.28 : 0.3,
                            ease: "easeOut",
                            delay:
                              isMobileLayout && tickets.length > 1
                                ? 0
                                : 0.08 * ticketIndex,
                          }}
                          className={`relative ${
                            isMobileLayout && tickets.length > 1
                              ? "rounded-lg"
                              : "rounded-none"
                          } bg-ticket/95 shrink-0 z-10 ${
                            isMobileLayout ? "p-4" : "p-6"
                          }`}
                        >
                          <p
                            className={`text-slate-800 text-center font-semibold ${
                              isMobileLayout
                                ? "text-[10px] mb-1"
                                : "text-xs mb-1.5"
                            }`}
                          >
                            {isMobileLayout && tickets.length > 1
                              ? `Ticket ${ticketIndex + 1} of ${tickets.length}`
                              : `Ticket ${ticketIndex + 1}`}
                          </p>
                          <div className="w-full">
                            <table className="w-full border-collapse text-center table-fixed">
                              <colgroup>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                                  <col key={i} style={{ width: "11.111%" }} />
                                ))}
                              </colgroup>
                              <tbody>
                                {ticket.map((row, r) => {
                                  const rowComplete =
                                    r === 0
                                      ? row0Complete
                                      : r === 1
                                      ? row1Complete
                                      : row2Complete;
                                  return (
                                    <tr key={r} className="relative">
                                      {row.map((cell, c) => {
                                        const num = cell;
                                        const isDrawn =
                                          num !== null && drawnSet.has(num);
                                        const isSelected =
                                          num !== null && selected.has(num);
                                        const isEmpty = num === null;
                                        const isPending =
                                          num !== null &&
                                          !isDrawn &&
                                          !isSelected;
                                        return (
                                          <td
                                            key={c}
                                            className={`border-[1.5px] border-[#1f2937] p-0.5 select-none text-slate-800 font-semibold ${"h-10 text-sm"} ${
                                              num !== null &&
                                              isDrawn &&
                                              !isSelected
                                                ? "cursor-pointer"
                                                : ""
                                            } ${
                                              isEmpty
                                                ? "bg-ticket/20"
                                                : isSelected
                                                ? "bg-pink-500 text-white"
                                                : isDrawn
                                                ? "bg-yellow/80 text-slate-900"
                                                : isPending
                                                ? "bg-ticket/40 hover:bg-ticket/60"
                                                : ""
                                            }`}
                                            onClick={() =>
                                              num !== null &&
                                              isDrawn &&
                                              !isSelected &&
                                              onToggleNumber(ticketIndex, num)
                                            }
                                            role={
                                              num !== null &&
                                              isDrawn &&
                                              !isSelected
                                                ? "button"
                                                : undefined
                                            }
                                          >
                                            {num ?? ""}
                                          </td>
                                        );
                                      })}
                                      {rowComplete ? (
                                        <td
                                          colSpan={9}
                                          aria-hidden
                                          className="absolute border-0 p-0 m-0 pointer-events-none inset-0 flex items-center"
                                          style={{
                                            left: 0,
                                            right: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: "100%",
                                            minWidth: "100%",
                                            boxSizing: "border-box",
                                          }}
                                        >
                                          <div
                                            className="w-full border-t-2 border-yellow"
                                            style={{
                                              boxShadow:
                                                "0 2px 4px rgba(0, 0, 0, 0.8)",
                                            }}
                                          />
                                        </td>
                                      ) : null}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          {hasAnyClaim && (
                            <div
                              className={`absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 p-4 ${
                                isMobileLayout && tickets.length > 1
                                  ? "rounded-lg"
                                  : "rounded-none"
                              }`}
                            >
                              <Button
                                type="button"
                                variant="yellow"
                                onClick={handleClaimClick}
                                disabled={claiming}
                                className="max-w-xs"
                              >
                                {claiming
                                  ? "Claiming…"
                                  : `Claim ${eligibleTypes
                                      .map((t) => CLAIM_LABELS[t])
                                      .join(" & ")}`}
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </>
              )}
            </div>
            {isMobileLayout && tickets.length > 1 && (
              <div className="flex flex-col justify-center gap-4 shrink-0">
                <IconButton
                  type="button"
                  onClick={goToPrevTicket}
                  disabled={currentTicketIndex === 0}
                  icon={<FiChevronUp className="size-6 shrink-0" />}
                  aria-label="Previous ticket"
                />
                <IconButton
                  type="button"
                  onClick={goToNextTicket}
                  disabled={currentTicketIndex === tickets.length - 1}
                  icon={<FiChevronDown className="size-6 shrink-0" />}
                  aria-label="Next ticket"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
