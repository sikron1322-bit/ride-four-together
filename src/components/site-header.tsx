import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/rides";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/rides", label: "נסיעות פנויות" },
  { to: "/bookings", label: "ההזמנות שלי" },
  { to: "/driver", label: "לנהגים" },
] as const;

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="נתיב – דף הבית">
      <span className="relative grid size-9 place-items-center rounded-xl bg-headlight shadow-glow">
        <span className="font-display text-2xl text-primary-foreground">נ</span>
      </span>
      <span className="font-display text-4xl tracking-wide">
        נתיב<span className="text-primary">.</span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const { data: me } = useQuery(meQuery());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <div className="glass mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 py-2 md:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {me ? (
            <>
              <span className="text-sm text-muted-foreground">
                שלום, <span className="font-semibold text-foreground">{me.name}</span>
                {me.isDriver && (
                  <span className="ms-2 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                    נהג/ת
                  </span>
                )}
              </span>
              <Button variant="ghost" size="icon" onClick={signOut} aria-label="התנתקות">
                <LogOut />
              </Button>
            </>
          ) : (
            <Button asChild variant="hero" size="sm" className="px-5">
              <Link to="/auth">התחברות</Link>
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="תפריט"
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && (
        <div className="glass mx-auto mt-2 flex max-w-6xl flex-col gap-1 rounded-3xl p-3 md:hidden">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="rounded-2xl px-4 py-3 font-semibold hover:bg-secondary"
            >
              {l.label}
            </Link>
          ))}
          {me ? (
            <button
              onClick={signOut}
              className="rounded-2xl px-4 py-3 text-start font-semibold text-muted-foreground hover:bg-secondary"
            >
              התנתקות ({me.name})
            </button>
          ) : (
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="rounded-2xl bg-headlight px-4 py-3 text-center font-bold text-primary-foreground"
            >
              התחברות
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
