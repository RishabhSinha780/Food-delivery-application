# Audit & Upgrade Plan — Provender Food Delivery

I read the existing codebase, DB schema, RLS policies, and recent runtime errors. Below is what already works, what's broken, and a phased plan that **preserves** the current schema, pages, and design.

---

## 1. Current State (what already works)

- **Auth**: Email/password signup + login, forgot/reset password, password strength meter, role assignment on signup (`customer | owner | delivery | admin`) via `handle_new_user` trigger.
- **Schema** is solid: `profiles`, `user_roles` (separate table — good), `restaurants`, `menu_items`, `orders`, `order_items`, `deliveries`, `addresses`, `reviews`. RLS is enabled everywhere with `has_role()` security-definer function.
- **Pages exist**: Index, RestaurantDetail, Cart, Checkout, Orders, OrderTracking, Addresses (with inline edit + unsaved-changes guard), OwnerDashboard, DeliveryDashboard, AdminDashboard.
- **Cart context** + **Auth context** wired through `App.tsx`. `RequireAuth` guards protected routes.
- **Design system** (brutalist culinary, cream + burnt orange) is in place via `index.css` + `tailwind.config.ts`.

## 2. Bugs & Gaps Found

### Verified bugs
1. **`Layout.tsx` missing `Link` import** → runtime `ReferenceError`. *(already fixed quietly this turn)*
2. **`orders` RLS bug — delivery partner can never see assigned orders**. Policy uses `d.order_id = d.id` (self-join typo) instead of `d.order_id = orders.id`. Same typo in the UPDATE policy. This silently breaks the delivery dashboard.
3. **No DB-level validation trigger** for `reviews.rating` (should be 1–5). Currently any integer accepted.
4. **`addresses.user_id` is nullable** but RLS keys off it → risk of orphan rows. Should be `NOT NULL`.

### Missing features from the brief
5. **Favourite restaurants** — no table, no UI.
6. **Personalized recommendations** — not implemented.
7. **Ratings & reviews UI** — table exists, no read/write UI on RestaurantDetail or Orders.
8. **Owner: accept/reject orders + status transitions** (Pending → Accepted → Preparing → Ready) — dashboard exists but transitions not wired.
9. **Owner: menu CRUD with image upload** — partial; verify add/edit/delete + storage bucket for dish images (no bucket exists yet).
10. **Delivery: accept assignment + status updates** (Picked Up → Out for Delivery → Delivered) — partial.
11. **Simulated GPS tracking + ETA** on OrderTracking — needs dynamic status timeline + ETA countdown.
12. **Admin**: user/restaurant/delivery-partner management lists + platform stats.
13. **Toast notifications** on key lifecycle events (placed/accepted/picked/delivered) — inconsistent.
14. **Zod + react-hook-form validation** on auth, address, menu-item, restaurant-profile forms.
15. **Loading skeletons, empty states, error boundary, fallback images** — inconsistent.

### Code-quality / architecture
16. API calls are inline inside pages — extract into `src/services/{orders,restaurants,menu,deliveries,reviews,favourites}.ts`.
17. `Layout.tsx` uses `window.location.href` for navigation instead of `useNavigate` → loses SPA state.
18. No global `ErrorBoundary`.
19. No central `queryClient` usage patterns (React Query is installed but underused).

---

## 3. Proposed Phased Plan

I'll do this in **5 focused phases**, each shippable & testable. After each phase I'll pause for you to verify.

### Phase 1 — Critical fixes & foundations (no UI changes)
- Migration: fix `orders` RLS typo (delivery partner visibility/update).
- Migration: add `reviews.rating` 1–5 validation trigger.
- Migration: make `addresses.user_id` `NOT NULL`.
- Migration: create `favourites` table (`user_id`, `restaurant_id`) + RLS.
- Migration: create storage bucket `dish-images` (public read, owner write).
- Add global `ErrorBoundary` + replace `window.location.href` with `useNavigate` in `Layout`.
- Extract `src/services/*.ts` for orders/restaurants/menu/deliveries/reviews/favourites.

### Phase 2 — Customer flow polish
- Zod + RHF on Auth, Checkout, Addresses.
- Favourite button on restaurant cards + `/favourites` page.
- Reviews UI: write review after delivered order; show avg rating + review list on RestaurantDetail.
- Recommendations section on Index (based on order history + cuisine affinity, fallback to top-rated).
- Skeleton loaders + empty states + fallback images everywhere.

### Phase 3 — Owner dashboard
- Restaurant profile edit form (RHF + Zod).
- Menu CRUD with image upload to `dish-images` bucket.
- Incoming orders queue: accept/reject + status transitions (Pending → Accepted → Preparing → Ready).
- Basic analytics: today's orders, revenue, top items.

### Phase 4 — Delivery + tracking simulation
- Delivery dashboard: assigned list, accept, status transitions (Picked Up → Out for Delivery → Delivered).
- Simulated GPS on `OrderTracking`: timeline + animated progress + ETA countdown driven by `deliveries.eta_minutes` and status timestamps.
- Realtime subscription on `orders` + `deliveries` for live status.
- Toast notifications on all lifecycle transitions.

### Phase 5 — Admin + final QA
- Admin lists: users (with role management), restaurants (approve/suspend), delivery partners, orders.
- Platform stats: totals, GMV, active orders, top restaurants.
- Strict TS pass, remove unused code, fix all warnings.
- Mobile responsiveness pass.
- Final summary report (issues found / fixes applied / files modified / recommendations).

---

## 4. Things I will **not** change
- Existing design system / color palette / typography.
- Existing pages, routes, or auth provider.
- Existing tables (only additive migrations + the 3 fixes above).
- Payments & maps (mocked, per earlier decision).

---

## 5. Question before I start

The plan above is large. Two options:

- **A — Ship Phase 1 now** (critical fixes + foundations), then continue phase-by-phase with you verifying between each.
- **B — Run all 5 phases back-to-back** in this session (longer single turn, less chance to course-correct mid-way).

Which do you prefer? Default is **A** unless you say otherwise.
