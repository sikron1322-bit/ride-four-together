-- Roles
CREATE TYPE public.app_role AS ENUM ('driver', 'passenger');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by signed-in users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Signup: create profile + initial role (only driver/passenger, never anything else)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role := 'passenger';
BEGIN
  IF NEW.raw_user_meta_data->>'role' = 'driver' THEN
    _role := 'driver';
  END IF;
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'passenger') ON CONFLICT DO NOTHING;
  IF _role = 'driver' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'driver') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Any signed-in user can switch on driver mode for themselves
CREATE OR REPLACE FUNCTION public.become_driver()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'driver') ON CONFLICT DO NOTHING;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.become_driver() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.become_driver() TO authenticated;

-- Cities
CREATE TABLE public.cities (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  tagline text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.cities TO anon, authenticated;
GRANT ALL ON public.cities TO service_role;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cities are public" ON public.cities FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.cities (name, tagline) VALUES
 ('תל אביב', 'העיר שלא עוצרת'),
 ('ירושלים', 'עיר הבירה'),
 ('חיפה', 'בין הים לכרמל'),
 ('באר שבע', 'בירת הנגב'),
 ('אילת', 'עיר הנופש הדרומית'),
 ('נתניה', 'פנינת השרון'),
 ('טבריה', 'על שפת הכנרת');

-- Rides
CREATE TABLE public.rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid,
  driver_name text NOT NULL,
  car_model text NOT NULL DEFAULT '',
  origin_id int NOT NULL REFERENCES public.cities(id),
  destination_id int NOT NULL REFERENCES public.cities(id),
  departure_at timestamptz NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  seats_total int NOT NULL DEFAULT 4 CHECK (seats_total BETWEEN 1 AND 4),
  seats_booked int NOT NULL DEFAULT 0 CHECK (seats_booked >= 0),
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seats_not_overbooked CHECK (seats_booked <= seats_total),
  CONSTRAINT different_cities CHECK (origin_id <> destination_id)
);
GRANT SELECT, DELETE ON public.rides TO authenticated;
GRANT INSERT (driver_id, driver_name, car_model, origin_id, destination_id, departure_at, price, seats_total, notes) ON public.rides TO authenticated;
GRANT UPDATE (driver_name, car_model, origin_id, destination_id, departure_at, price, seats_total, notes, status, updated_at) ON public.rides TO authenticated;
GRANT ALL ON public.rides TO service_role;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users see rides" ON public.rides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Drivers publish own rides" ON public.rides FOR INSERT TO authenticated
  WITH CHECK (driver_id = auth.uid() AND public.has_role(auth.uid(), 'driver'));
CREATE POLICY "Drivers edit own rides" ON public.rides FOR UPDATE TO authenticated
  USING (driver_id = auth.uid()) WITH CHECK (driver_id = auth.uid());
CREATE POLICY "Drivers delete own unbooked rides" ON public.rides FOR DELETE TO authenticated
  USING (driver_id = auth.uid() AND seats_booked = 0);

CREATE INDEX rides_route_idx ON public.rides (origin_id, destination_id, departure_at);

-- Bookings
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE RESTRICT,
  passenger_id uuid NOT NULL,
  seats int NOT NULL CHECK (seats BETWEEN 1 AND 4),
  total_price numeric(10,2) NOT NULL,
  email text NOT NULL,
  passenger_name text NOT NULL DEFAULT '',
  card_last4 text NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Passengers see own bookings" ON public.bookings FOR SELECT TO authenticated USING (passenger_id = auth.uid());
CREATE POLICY "Drivers see bookings on their rides" ON public.bookings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_id AND r.driver_id = auth.uid()));

-- Atomic booking with mock card check. Accepted test cards are the only valid payment for now.
CREATE OR REPLACE FUNCTION public.book_ride(_ride_id uuid, _seats int, _email text, _passenger_name text, _card_number text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ride public.rides%ROWTYPE;
  _card text := regexp_replace(COALESCE(_card_number, ''), '\D', '', 'g');
  _booking_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _seats IS NULL OR _seats < 1 OR _seats > 4 THEN RAISE EXCEPTION 'invalid seats'; END IF;
  IF _email IS NULL OR _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(_email) > 255 THEN RAISE EXCEPTION 'invalid email'; END IF;
  IF _card NOT IN ('4580000000000000', '5326100000000000', '4111111111111111') THEN
    RAISE EXCEPTION 'card declined';
  END IF;

  SELECT * INTO _ride FROM public.rides WHERE id = _ride_id FOR UPDATE;
  IF NOT FOUND OR _ride.status <> 'open' THEN RAISE EXCEPTION 'ride unavailable'; END IF;
  IF _ride.departure_at < now() THEN RAISE EXCEPTION 'ride departed'; END IF;
  IF _ride.driver_id = auth.uid() THEN RAISE EXCEPTION 'cannot book own ride'; END IF;
  IF _ride.seats_total - _ride.seats_booked < _seats THEN RAISE EXCEPTION 'not enough seats'; END IF;

  UPDATE public.rides SET seats_booked = seats_booked + _seats WHERE id = _ride_id;
  INSERT INTO public.bookings (ride_id, passenger_id, seats, total_price, email, passenger_name, card_last4)
  VALUES (_ride_id, auth.uid(), _seats, _ride.price * _seats, _email, left(COALESCE(_passenger_name, ''), 100), right(_card, 4))
  RETURNING id INTO _booking_id;
  RETURN _booking_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.book_ride(uuid, int, text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.book_ride(uuid, int, text, text, text) TO authenticated;

-- Demo rides from starter drivers
INSERT INTO public.rides (driver_name, car_model, origin_id, destination_id, departure_at, price, seats_total, seats_booked, notes) VALUES
 ('יוסי כהן', 'טויוטה קורולה היברידית', 1, 2, date_trunc('hour', now()) + interval '1 day 8 hours', 45, 4, 1, 'יציאה מתחנת ארלוזורוב, אפשר לעצור בשער הגיא'),
 ('מיכל לוי', 'קיה ניירו EV', 2, 1, date_trunc('hour', now()) + interval '1 day 17 hours', 45, 4, 2, 'רכב חשמלי ושקט, בלי עישון'),
 ('אבי מזרחי', 'יונדאי טוסון', 1, 3, date_trunc('hour', now()) + interval '2 days 7 hours', 55, 4, 0, 'יציאה מהשלום, הגעה לחוף הכרמל'),
 ('נועה פרץ', 'מאזדה 3', 3, 1, date_trunc('hour', now()) + interval '2 days 18 hours', 55, 3, 1, 'מקום לתיק קטן לכל נוסע'),
 ('דניאל אברהם', 'סקודה אוקטביה', 1, 4, date_trunc('hour', now()) + interval '3 days 9 hours', 60, 4, 3, 'נוסעים דרך כביש 6'),
 ('שירה בן דוד', 'טסלה מודל 3', 4, 5, date_trunc('hour', now()) + interval '4 days 6 hours', 95, 4, 0, 'נסיעה ארוכה עם עצירת קפה במצפה רמון'),
 ('יוסי כהן', 'טויוטה קורולה היברידית', 6, 2, date_trunc('hour', now()) + interval '3 days 16 hours', 50, 4, 0, ''),
 ('מיכל לוי', 'קיה ניירו EV', 1, 7, date_trunc('hour', now()) + interval '5 days 10 hours', 65, 4, 1, 'סופ״ש בכנרת');
