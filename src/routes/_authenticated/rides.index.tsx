import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeftRight } from "lucide-react";
import { z } from "zod";
import { citiesQuery, openRidesQuery } from "@/lib/rides";
import { RideCard } from "@/components/ride-card";
import { Select } from "@/components/field";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  from: z.number().int().positive().optional(),
  to: z.number().int().positive().optional(),
});

export const Route = createFileRoute("/_authenticated/rides/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    context.queryClient.ensureQueryData(citiesQuery());
    return context.queryClient.ensureQueryData(openRidesQuery(deps));
  },
  head: () => ({
    meta: [
      { title: "נסיעות פנויות | נתיב" },
      { name: "description", content: "כל הנסיעות הבין עירוניות שפורסמו ויש בהן מקום פנוי." },
      { property: "og:title", content: "נסיעות פנויות | נתיב" },
      { property: "og:description", content: "מצאו מקום פנוי ברכב לנסיעה הבאה שלכם." },
    ],
  }),
  component: RidesPage,
});

function RidesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/rides" });
  const { data: cities = [] } = useQuery(citiesQuery());
  const { data: rides } = useSuspenseQuery(openRidesQuery(search));

  const set = (key: "from" | "to", v: string) =>
    navigate({ search: (prev) => ({ ...prev, [key]: v ? Number(v) : undefined }) });

  const swap = () => navigate({ search: { from: search.to, to: search.from } });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-7xl md:text-8xl">
        נסיעות <span className="text-headlight">פנויות</span>
      </h1>
      <p className="mt-2 text-muted-foreground">{rides.length} נסיעות קרובות מחכות לכם</p>

      <div className="glass sticky top-24 z-30 mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[1.75rem] p-2">
        <Select value={search.from ?? ""} onChange={(e) => set("from", e.target.value)} aria-label="מוצא">
          <option value="">כל המוצאים</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Button variant="ghost" size="icon" onClick={swap} aria-label="החלפת כיוון" className="rounded-full">
          <ArrowLeftRight />
        </Button>
        <Select value={search.to ?? ""} onChange={(e) => set("to", e.target.value)} aria-label="יעד">
          <option value="">כל היעדים</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {rides.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
            <div className="font-display text-5xl">אין עדיין נסיעות במסלול הזה</div>
            <p className="mt-2 text-muted-foreground">נסו מסלול אחר או חזרו מאוחר יותר.</p>
          </div>
        ) : (
          rides.map((r, i) => <RideCard key={r.id} ride={r} index={i} />)
        )}
      </div>
    </div>
  );
}
