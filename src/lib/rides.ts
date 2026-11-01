import { queryOptions } from "@tanstack/react-query";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type City = Tables<"cities">;
export type Ride = Tables<"rides"> & {
  origin: { name: string } | null;
  destination: { name: string } | null;
};
export type Booking = Tables<"bookings"> & { ride: Ride | null };

const RIDE_SELECT =
  "*, origin:cities!rides_origin_id_fkey(name), destination:cities!rides_destination_id_fkey(name)";

export const citiesQuery = () =>
  queryOptions({
    queryKey: ["cities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cities").select("*").order("id");
      if (error) throw error;
      return data as City[];
    },
    staleTime: 1000 * 60 * 30,
  });

export const openRidesQuery = (filters: { from?: number | undefined; to?: number | undefined }) =>
  queryOptions({
    queryKey: ["rides", "open", filters],
    queryFn: async () => {
      let q = supabase
        .from("rides")
        .select(RIDE_SELECT)
        .eq("status", "open")
        .gte("departure_at", new Date().toISOString())
        .order("departure_at");
      if (filters.from) q = q.eq("origin_id", filters.from);
      if (filters.to) q = q.eq("destination_id", filters.to);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Ride[];
    },
  });

export const rideQuery = (id: string) =>
  queryOptions({
    queryKey: ["rides", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select(RIDE_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Ride | null;
    },
  });

export const myDriverRidesQuery = (userId: string) =>
  queryOptions({
    queryKey: ["rides", "mine", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rides")
        .select(RIDE_SELECT)
        .eq("driver_id", userId)
        .order("departure_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Ride[];
    },
  });

export const bookingQuery = (id: string) =>
  queryOptions({
    queryKey: ["bookings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`*, ride:rides(${RIDE_SELECT})`)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Booking | null;
    },
  });

export const myBookingsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["bookings", "mine", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`*, ride:rides(${RIDE_SELECT})`)
        .eq("passenger_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Booking[];
    },
  });

export const meQuery = () =>
  queryOptions({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const roleList = (roles ?? []).map((r) => r.role);
      return {
        user,
        profile,
        isDriver: roleList.includes("driver"),
        name: profile?.full_name || user.email?.split("@")[0] || "",
      };
    },
  });

export const seatsLeft = (r: Pick<Ride, "seats_total" | "seats_booked">) =>
  Math.max(0, r.seats_total - r.seats_booked);

export const fmtTime = (iso: string) => format(new Date(iso), "HH:mm");
export const fmtDay = (iso: string) => format(new Date(iso), "EEEE, d בMMMM", { locale: he });
export const fmtShortDay = (iso: string) => format(new Date(iso), "d.M", { locale: he });
export const fmtPrice = (n: number) => `₪${Number(n).toLocaleString("he-IL")}`;
