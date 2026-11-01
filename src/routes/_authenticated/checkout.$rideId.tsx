import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Lock, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDay, fmtPrice, fmtTime, meQuery, rideQuery, seatsLeft } from "@/lib/rides";
import {
  ACCEPTED_TEST_CARDS,
  bookingErrorMessage,
  bookingTotal,
  cardBrand,
  formatCardNumber,
  formatExpiry,
  isAcceptedCard,
  isValidExpiry,
  MAX_SEATS_PER_RIDE,
} from "@/lib/payment";
import { Field, Input } from "@/components/field";
import { Button } from "@/components/ui/button";
import { RouteLine } from "@/components/ride-card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/checkout/$rideId")({
  validateSearch: z.object({ seats: z.number().int().min(1).max(MAX_SEATS_PER_RIDE).catch(1) }),
  loader: async ({ context, params }) => {
    const ride = await context.queryClient.ensureQueryData(rideQuery(params.rideId));
    if (!ride) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "תשלום | נתיב" },
      { name: "description", content: "השלמת הזמנת מקום בנסיעה ותשלום בכרטיס אשראי." },
      { property: "og:title", content: "תשלום | נתיב" },
      { property: "og:description", content: "תשלום מאובטח על הזמנת הנסיעה." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { rideId } = Route.useParams();
  const { seats: requested } = Route.useSearch();
  const { data: ride } = useSuspenseQuery(rideQuery(rideId));
  const { data: me } = useQuery(meQuery());
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [card, setCard] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [flip, setFlip] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (me) {
      setEmail((v) => v || me.user.email || "");
      setName((v) => v || me.name);
    }
  }, [me]);

  if (!ride) return null;
  const seats = Math.min(requested, seatsLeft(ride));
  const total = bookingTotal(Number(ride.price), seats);

  async function pay(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!ride) return;
    const emailOk = z.string().trim().email().max(255).safeParse(email);
    if (!name.trim()) { toast.error("נא למלא שם בעל הכרטיס"); return; }
    if (!emailOk.success) { toast.error("כתובת מייל לא תקינה"); return; }
    if (!isAcceptedCard(card)) { toast.error("הכרטיס נדחה. השתמשו באחד מכרטיסי הבדיקה."); return; }
    if (!isValidExpiry(exp)) { toast.error("תוקף הכרטיס לא תקין"); return; }
    if (!/^\d{3,4}$/.test(cvv)) { toast.error("CVV לא תקין"); return; }
    if (seats < 1) { toast.error("אין מקומות פנויים"); return; }

    setPaying(true);
    const { data, error } = await supabase.rpc("book_ride", {
      _ride_id: ride.id,
      _seats: seats,
      _email: emailOk.data,
      _passenger_name: name.trim().slice(0, 100),
      _card_number: card,
    });
    setPaying(false);
    if (error || !data) {
      toast.error(bookingErrorMessage(error?.message ?? ""));
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["rides"] });
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    navigate({ to: "/booking/$bookingId", params: { bookingId: data }, replace: true });
  }

  const brand = cardBrand(card);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/rides/$rideId" params={{ rideId }} className="text-sm text-muted-foreground hover:text-foreground">
        → חזרה לנסיעה
      </Link>
      <h1 className="font-display mt-4 text-7xl md:text-8xl">
        תשלום <span className="text-headlight">מאובטח</span>
      </h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Card preview + summary */}
        <div className="flex flex-col gap-6">
          <div className="[perspective:1200px]">
            <div
              className={cn(
                "relative aspect-[1.586] w-full max-w-md transition-transform duration-700 [transform-style:preserve-3d]",
                flip && "[transform:rotateY(180deg)]",
              )}
            >
              <div className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-3xl bg-headlight p-6 text-primary-foreground shadow-glow [backface-visibility:hidden]">
                <div className="absolute -end-16 -top-16 size-56 rounded-full bg-foreground/15 blur-2xl" />
                <div className="relative flex items-center justify-between">
                  <span className="font-display text-4xl">נתיב</span>
                  <Wifi className="size-6 -rotate-90" />
                </div>
                <div className="relative" dir="ltr">
                  <div className="mb-1 h-8 w-11 rounded-md bg-foreground/30" />
                  <div className="mt-4 font-mono text-xl tracking-[0.18em] md:text-2xl">
                    {formatCardNumber(card).padEnd(19, "•").replace(/(.{4})(?=.)/g, (m) => m)}
                  </div>
                  <div className="mt-4 flex items-end justify-between text-sm">
                    <div>
                      <div className="text-[10px] opacity-70">CARD HOLDER</div>
                      <div className="font-semibold uppercase">{name || "YOUR NAME"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] opacity-70">EXPIRES</div>
                      <div className="font-semibold">{exp || "MM/YY"}</div>
                    </div>
                    <div className="font-display text-2xl italic">{brand}</div>
                  </div>
                </div>
              </div>
              <div className="absolute inset-0 overflow-hidden rounded-3xl bg-secondary [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <div className="mt-8 h-12 bg-background" />
                <div className="mx-6 mt-6 flex h-10 items-center justify-end rounded-md bg-foreground/90 px-4 font-mono text-background" dir="ltr">
                  {cvv || "•••"}
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <div className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">סיכום הזמנה</div>
            <RouteLine from={ride.origin?.name} to={ride.destination?.name} />
            <div className="mt-4 flex justify-between text-sm text-muted-foreground">
              <span>{fmtDay(ride.departure_at)} · {fmtTime(ride.departure_at)}</span>
              <span>{ride.driver_name}</span>
            </div>
            <div className="mt-4 flex justify-between border-t border-dashed border-border pt-4">
              <span>{seats} × {fmtPrice(Number(ride.price))}</span>
              <span className="font-display text-5xl">{fmtPrice(total)}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={pay} className="glass flex flex-col gap-5 rounded-[2rem] p-6 md:p-8">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">כרטיסי בדיקה מאושרים</div>
            <div className="flex flex-wrap gap-2">
              {ACCEPTED_TEST_CARDS.map((c) => (
                <button
                  key={c.number}
                  type="button"
                  dir="ltr"
                  onClick={() => {
                    setCard(formatCardNumber(c.number));
                    if (!exp) setExp("12/29");
                    if (!cvv) setCvv("123");
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 font-mono text-xs transition",
                    formatCardNumber(card) === formatCardNumber(c.number)
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary",
                  )}
                >
                  {c.brand} ···· {c.number.slice(-4)}
                </button>
              ))}
            </div>
          </div>

          <Field label="שם בעל/ת הכרטיס">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="cc-name" />
          </Field>
          <Field label="מייל לאישור ההזמנה">
            <Input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="מספר כרטיס">
            <Input
              dir="ltr"
              inputMode="numeric"
              placeholder="0000 0000 0000 0000"
              value={card}
              onChange={(e) => setCard(formatCardNumber(e.target.value))}
              onFocus={() => setFlip(false)}
              autoComplete="cc-number"
              className="font-mono tracking-widest"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="תוקף">
              <Input
                dir="ltr"
                inputMode="numeric"
                placeholder="MM/YY"
                value={exp}
                onChange={(e) => setExp(formatExpiry(e.target.value))}
                onFocus={() => setFlip(false)}
                autoComplete="cc-exp"
              />
            </Field>
            <Field label="CVV">
              <Input
                dir="ltr"
                inputMode="numeric"
                placeholder="123"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onFocus={() => setFlip(true)}
                onBlur={() => setFlip(false)}
                autoComplete="cc-csc"
              />
            </Field>
          </div>
          <Button type="submit" variant="hero" size="xl" disabled={paying || seats < 1} className="mt-2">
            <Lock /> {paying ? "מעבד תשלום..." : `תשלום ${fmtPrice(total)}`}
          </Button>
          <p className="text-center text-xs text-muted-foreground">מצב בדיקה – לא יבוצע חיוב אמיתי.</p>
        </form>
      </div>
    </div>
  );
}
