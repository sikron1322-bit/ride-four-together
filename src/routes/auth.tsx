import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Car, UserRound } from "lucide-react";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/field";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "התחברות | נתיב" },
      { name: "description", content: "התחברו או הירשמו לנתיב כנוסעים או כנהגים." },
      { property: "og:title", content: "התחברות | נתיב" },
      { property: "og:description", content: "כניסה לחשבון נתיב – נסיעות בין עירוניות." },
    ],
  }),
  component: AuthPage,
});

const credsSchema = z.object({
  email: z.string().trim().email("כתובת מייל לא תקינה").max(255),
  password: z.string().min(6, "סיסמה של 6 תווים לפחות").max(72),
  fullName: z.string().trim().max(100),
});

function safePath(p?: string) {
  if (!p) return "/rides";
  try {
    const u = new URL(p, window.location.origin);
    if (u.origin !== window.location.origin) return "/rides";
    return u.pathname + u.search;
  } catch {
    return "/rides";
  }
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<"passenger" | "driver">("passenger");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credsSchema.safeParse({ email, password, fullName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "שגיאה בטופס");
      return;
    }
    if (mode === "signup" && !parsed.data.fullName) {
      toast.error("נא למלא שם מלא");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        navigate({ href: safePath(redirect), replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: parsed.data.fullName, role },
          },
        });
        if (error) throw error;
        if (data.session) navigate({ href: safePath(redirect), replace: true });
        else setSent(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        msg.includes("Invalid login") ? "מייל או סיסמה שגויים" : msg.includes("already") ? "המשתמש כבר רשום" : "משהו השתבש, נסו שוב",
      );
    } finally {
      setLoading(false);
    }
  }

  async function oauth(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("ההתחברות נכשלה");
      return;
    }
    if (result.redirected) return;
    navigate({ href: safePath(redirect), replace: true });
  }

  return (
    <div className="mx-auto grid min-h-[85vh] max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2">
      <div className="hidden md:block">
        <h1 className="font-display text-[8rem]">
          הדרך
          <br />
          <span className="text-headlight">מתחילה כאן.</span>
        </h1>
        <p className="mt-4 max-w-sm text-lg text-muted-foreground">
          נוסעים מוצאים מקום. נהגים ממלאים את הרכב. כולם מגיעים.
        </p>
      </div>

      <div className="glass mx-auto w-full max-w-md rounded-[2rem] p-6 md:p-8">
        {sent ? (
          <div className="py-10 text-center">
            <div className="font-display text-6xl text-headlight">בדקו את המייל</div>
            <p className="mt-4 text-muted-foreground">
              שלחנו קישור אימות אל <span className="font-semibold text-foreground">{email}</span>. לחצו עליו כדי להשלים את
              ההרשמה.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 rounded-full bg-background/60 p-1">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-full py-2.5 text-sm font-bold transition",
                    mode === m ? "bg-headlight text-primary-foreground shadow-glow" : "text-muted-foreground",
                  )}
                >
                  {m === "signin" ? "התחברות" : "הרשמה"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4">
              {mode === "signup" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <RoleCard active={role === "passenger"} onClick={() => setRole("passenger")} icon={<UserRound />} title="נוסע/ת" text="מחפש/ת מקום" />
                    <RoleCard active={role === "driver"} onClick={() => setRole("driver")} icon={<Car />} title="נהג/ת" text="מפרסם/ת נסיעות" />
                  </div>
                  <Field label="שם מלא">
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" maxLength={100} />
                  </Field>
                </>
              )}
              <Field label="מייל">
                <Input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </Field>
              <Field label="סיסמה">
                <Input
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </Field>
              <Button type="submit" variant="hero" size="xl" disabled={loading} className="mt-2">
                {loading ? "רגע..." : mode === "signin" ? "כניסה" : "יצירת חשבון"}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> או <span className="h-px flex-1 bg-border" />
            </div>
            <div className="flex flex-col gap-3">
              <Button variant="glass" size="xl" onClick={() => oauth("google")}>
                <GoogleIcon /> המשך עם Google
              </Button>
              <button type="button" className="lovable-auth-button" onClick={() => oauth("lovable")}>
                Continue with Lovable
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RoleCard({
  active,
  onClick,
  icon,
  title,
  text,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-2xl border p-4 text-start transition [&_svg]:size-5",
        active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-muted-foreground",
      )}
    >
      <span className={active ? "text-primary" : ""}>{icon}</span>
      <span className="font-bold">{title}</span>
      <span className="text-xs">{text}</span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.68 3.7 14.55 2.75 12 2.75 6.9 2.75 2.75 6.9 2.75 12S6.9 21.25 12 21.25c5.34 0 8.88-3.75 8.88-9.04 0-.6-.07-1.06-.15-1.51z" />
    </svg>
  );
}
