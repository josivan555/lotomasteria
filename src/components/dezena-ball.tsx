import { cn } from "@/lib/utils";
import { formatDezena } from "@/lib/loterias-config";

export function DezenaBall({
  n,
  variant = "default",
  className,
}: {
  n: number;
  variant?: "default" | "gold" | "muted" | "green" | "blue" | "purple";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "ball text-sm",
        variant === "gold" && "ball-gold",
        variant === "muted" && "ball-muted",
        variant === "blue" && "ball-blue",
        variant === "purple" && "ball-purple",
        className,
      )}
    >
      {formatDezena(n)}
    </span>
  );
}
