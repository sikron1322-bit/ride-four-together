// Mock payment rules. The database (book_ride) enforces the same card list.
export const MAX_SEATS_PER_RIDE = 4;

export const ACCEPTED_TEST_CARDS = [
  { number: "4580000000000000", brand: "Visa" },
  { number: "5326100000000000", brand: "Mastercard" },
  { number: "4111111111111111", brand: "Visa" },
] as const;

export function normalizeCardNumber(input: string): string {
  return input.replace(/\D/g, "");
}

export function isAcceptedCard(input: string): boolean {
  const n = normalizeCardNumber(input);
  return ACCEPTED_TEST_CARDS.some((c) => c.number === n);
}

export function formatCardNumber(input: string): string {
  return normalizeCardNumber(input)
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export function cardBrand(input: string): string {
  const n = normalizeCardNumber(input);
  if (n.startsWith("4")) return "VISA";
  if (/^5[1-5]/.test(n)) return "MASTERCARD";
  return "";
}

export function formatExpiry(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export function isValidExpiry(input: string, now = new Date()): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(input);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  const endOfMonth = new Date(year, month, 1);
  return endOfMonth > now;
}

export function bookingTotal(pricePerSeat: number, seats: number): number {
  return Math.round(pricePerSeat * seats * 100) / 100;
}

export function bookingErrorMessage(raw: string): string {
  if (raw.includes("card declined")) return "הכרטיס נדחה. נסו אחד מכרטיסי הבדיקה.";
  if (raw.includes("not enough seats")) return "אין מספיק מקומות פנויים בנסיעה הזו.";
  if (raw.includes("ride departed")) return "הנסיעה כבר יצאה לדרך.";
  if (raw.includes("cannot book own ride")) return "לא ניתן להזמין מקום בנסיעה שפרסמת.";
  if (raw.includes("ride unavailable")) return "הנסיעה אינה זמינה יותר.";
  if (raw.includes("invalid email")) return "כתובת המייל אינה תקינה.";
  return "משהו השתבש בתשלום. נסו שוב.";
}
