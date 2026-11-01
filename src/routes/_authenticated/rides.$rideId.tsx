import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays, Car, Minus, Pencil, Plus, StickyNote, User } from "lucide-react";
import { fmtDay, fmtPrice, fmtTime, rideQuery, seatsLeft } from "@/lib/rides";
import { bookingTotal } from "@/lib/payment";
import { RouteLine } from "@/components/ride-card";
import { SeatMeter } from "@/components/seat-meter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/rides/$rideId")({
  loader: async ({ context, params }) => {
    const ride = await context.queryClient.ensureQueryData(rideQuery(params.rideId));
    if (!ride) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "פרטי נסיעה | נתיב" },
      { name: "description", content: "פרטי הנסיעה, הנהג והמקומות הפנויים." },
      { property: "og:title", content: "פרטי נסיעה | נתיב" },
      { property: "og:description", content: "בחרו כמה מקומות להזמין בנסיעה." },
    ],
  }),
  component: RidePage,
});

function RidePage() {
  const { rideId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const { data: ride } = useSuspenseQuery(rideQuery(rideId));
  const [seats, setSeats] = useState(1);
  if (!ride) return null;

  const left = seatsLeft(ride);
  const isOwner = ride.driver_id === user.id;
  const departed = new Date(ride.departure_at) < new Date();
  const canBook = !isOwner && left > 0 && ride.status === "open" && !departed;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link to="/rides" className="text-sm text-muted-foreground hover:text-foreground">
        → חזרה לנסיעות
      </Link>
      <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <section className="glass animate-rise rounded-[2rem] p-6 md:p-10">
          <div className="font-display text-[7rem] leading-none text-headlight">{fmtTime(ride.departure_at)}</div>
          <div className="mt-2 flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="size-4" /> {fmtDay(ride.departure_at)}
          </div>
          <div className="mt-10">
            <RouteLine from={ride.origin?.name} to={ride.destination?.name} big />
          </div>
          <dl className="mt-10 grid gap-4 sm:grid-cols-2">
            <Info icon={<User />} label="נהג/ת" value={ride.driver_name} />
            <Info icon={<Car />} label="רכב" value={ride.car_model || "—"} />
            {ride.notes && <Info icon={<StickyNote />} label="הערות" value={ride.notes} wide />}
          </dl>
          {ride.status === "cancelled" && (
            <p className="mt-6 rounded-2xl bg-destructive/15 p-4 font-semibold text-destructive">הנסיעה בוטלה על ידי הנהג</p>
          )}
        </section>

        <aside className="glass animate-rise flex flex-col gap-6 rounded-[2rem] p-6 md:p-8" style={{ animationDelay: "80ms" }}>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">מחיר למקום</div>
            <div className="font-display text-7xl">{fmtPrice(Number(ride.price))}</div>
          </div>
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">מקומות ברכב</div>
            <SeatMeter total={ride.seats_total} booked={ride.seats_booked} selected={canBook ? seats : 0} className="[&>span]:h-9 [&>span]:w-7" />
            <div className="mt-2 text-sm text-signal">{left} פנויים מתוך {ride.seats_total}</div>
          </div>

          {isOwner ? (
            <Button asChild variant="glass" size="xl">
              <Link to="/driver/$rideId/edit" params={{ rideId: ride.id }}>
                <Pencil /> עריכת הנסיעה
              </Link>
            </Button>
          ) : canBook ? (
            <>
              <div className="flex items-center justify-between rounded-2xl bg-background/60 p-2">
                <Button variant="ghost" size="icon" onClick={() => setSeats((s) => Math.max(1, s - 1))} aria-label="פחות">
                  <Minus />
                </Button>
                <span className="font-bold">{seats} {seats === 1 ? "מקום" : "מקומות"}</span>
                <Button variant="ghost" size="icon" onClick={() => setSeats((s) => Math.min(left, s + 1))} aria-label="יותר">
                  <Plus />
                </Button>
              </div>
              <div className="flex items-baseline justify-between border-t border-dashed border-border pt-4">
                <span className="text-muted-foreground">סה״כ</span>
                <span className="font-display text-5xl">{fmtPrice(bookingTotal(Number(ride.price), seats))}</span>
              </div>
              <Button asChild variant="hero" size="xl">
                <Link to="/checkout/$rideId" params={{ rideId: ride.id }} search={{ seats }}>
                  להזמנה ותשלום
                </Link>
              </Button>
            </>
          ) : (
            <p className="rounded-2xl bg-muted p-4 text-center font-semibold text-muted-foreground">
              {departed ? "הנסיעה כבר יצאה" : "אין מקומות פנויים"}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function Info({ icon, label, value, wide }: { icon: React.ReactNode; label: string; value: string; wide?: boolean }) {
  return (
    <div className={`flex gap-3 rounded-2xl bg-background/50 p-4 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-signal [&_svg]:size-5">{icon}</span>
      <div>
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="font-semibold">{value}</dd>
      </div>
    </div>
  );
}
