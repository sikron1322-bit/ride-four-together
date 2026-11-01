import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, Mail, Printer } from "lucide-react";
import { bookingQuery, fmtDay, fmtPrice, fmtTime } from "@/lib/rides";
import { RouteLine } from "@/components/ride-card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site-header";

export const Route = createFileRoute("/_authenticated/booking/$bookingId")({
  loader: async ({ context, params }) => {
    const b = await context.queryClient.ensureQueryData(bookingQuery(params.bookingId));
    if (!b) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "אישור הזמנה | נתיב" },
      { name: "description", content: "אישור הזמנת הנסיעה שלכם בנתיב." },
      { property: "og:title", content: "אישור הזמנה | נתיב" },
      { property: "og:description", content: "ההזמנה אושרה – כל הפרטים לנסיעה." },
    ],
  }),
  component: BookingPage,
});

function BookingPage() {
  const { bookingId } = Route.useParams();
  const { data: b } = useSuspenseQuery(bookingQuery(bookingId));
  if (!b || !b.ride) return null;
  const ride = b.ride;
  const code = b.id.slice(0, 8).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="animate-rise text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-headlight shadow-glow">
          <Check className="size-10 text-primary-foreground" strokeWidth={3} />
        </div>
        <h1 className="font-display mt-6 text-7xl md:text-8xl">ההזמנה אושרה!</h1>
        <p className="mt-2 text-muted-foreground">שמרנו לכם {b.seats === 1 ? "מקום" : `${b.seats} מקומות`} ברכב. נסיעה טובה!</p>
      </div>

      {/* Email-style confirmation */}
      <div className="glass animate-rise mt-10 overflow-hidden rounded-[2rem]" style={{ animationDelay: "120ms" }}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-border bg-background/40 px-6 py-4 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Mail className="size-4 text-signal" /> אל:
            <span className="font-semibold text-foreground" dir="ltr">{b.email}</span>
          </span>
          <span className="text-muted-foreground">
            נושא: <span className="text-foreground">אישור הזמנה {code} – {ride.origin?.name} ← {ride.destination?.name}</span>
          </span>
        </div>

        <div className="p-6 md:p-10">
          <div className="flex items-center justify-between">
            <Logo />
            <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">מאושר</span>
          </div>
          <p className="mt-8">שלום {b.passenger_name || ""},</p>
          <p className="mt-2 text-muted-foreground">תודה שהזמנת נסיעה עם נתיב. אלו פרטי ההזמנה שלך:</p>

          <div className="ticket mt-8 rounded-3xl bg-background/60 p-6">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-6xl text-headlight">{fmtTime(ride.departure_at)}</span>
              <span className="text-sm text-muted-foreground">{fmtDay(ride.departure_at)}</span>
            </div>
            <div className="mt-6">
              <RouteLine from={ride.origin?.name} to={ride.destination?.name} big />
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <Row label="מספר הזמנה" value={code} mono />
            <Row label="נהג/ת" value={ride.driver_name} />
            <Row label="רכב" value={ride.car_model || "—"} />
            <Row label="מקומות" value={String(b.seats)} />
            <Row label="אמצעי תשלום" value={`···· ${b.card_last4}`} mono />
            <Row label="סה״כ שולם" value={fmtPrice(Number(b.total_price))} />
          </dl>
          {ride.notes && <p className="mt-6 rounded-2xl bg-background/50 p-4 text-sm text-muted-foreground">הערת הנהג: {ride.notes}</p>}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3 print:hidden">
        <Button variant="hero" size="xl" asChild>
          <Link to="/bookings">ההזמנות שלי</Link>
        </Button>
        <Button variant="glass" size="xl" onClick={() => window.print()}>
          <Printer /> הדפסה
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`mt-1 font-semibold ${mono ? "font-mono" : ""}`} dir={mono ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}
