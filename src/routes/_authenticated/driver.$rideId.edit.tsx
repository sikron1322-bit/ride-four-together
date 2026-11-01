import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, RotateCcw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { rideQuery } from "@/lib/rides";
import { RideForm, type RideFormValues } from "@/components/ride-form";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/driver/$rideId/edit")({
  loader: async ({ context, params }) => {
    const ride = await context.queryClient.ensureQueryData(rideQuery(params.rideId));
    if (!ride) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "עריכת נסיעה | נתיב" },
      { name: "description", content: "עריכת פרטי נסיעה שפרסמתם." },
      { property: "og:title", content: "עריכת נסיעה | נתיב" },
      { property: "og:description", content: "עדכון זמן, מחיר ומקומות בנסיעה." },
    ],
  }),
  component: EditRidePage,
});

function EditRidePage() {
  const { rideId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const { data: ride } = useSuspenseQuery(rideQuery(rideId));
  const navigate = useNavigate();
  const qc = useQueryClient();

  const done = (msg: string) => {
    qc.invalidateQueries({ queryKey: ["rides"] });
    toast.success(msg);
  };

  const update = useMutation({
    mutationFn: async (v: Partial<RideFormValues> & { status?: string }) => {
      const { error } = await supabase
        .from("rides")
        .update({ ...v, updated_at: new Date().toISOString() })
        .eq("id", rideId);
      if (error) throw error;
    },
    onError: () => toast.error("השמירה נכשלה"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("rides").delete().eq("id", rideId);
      if (error) throw error;
    },
    onSuccess: () => {
      done("הנסיעה נמחקה");
      navigate({ to: "/driver" });
    },
    onError: () => toast.error("לא ניתן למחוק נסיעה עם הזמנות"),
  });

  if (!ride) return null;
  if (ride.driver_id !== user.id) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-6xl">אין הרשאה</h1>
        <p className="mt-2 text-muted-foreground">אפשר לערוך רק נסיעות שפרסמתם.</p>
        <Link to="/driver" className="mt-6 inline-block font-bold text-primary">לנסיעות שלי</Link>
      </div>
    );
  }

  const cancelled = ride.status === "cancelled";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/driver" className="text-sm text-muted-foreground hover:text-foreground">
        → חזרה לנסיעות שלי
      </Link>
      <h1 className="font-display mt-4 mb-2 text-7xl md:text-8xl">
        עריכת <span className="text-headlight">נסיעה</span>
      </h1>
      <p className="mb-8 text-muted-foreground">
        {ride.origin?.name} ← {ride.destination?.name} · {ride.seats_booked} מקומות הוזמנו
      </p>

      <RideForm
        initial={{
          origin_id: ride.origin_id,
          destination_id: ride.destination_id,
          departure_at: ride.departure_at,
          price: Number(ride.price),
          seats_total: ride.seats_total,
          car_model: ride.car_model,
          notes: ride.notes,
        }}
        minSeats={Math.max(1, ride.seats_booked)}
        submitLabel="שמירת שינויים"
        busy={update.isPending}
        onSubmit={(v) =>
          update.mutate(v, {
            onSuccess: () => {
              done("השינויים נשמרו");
              navigate({ to: "/rides/$rideId", params: { rideId } });
            },
          })
        }
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          variant="glass"
          size="xl"
          onClick={() =>
            update.mutate(
              { status: cancelled ? "open" : "cancelled" },
              { onSuccess: () => done(cancelled ? "הנסיעה נפתחה מחדש" : "הנסיעה בוטלה") },
            )
          }
        >
          {cancelled ? <RotateCcw /> : <Ban />} {cancelled ? "פתיחה מחדש" : "ביטול הנסיעה"}
        </Button>
        {ride.seats_booked === 0 && (
          <Button
            variant="destructive"
            size="xl"
            className="rounded-full"
            onClick={() => {
              if (confirm("למחוק את הנסיעה לצמיתות?")) remove.mutate();
            }}
          >
            <Trash2 /> מחיקה
          </Button>
        )}
      </div>
    </div>
  );
}
