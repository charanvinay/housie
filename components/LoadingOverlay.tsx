export function LoadingOverlay() {
  return (
    <div className="loading-overlay absolute inset-0 z-[9999] flex items-center justify-center">
      <div className="h-12 w-12 rounded-full border-4 border-accent/30 border-t-accent animate-spin" />
    </div>
  );
}
