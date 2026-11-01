import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, CreditCard, MapPinned, Search, Users } from "lucide-react";
import heroImg from "@/assets/hero-road.jpg";
import { citiesQuery } from "@/lib/rides";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/field";
import { SeatMeter } from "@/components/seat-meter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "נתיב – מעיר לעיר עם נהגים פרטיים" },
      {
        name: "description",
        content: "מצאו מקום ברכב של נהג פרטי בין ערי ישראל. עד 4 נוסעים בנסיעה, הזמנה ותשלום בדקה.",
      },
      { property: "og:title", content: "נתיב – מעיר לעיר עם נהגים פרטיים" },
      { property: "og:description", content: "נסיעות בין עירוניות משותפות: עד 4 נוסעים, נהגים פרטיים, הזמנה מיידית." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: cities = [] } = useQuery(citiesQuery());
  const navigate = useNavigate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function search(e: React.FormEvent) {
    e.preventDefault();
    navigate({
      to: "/rides",
      search: { from: from ? Number(from) : undefined, to: to ? Number(to) : undefined },
    });
  }

  return (
    <div className="-mt-20">
      {/* Hero */}
      <section className="relative min-h-[92vh] overflow-hidden">
        <img
          src={heroImg}
          alt="כביש מתפתל בלילה עם אורות מכוניות"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="bg-fade absolute inset-0" />
        <div className="relative mx-auto flex min-h-[92vh] max-w-6xl flex-col justify-end px-4 pb-16 pt-32">
          <span className="glass mb-6 inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold">
            <span className="size-2 animate-pulse rounded-full bg-success" /> נהגים מפרסמים נסיעות עכשיו
          </span>
          <h1 className="font-display max-w-4xl text-[clamp(4.5rem,13vw,11rem)]">
            מעיר לעיר.
            <br />
            <span className="text-headlight">ביחד.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
            נהגים פרטיים שכבר נוסעים לשם, ומקום פנוי בשבילכם. עד ארבעה נוסעים ברכב, מחיר הוגן, בלי תחנות.
          </p>

          <form
            onSubmit={search}
            className="glass mt-10 grid gap-3 rounded-[2rem] p-3 md:grid-cols-[1fr_1fr_auto]"
          >
            <Select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="מאיפה">
              <option value="">מאיפה יוצאים?</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select value={to} onChange={(e) => setTo(e.target.value)} aria-label="לאן">
              <option value="">לאן נוסעים?</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="hero" size="xl">
              <Search /> חיפוש נסיעה
            </Button>
          </form>
        </div>
      </section>

      {/* Destinations marquee */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-10 flex items-end justify-between gap-4">
          <h2 className="font-display text-6xl md:text-7xl">היעדים שלנו</h2>
          <Link to="/rides" className="flex items-center gap-1 text-sm font-semibold text-primary">
            לכל הנסיעות <ArrowLeft className="size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {cities.map((c, i) => (
            <Link
              key={c.id}
              to="/rides"
              search={{ to: c.id }}
              className={`glass group animate-rise rounded-3xl p-5 transition-transform hover:-translate-y-1 ${i === 0 ? "md:col-span-2 md:row-span-2 md:p-8" : ""}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <MapPinned className="mb-6 size-6 text-signal" />
              <div className={`font-display ${i === 0 ? "text-7xl md:text-8xl" : "text-5xl"}`}>{c.name}</div>
              <div className="mt-2 text-sm text-muted-foreground">{c.tagline}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          <Step n="01" icon={<Search />} title="מוצאים נסיעה" text="בוחרים מוצא ויעד ורואים את כל הנסיעות הפנויות." />
          <Step
            n="02"
            icon={<Users />}
            title="תופסים מקום"
            text={
              <span className="flex items-center gap-3">
                עד 4 נוסעים ברכב <SeatMeter total={4} booked={1} selected={2} />
              </span>
            }
          />
          <Step n="03" icon={<CreditCard />} title="משלמים ויוצאים" text="תשלום מאובטח ואישור הזמנה מיידי עם כל הפרטים." />
        </div>

        <div className="glass relative mt-6 overflow-hidden rounded-[2rem] p-8 md:p-12">
          <div className="absolute -start-20 -top-20 size-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h3 className="font-display text-6xl">יש לכם רכב ומקום פנוי?</h3>
              <p className="mt-2 text-muted-foreground">פרסמו נסיעה בדקה, וחלקו את עלות הדרך עם עד 4 נוסעים.</p>
            </div>
            <Button asChild variant="hero" size="xl">
              <Link to="/driver">פרסום נסיעה</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} נתיב · הסעות מעיר לעיר
      </footer>
    </div>
  );
}

function Step({ n, icon, title, text }: { n: string; icon: React.ReactNode; title: string; text: React.ReactNode }) {
  return (
    <div className="glass rounded-3xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <span className="grid size-11 place-items-center rounded-2xl bg-accent text-accent-foreground [&_svg]:size-5">
          {icon}
        </span>
        <span className="font-display text-5xl text-muted-foreground/40">{n}</span>
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <div className="mt-2 text-sm text-muted-foreground">{text}</div>
    </div>
  );
}
