import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Car, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtDay, fmtPrice, fmtTime, meQuery, myDriverRidesQuery, seatsLeft } from "@/lib/rides";
import { RouteLine } from "@/components/ride-card";
import { SeatMeter } from "@/components/seat-meter";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/driver/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(myDriverRidesQuery(context.user.id)),
  head: () => ({
    meta: [
      { title: "אזור הנהגים | נתיב" },
      { name: "description", content: "פרסום וניהול הנסיעות שלכם כנהגים בנתיב." },
      { property: "og:title", content: "אזור הנהגים | נתיב" },
      { property: "og:description", content: "פרסמו נסיעה ומלאו את הרכב בנוסעים." },
    ],
  }),
  component: DriverPage,
});

function DriverPage() {
  const { user } = Route.useRouteContext();
  const { data: me, isLoading } = useQuery(meQuery());
  const { data: rides } = useSuspenseQuery(myDriverRidesQuery(user.id));
  const qc = useQueryClient();

  const become = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("become_driver");
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("ברוכים הבאים לצוות הנהגים!");
    },
    onError: () => toast.error("לא הצלחנו להפעיל מצב נהג"),
  });

  if (isLoading) return null;

  if (!me?.isDriver) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Car className="mx-auto size-14 text-primary" />
        <h1 className="font-display mt-6 text-7xl md:text-8xl">רוצים לנהוג?</h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          הפעילו מצב נהג כדי לפרסם נסיעות בין ערים ולהסיע עד 4 נוסעים בכל נסיעה.
        </p>
        <Button variant="hero" size="xl" className="mt-8" onClick={() => become.mutate()} disabled={become.isPending}>
          הפעלת מצב נהג
        </Button>
      </div>
    );
  }

  const upcoming = rides.filter((r) => new Date(r.departure_at) >= new Date());
  const past = rides.filter((r) => new Date(r.departure_at) < new Date());
  const passengers = upcoming.reduce((s, r) => s + r.seats_booked, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-7xl md:text-8xl">
          הנסיעות <span className="text-headlight">שלי</span>
        </h1>
        <Button asChild variant="hero" size="xl">
          <Link to="/driver/new">
            <Plus /> פרסום נסיעה
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="נסיעות קרובות" value={upcoming.length} />
        <Stat label="נוסעים רשומים" value={passengers} />
        <Stat label="מקומות פנויים" value={upcoming.reduce((s, r) => s + seatsLeft(r), 0)} className="col-span-2 md:col-span-1" />
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {upcoming.length === 0 && (
          <div className="glass rounded-3xl p-12 text-center text-muted-foreground">עדיין אין נסיעות מתוכננות. פרסמו את הראשונה!</div>
        )}
        {[...upcoming].reverse().map((r, i) => (
          <article
            key={r.id}
            className="glass animate-rise flex flex-col gap-4 rounded-3xl p-5 md:flex-row md:items-center"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="font-display text-5xl text-headlight">{fmtTime(r.departure_at)}</div>
            <div className="flex-1">
              <RouteLine from={r.origin?.name} to={r.destination?.name} />
              <div className="mt-2 text-sm text-muted-foreground">
                {fmtDay(r.departure_at)} · {fmtPrice(Number(r.price))} למקום
                {r.status === "cancelled" && <span className="ms-2 font-bold text-destructive">בוטלה</span>}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <SeatMeter total={r.seats_total} booked={r.seats_booked} />
              <Button asChild variant="glass" size="sm" className="h-10 px-4">
                <Link to="/driver/$rideId/edit" params={{ rideId: r.id }}>
                  <Pencil /> עריכה
                </Link>
              </Button>
            </div>
          </article>
        ))}
        {past.length > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">{past.length} נסיעות שהסתיימו</p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className={`glass rounded-3xl p-5 ${className ?? ""}`}>
      <div className="font-display text-6xl">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
