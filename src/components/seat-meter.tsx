import { cn } from "@/lib/utils";
import { MAX_SEATS_PER_RIDE } from "@/lib/payment";

/** Shows the car's 4 passenger seats: taken, free, or not offered. */
export function SeatMeter({
  total,
  booked,
  selected = 0,
  className,
}: {
  total: number;
  booked: number;
  selected?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)} aria-label={`${total - booked} מקומות פנויים`}>
      {Array.from({ length: MAX_SEATS_PER_RIDE }).map((_, i) => {
        const offered = i < total;
        const taken = i < booked;
        const picked = !taken && offered && i < booked + selected;
        return (
          <span
            key={i}
            className={cn(
              "h-5 w-4 rounded-t-lg rounded-b-sm border transition-all",
              !offered && "border-dashed border-border opacity-40",
              offered && taken && "border-muted-foreground/40 bg-muted-foreground/40",
              offered && !taken && !picked && "border-signal bg-signal/15",
              picked && "border-primary bg-headlight shadow-glow",
            )}
          />
        );
      })}
    </div>
  );
}
