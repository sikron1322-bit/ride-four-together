<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- App data is read/written from the browser Supabase client under RLS; protected pages live in `src/routes/_authenticated/` (client-only gate). Why: no server secrets are needed yet.
- Seat booking goes only through the `book_ride` database function (atomic seat lock + mock card check); `rides.seats_booked` is never granted for client updates. Why: prevents overbooking.
- The accepted test card list lives in both `src/lib/payment.ts` (UI) and `book_ride` (enforcement); change both together. Why: the database is the source of truth.
- Roles (driver/passenger) live in `user_roles`, checked with `has_role`. Why: no privileges on editable profile data.
- Design tokens live in `src/styles.css` (dark "night highway" theme); the site is Hebrew RTL (`dir="rtl"` on html).
