import { cn } from "@/lib/utils";

export function DezenaBall({
  n,
  variant = "default",
  className,
}: {
  n: number;
  variant?: "default" | "gold" | "muted";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "ball text-sm",
        variant === "gold" && "ball-gold",
        variant === "muted" && "ball-muted",
        className,
      )}
    >
      {String(n).padStart(2, "0")}
    </span>
  );
}
