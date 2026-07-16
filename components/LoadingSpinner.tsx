type LoadingSpinnerProps = {
  label?: string;
  className?: string;
};

export default function LoadingSpinner({
  label = "로딩 중...",
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div
      className={`inline-flex items-center gap-2.5 text-sm text-slate-400 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );
}
