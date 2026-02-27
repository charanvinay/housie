import { GRADIENT_BG } from "@/lib/theme";

export function LoadingOverlay() {
  return (
    <div
      className="loading-overlay absolute inset-0 z-[9999] flex items-center justify-center"
      style={{ background: GRADIENT_BG }}
    >
      <div className="h-12 w-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
    </div>
  );
}
