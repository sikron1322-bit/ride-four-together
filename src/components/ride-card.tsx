import { Link } from "@tanstack/react-router";
import { Car, User } from "lucide-react";
import { fmtDay, fmtPrice, fmtTime, seatsLeft, type Ride } from "@/lib/rides";
import { SeatMeter } from "./seat-meter";
import { cn } from "@/lib/utils";

export function RouteLine({ from, to, big }: { from?: string | undefined; to?: string | undefined; big?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("font-bold", big ? "text-2xl md:text-3xl" : "text-lg")}>{from}</span>
      <div className="relative flex-1 min-w-10">
        <div className="road-line animate-dash" />
        <span className="absolute -top-1.5 start-0 size-3.5 rounded-full border-2 border-primary bg-background" />
        <span className="absolute -top-1.5 end-0 size-3.5 rounded-full bg-primary" />
      </div>
      <span className={cn("font-bold", big ? "text-2xl md:text-3xl" : "text-lg")}>{to}</span>
    </div>
  );
}

export function RideCard({ ride, index = 0 }: { ride: Ride; index?: number }) {
  const left = seatsLeft(ride);
  const full = left === 0;
  return (
    <Link
      to="/rides/$rideId"
      params={{ rideId: ride.id }}
      className={cn(
        "group block animate-rise",
        full && "pointer-events-none opacity-50",
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <article className="ticket glass grid grid-cols-[1fr_auto] overflow-hidden rounded-3xl transition-transform duration-300 group-hover:-translate-y-1">
        <div className="p-5 md:p-6">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <span className="font-display text-5xl text-headlight">{fmtTime(ride.departure_at)}</span>
            <span className="text-sm text-muted-foreground">{fmtDay(ride.departure_at)}</span>
          </div>
          <RouteLine from={ride.origin?.name} to={ride.destination?.name} />
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="size-4 text-signal" /> {ride.driver_name}
            </span>
            {ride.car_model && (
              <span className="flex items-center gap-1.5">
                <Car className="size-4 text-signal" /> {ride.car_model}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 border-s border-dashed border-border px-5 md:px-7">
          <span className="font-display text-5xl">{fmtPrice(Number(ride.price))}</span>
          <SeatMeter total={ride.seats_total} booked={ride.seats_booked} />
          <span className={cn("text-xs font-semibold", full ? "text-destructive" : "text-signal")}>
            {full ? "מלא" : `${left} מקומות פנויים`}
          </span>
        </div>
      </article>
    </Link>
  );
}
