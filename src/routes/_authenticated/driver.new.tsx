import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/rides";
import { RideForm, type RideFormValues } from "@/components/ride-form";

export const Route = createFileRoute("/_authenticated/driver/new")({
  head: () => ({
    meta: [
      { title: "פרסום נסיעה | נתיב" },
      { name: "description", content: "פרסמו נסיעה חדשה מעיר לעיר והזמינו עד 4 נוסעים." },
      { property: "og:title", content: "פרסום נסיעה | נתיב" },
      { property: "og:description", content: "פרסום נסיעה חדשה לנוסעים." },
    ],
  }),
  component: NewRidePage,
});

function NewRidePage() {
  const { user } = Route.useRouteContext();
  const { data: me } = useQuery(meQuery());
  const navigate = useNavigate();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (v: RideFormValues) => {
      const { data, error } = await supabase
        .from("rides")
        .insert({ ...v, driver_id: user.id, driver_name: me?.name || "נהג/ת" })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["rides"] });
      toast.success("הנסיעה פורסמה!");
      navigate({ to: "/rides/$rideId", params: { rideId: id } });
    },
    onError: () => toast.error("לא הצלחנו לפרסם. ודאו שמצב נהג פעיל."),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/driver" className="text-sm text-muted-foreground hover:text-foreground">
        → חזרה לנסיעות שלי
      </Link>
      <h1 className="font-display mt-4 mb-8 text-7xl md:text-8xl">
        נסיעה <span className="text-headlight">חדשה</span>
      </h1>
      {me && !me.isDriver ? (
        <div className="glass rounded-3xl p-10 text-center">
          <p className="text-muted-foreground">כדי לפרסם נסיעה צריך להפעיל מצב נהג.</p>
          <Link to="/driver" className="mt-4 inline-block font-bold text-primary">
            להפעלת מצב נהג
          </Link>
        </div>
      ) : (
        <RideForm submitLabel="פרסום הנסיעה" onSubmit={(v) => create.mutate(v)} busy={create.isPending} />
      )}
    </div>
  );
}
