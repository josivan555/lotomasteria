import { cn } from "@/lib/utils";

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
      {String(n).padStart(2, "0")}
    </span>
  );
}
