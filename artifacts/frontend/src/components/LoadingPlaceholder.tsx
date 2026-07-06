import { LoadingSpinner } from "./LoadingSpinner";

type LoadingPlaceholderProps = {
  size?: number;
  className?: string;
  /** Minimum vertical padding around the spinner */
  padding?: "sm" | "md" | "lg";
};

const paddingClass = {
  sm: "py-8",
  md: "py-16",
  lg: "py-24",
} as const;

export function LoadingPlaceholder({
  size = 32,
  className = "text-main-400",
  padding = "md",
}: LoadingPlaceholderProps) {
  return (
    <div
      className={`flex items-center justify-center ${paddingClass[padding]}`}
    >
      <LoadingSpinner size={size} className={className} />
    </div>
  );
}
