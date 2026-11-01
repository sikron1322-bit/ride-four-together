import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { fmtDay, fmtPrice, fmtTime, myBookingsQuery } from "@/lib/rides";
import { RouteLine } from "@/components/ride-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/bookings")({
  loader: ({ context }) => context.queryClient.ensureQueryData(myBookingsQuery(context.user.id)),
  head: () => ({
    meta: [
      { title: "ההזמנות שלי | נתיב" },
      { name: "description", content: "כל הנסיעות שהזמנתם בנתיב." },
      { property: "og:title", content: "ההזמנות שלי | נתיב" },
      { property: "og:description", content: "רשימת ההזמנות שלכם." },
    ],
  }),
  component: BookingsPage,
});

function BookingsPage() {
  const { user } = Route.useRouteContext();
  const { data: bookings } = useSuspenseQuery(myBookingsQuery(user.id));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-7xl md:text-8xl">
        ההזמנות <span className="text-headlight">שלי</span>
      </h1>
      <div className="mt-8 flex flex-col gap-4">
        {bookings.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
            <div className="font-display text-5xl">עוד לא הזמנתם נסיעה</div>
            <Button asChild variant="hero" size="xl" className="mt-6">
              <Link to="/rides">למציאת נסיעה</Link>
            </Button>
          </div>
        ) : (
          bookings.map((b, i) => (
            <Link
              key={b.id}
              to="/booking/$bookingId"
              params={{ bookingId: b.id }}
              className="glass animate-rise flex flex-col gap-4 rounded-3xl p-5 transition-transform hover:-translate-y-1 md:flex-row md:items-center"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="font-display text-5xl text-headlight">{b.ride ? fmtTime(b.ride.departure_at) : ""}</div>
              <div className="flex-1">
                <RouteLine from={b.ride?.origin?.name} to={b.ride?.destination?.name} />
                <div className="mt-2 text-sm text-muted-foreground">
                  {b.ride ? fmtDay(b.ride.departure_at) : ""} · {b.seats} מקומות · {b.ride?.driver_name}
                </div>
              </div>
              <div className="font-display text-4xl">{fmtPrice(Number(b.total_price))}</div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
