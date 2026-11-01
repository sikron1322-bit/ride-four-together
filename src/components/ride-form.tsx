import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { z } from "zod";
import { toast } from "sonner";
import { citiesQuery } from "@/lib/rides";
import { MAX_SEATS_PER_RIDE } from "@/lib/payment";
import { Field, Input, Select, Textarea } from "./field";
import { Button } from "./ui/button";
import { SeatMeter } from "./seat-meter";
import { cn } from "@/lib/utils";

export type RideFormValues = {
  origin_id: number;
  destination_id: number;
  departure_at: string;
  price: number;
  seats_total: number;
  car_model: string;
  notes: string;
};

const schema = z
  .object({
    origin_id: z.number({ message: "בחרו עיר מוצא" }).int().positive("בחרו עיר מוצא"),
    destination_id: z.number({ message: "בחרו יעד" }).int().positive("בחרו יעד"),
    departure_at: z.string().min(1, "בחרו תאריך ושעה"),
    price: z.number({ message: "מחיר לא תקין" }).min(0, "מחיר לא תקין").max(1000, "מחיר גבוה מדי"),
    seats_total: z.number().int().min(1).max(MAX_SEATS_PER_RIDE),
    car_model: z.string().trim().max(60, "שם רכב ארוך מדי"),
    notes: z.string().trim().max(300, "הערות ארוכות מדי"),
  })
  .refine((v) => v.origin_id !== v.destination_id, { message: "מוצא ויעד חייבים להיות שונים" })
  .refine((v) => new Date(v.departure_at) > new Date(), { message: "זמן היציאה חייב להיות בעתיד" });

export function RideForm({
  initial,
  minSeats = 1,
  submitLabel,
  onSubmit,
  busy,
}: {
  initial?: Partial<RideFormValues>;
  minSeats?: number;
  submitLabel: string;
  onSubmit: (v: RideFormValues) => void;
  busy?: boolean;
}) {
  const { data: cities = [] } = useQuery(citiesQuery());
  const init = initial?.departure_at ? new Date(initial.departure_at) : null;
  const [origin, setOrigin] = useState(initial?.origin_id ? String(initial.origin_id) : "");
  const [dest, setDest] = useState(initial?.destination_id ? String(initial.destination_id) : "");
  const [date, setDate] = useState(init ? format(init, "yyyy-MM-dd") : "");
  const [time, setTime] = useState(init ? format(init, "HH:mm") : "08:00");
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : "");
  const [seats, setSeats] = useState(initial?.seats_total ?? MAX_SEATS_PER_RIDE);
  const [car, setCar] = useState(initial?.car_model ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const departure = date && time ? new Date(`${date}T${time}`) : null;
    const parsed = schema.safeParse({
      origin_id: Number(origin),
      destination_id: Number(dest),
      departure_at: departure && !isNaN(departure.getTime()) ? departure.toISOString() : "",
      price: price === "" ? NaN : Number(price),
      seats_total: seats,
      car_model: car,
      notes,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "שגיאה בטופס");
      return;
    }
    onSubmit(parsed.data);
  }

  return (
    <form onSubmit={submit} className="glass flex flex-col gap-6 rounded-[2rem] p-6 md:p-10">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="יוצאים מ">
          <Select value={origin} onChange={(e) => setOrigin(e.target.value)}>
            <option value="">בחרו עיר</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="נוסעים ל">
          <Select value={dest} onChange={(e) => setDest(e.target.value)}>
            <option value="">בחרו עיר</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id} disabled={String(c.id) === origin}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="תאריך">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={format(new Date(), "yyyy-MM-dd")} />
        </Field>
        <Field label="שעת יציאה">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="מחיר למקום (₪)">
          <Input type="number" inputMode="decimal" min={0} max={1000} value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="דגם רכב">
          <Input value={car} onChange={(e) => setCar(e.target.value)} maxLength={60} placeholder="לדוגמה: טויוטה קורולה" />
        </Field>
      </div>

      <Field label="כמה מקומות פנויים?" hint={minSeats > 1 ? `כבר הוזמנו ${minSeats} מקומות – אי אפשר לרדת מתחת.` : "עד 4 נוסעים בנסיעה"}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            {Array.from({ length: MAX_SEATS_PER_RIDE }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                disabled={n < minSeats}
                onClick={() => setSeats(n)}
                className={cn(
                  "font-display size-14 rounded-2xl border text-3xl transition disabled:opacity-30",
                  seats === n ? "border-primary bg-headlight text-primary-foreground shadow-glow" : "border-border hover:border-primary",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <SeatMeter total={seats} booked={0} className="[&>span]:h-8 [&>span]:w-6" />
        </div>
      </Field>

      <Field label="הערות לנוסעים">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="נקודת איסוף, מקום למזוודות, עצירות בדרך..." />
      </Field>

      <Button type="submit" variant="hero" size="xl" disabled={busy}>
        {busy ? "שומר..." : submitLabel}
      </Button>
    </form>
  );
}
