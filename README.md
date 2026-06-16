# FiveM Torneo - Competitive Tournament Platform

This is a React 19 + Tailwind 4 + Express 4 + tRPC 11 stack with local authentication. Procedures are your contracts, types flow end to end, and authentication "just works".

---

## Quick Facts

- **tRPC-first:** define procedures in `server/routers.ts`, consume them with `trpc.*` hooks.
- **Superjson out of the box:** return Drizzle rows directly—`Date` stays a `Date`.
- **Auth baked in:** Local username/password authentication with session cookies, `protectedProcedure` injects `ctx.user`.
- **Gateway-ready:** all RPC traffic is under `/api/trpc`, making it easy to route at the edge.

---

## Build Loop (Four Touch Points)

1. Update schema in `drizzle/schema.ts`, run `pnpm drizzle-kit generate` to produce migration SQL, then read the generated `.sql` file and apply it via `webdev_execute_sql`.
2. Add database helpers in `server/db.ts` (return raw results).
3. Add or extend procedures in `server/routers.ts`, then wire the UI with `trpc.*.useQuery/useMutation`.
4. Build frontend experience according to `Frontend Workflow`
5. Cover your changes with Vitest specs inside `server/*.test.ts` (see `server/auth.logout.test.ts`) and run `pnpm test`.

That's it—no manual REST routes, no Axios client, no shared contract files.

---

## Key Files

```
server/auth.logout.test.ts → Reference sample vitest test file
drizzle/schema.ts → Database tables & types
server/db.ts → Query helpers (reuse across procedures)
server/routers.ts → tRPC procedures (auth + features)
client/src/App.tsx → Routes wiring & layout shells
client/src/lib/trpc.ts → tRPC client binding
client/src/pages/ → Feature UI that calls trpc hooks
```

Framework plumbing (context, Vite bridge) lives under `server/_core`.

---

## File Structure

```
client/
  public/         ← Small configuration files ONLY (favicon.ico, robots.txt). DO NOT put images/media here.
  src/
    pages/        ← Page-level components
    components/   ← Reusable UI & shadcn/ui
    contexts/     ← React contexts
    hooks/        ← Custom hooks
    lib/trpc.ts   ← tRPC client
    App.tsx       ← Routes & layout
    main.tsx      ← Providers
    index.css     ← global style
drizzle/          ← Schema & migrations
server/
  db.ts           ← Query helpers
  routers.ts      ← tRPC procedures
storage/          ← S3 helpers
shared/           ← Shared constants & types
```

Only touch the files under "←" markers. Anything under `server/_core` or other tooling directories is framework-level—avoid editing unless you are extending the infrastructure.

### ⚠️ Handling Images & Media

**DO NOT** store images, videos, or large assets in `client/public/` or `client/src/assets/`. Local media files will cause deployment timeouts.

**Required workflow:**
1. Upload assets using the CLI: `manus-upload-file --webdev path/to/image.png`
2. Use the returned storage path directly in your code: `<img src="/manus-storage/image_a1b2c3d4.png" />`
3. Store the original local file in `/home/ubuntu/webdev-static-assets/` (outside the project directory)

Only small configuration files like `favicon.ico`, `robots.txt`, and `manifest.json` belong in `client/public/`.

Files in `client/public` are available at the root of your site—reference them with absolute paths (`/robots.txt`, etc.) from HTML templates, JSX, or meta tags.

---

## Authentication Flow

- Local auth completes with username/password login and drops a session cookie.
- Each request to `/api/trpc` builds context via `server/_core/context.ts`, making the current user available as `ctx.user`.
- Wrap protected logic in `protectedProcedure`; public access uses `publicProcedure`.
- Frontend reads auth state with `trpc.customAuth.me.useQuery()` and invokes `trpc.customAuth.logout.useMutation()`—no cookie plumbing required.

---

## Environment Variables

Available pre-defined system envs:
- `DATABASE_URL`: MySQL/TiDB connection string
- `JWT_SECRET`: Session cookie signing secret

Do not edit these directly in code or commit `.env` files.

---

## Frontend Workflow

1. Choose a design style before you write any frontend code according to Design Guide (color, font, shadow, art style). Remember to edit `client/src/index.css` for global theming and add needed font using google font cdn in `client/index.html`.
2. Design the layout and navigation structure based on app purpose. Establish navigation in App.tsx accordingly:
  - **Personal tools & internal dashboards** (finance trackers, task managers, admin panels, personal finance apps, analytics): Use DashboardLayout with sidebar navigation for consistent experience.
  - **Public-facing products** (marketing sites, e-commerce, communities): Design custom navigation (top nav, contextual nav) and landing page to attract users.
3. Start by updating `client/src/pages/Home.tsx` (the landing page shell) using shadcn/ui components to introduce links, CTAs, or feature entry points. 
4. Create or update additional components under `client/src/pages/FeatureName.tsx`, continuing to leverage shadcn/ui + Tailwind for consistent styling.
5. Register the route (or navigation entry) in `client/src/App.tsx`.
6. Read data with `const { data, isLoading } = trpc.feature.useQuery(params);`.
7. Mutate data with `trpc.feature.useMutation()`. Use optimistic updates for list operations, toggles, and profile edits. For critical operations (payments, auth), use `invalidate` with loading states.
8. Use `useAuth()` for current user state and avoid direct cookie handling.
9. Handle loading/empty/error states in the UI—tRPC already surfaces typed responses and errors.

---

## Frontend Development Guidelines

**tRPC & Data Management:**
- Use `trpc.*.useQuery/useMutation` for all backend calls—never introduce Axios/fetch wrappers.
- **Use optimistic updates for instant feedback**: ideal for adding/editing/deleting list items, toggling states, updating profiles. Use `onMutate` to update cache, `onError` to rollback (The onMutate/onError/onSettled pattern). For critical operations (payments, auth), prefer `invalidate` with explicit loading states.
- When using `invalidate` as fallback: call `trpc.useUtils().feature.invalidate()` in mutation's `onSuccess`.
- Auth state comes from `useAuth()`; do not manipulate cookies manually.

**UI & Styling:**
- Prefer shadcn/ui components for interactions to keep a modern, consistent look; import from `@/components/ui/*` (e.g., `button`, `card`, `dialog`).
- Compose Tailwind utilities with component variants for layout and states; avoid excessive custom CSS. Use built-in `variant`, `size`, etc. where available.
- Preserve design tokens: keep the `@layer base` rules in `client/src/index.css`. Utilities like `border-border` and `font-sans` depend on them.
- Consistent design language: use spacing, radius, shadows, and typography via tokens. Extract shared UI into `components/` for reuse instead of copy‑paste.
- Accessibility and responsiveness: keep visible focus rings and ensure keyboard reachability; design mobile‑first with thoughtful breakpoints.
- Theming: Choose dark/light theme to start with for ThemeProvider according to your design style (dark or light bg), then manage colors pallette with CSS variables in `client/src/index.css` instead of hard‑coding to keep global consistency.
- Micro‑interactions and empty states: add motion, empty states, and icons tastefully to improve quality without distracting from content.
- Navigation: For internal tools/admin panels, use persistent sidebar. For public-facing apps, design navigation based on content structure (top nav, side nav, or contextual)—ensure clear escape routes from all pages.
- Placeholder UI elements: When adding structural placeholders (nav items, table actions) for not-yet-implemented features, show toast on click ("Feature coming soon"). Inform user which elements are placeholders when presenting work.

**React Best Practices:**
- Never call setState/navigation in render phase → wrap in `useEffect`

**Customized Defaults:**
This template customizes some Tailwind/shadcn defaults for simplified usage:
- `.container` is customized to auto-center and add responsive padding (see `index.css`). Use directly without `mx-auto`/`px-*`. For custom widths, use `max-w-*` with `mx-auto px-4`.
- `.flex` is customized to have `min-width:0` and `min-height:0` by default
- `button` variant `outline` uses transparent background (not `bg-background`). Add bg color class manually if needed.

---

## 🎨 Design Guide

When generating frontend UI, avoid generic patterns that lack visual distinction:
- Avoid generic full-page centered layouts—prefer asymmetric/sidebar/grid structures for landing pages and dashboards
- Avoid applying dashboard/sidebar patterns to public-facing apps (forums, communities, e-commerce)—reserve those for internal tools
- When user provides vague requirements, make creative design decisions (choose specific color palette, typography, layout approach)
- Prioritize visual diversity: combine different design systems (e.g., one color scheme + different typography + another layout principle)
- For landing pages: prefer asymmetric layouts, specific color values (not just "blue"), and textured backgrounds over flat colors
- For dashboards: use defined spacing systems, soft shadows over borders, and accent colors for hierarchy

---

## Animation Guide

Bake motion taste in from the first line of code. Snappy, physically intuitive interactions are not a polish pass — they are part of the initial build.
- Decide whether to animate at all: keyboard-initiated actions (command palettes, shortcuts) must be instant — never animate them. High-frequency interactions (hover, list nav) should be minimal. Reserve richer motion for occasional events (modals, drawers, toasts) and rare delight moments (onboarding).
- Keep UI animations under 300ms. A 180ms dropdown feels significantly better than a 400ms one. Typical ranges: button press 100–160ms, tooltips 125–200ms, dropdowns 150–250ms, modals/drawers 200–500ms.
- Use strong custom easings, not the weak CSS defaults. Default to a snappy ease-out for entering/exiting UI: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1);`. For moving/morphing use `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);`. NEVER use `ease-in` for UI animations — it feels sluggish.
- Buttons must feel responsive: add `transform: scale(0.97)` on `:active` with a ~160ms ease-out transition so the UI confirms it heard the user.
- Never animate from `scale(0)` — nothing in the real world appears from nothing. Start from `scale(0.95)` combined with `opacity: 0`.
- Origin-aware popovers/dropdowns: scale in from the trigger point (e.g. `transform-origin: var(--radix-popover-content-transform-origin)`). Modals are the exception and stay centered.
- Prefer CSS transitions over @keyframes for dynamic UI state. Transitions can be interrupted and reversed smoothly mid-flight; keyframes restart from zero and feel broken when interrupted.
- Only animate `transform` and `opacity` for motion — they run on the GPU and skip layout/paint. Avoid animating `width`, `height`, `padding`, `margin`, `top/left` unless absolutely necessary.
- Stagger grouped entrances by 30–80ms per item to create a cascading reveal instead of a wall of motion.
- Asymmetric timing for deliberate actions: hold-to-confirm should be slow and linear on press (e.g. 2s linear), but release/cancel should snap back fast (~200ms ease-out).
- Respect `prefers-reduced-motion`: gate non-essential motion behind `@media (prefers-reduced-motion: no-preference)`.

---

## Feature Checklist

- [ ] Tables updated in `drizzle/schema.ts`, migration generated via `pnpm drizzle-kit generate`, SQL applied via `webdev_execute_sql`
- [ ] Query helper added in `server/db.ts` (returns raw Drizzle rows)
- [ ] Procedure created in `server/routers.ts` (choose `public` vs `protected`)
- [ ] UI calls the procedure via `trpc.*.useQuery/useMutation`
- [ ] Success + error paths verified in the browser

---

## Pre-built Components

Before implementing UI features, check if these components already exist:

Dashboard & Layout:
- `client/src/components/DashboardLayout.tsx` - Full dashboard layout with sidebar navigation, auth handling, and user profile. Use this for any admin panel or dashboard-style app instead of building from scratch.
- `client/src/components/DashboardLayoutSkeleton.tsx` - Loading skeleton for dashboard during auth checks

Chat & Messaging:
- `client/src/components/AIChatBox.tsx` - Full-featured chat interface with message history, streaming support, and markdown rendering. Use this for any chat/conversation UI instead of building from scratch.

Maps:
- `client/src/components/Map.tsx` - Google Maps integration with proxy authentication. Provides MapView component with onMapReady callback for initializing Google Maps services (Places, Geocoder, Directions, Drawing, etc.). All map functionality works directly in the browser.

When implementing features that match these categories, MUST evaluate the component first to decide whether to use or customize it.

---

## Internal Tools & Admin Panels

For certain app types, this template provides DashboardLayout—a standardized sidebar pattern.

**Use DashboardLayout for:**
- Admin/management dashboards
- Personal productivity apps (task managers, note-taking)
- Analytics/monitoring tools

**Do NOT use for:**
- Public content platforms (forums, blogs, social networks)
- E-commerce storefronts
- Marketing/landing sites

**Layout & Navigation**
- Use `DashboardLayout` component from `client/src/components/DashboardLayout.tsx` and remove any page-level headers to avoid duplication.
- When use DashboardLayout, read its content before making changes and preserve its core structure by default.

**Role-based Access Control**
When building apps with distinct access levels (e.g., e-commerce with public home, user account, admin panel):
- The `user` table includes a `role` field (enum: `admin` | `staff` | `ceo` | `user`) for identity separation
- Use `ctx.user.role` in procedures to gate admin-only operations
- Wrap admin-only backend logic in `adminProcedure`
- Frontend can conditionally render navigation/routes based on `useAuth().user?.role`

Example procedure pattern:
```ts
adminOnlyProcedure: protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
  return next({ ctx });
}),
```

**Managing Admins**
- To promote a user to admin, update the `role` field directly in the database via the system UI or SQL
- If you need additional roles beyond `admin`/`user`, extend the enum in `drizzle/schema.ts` and push the migration

---

## Tips

- Keep router files under ~150 lines—split into `server/routers/<feature>.ts` once they grow.
- Show loading states at component level (spinners, skeletons) rather than blocking entire pages—keeps the app feeling responsive.

---

## Common Pitfalls

### Infinite loading loops from unstable references
**Anti-pattern:** Creating new objects/arrays in render that are used as query inputs
```tsx
// ❌ Bad: New Date() creates new reference every render → infinite queries
const { data } = trpc.items.getByDate.useQuery({
  date: new Date(), // ← New object every render!
});

// ❌ Bad: Array/object literals in query input
const { data } = trpc.items.getByIds.useQuery({
  ids: [1, 2, 3], // ← New array reference every render!
});
```

**Correct approach:** Stabilize references with useState/useMemo
```tsx
// ✅ Good: Initialize once with useState
const [date] = useState(() => new Date());
const { data } = trpc.items.getByDate.useQuery({ date });

// ✅ Good: Memoize complex inputs
const ids = useMemo(() => [1, 2, 3], []);
const { data } = trpc.items.getByIds.useQuery({ ids });
```

**Why this happens:** TRPC queries trigger when input references change. Objects/arrays created in render have new references each time, causing infinite re-fetches.

### Storing file bytes in database columns
**Anti-pattern:** Adding BLOB/BYTEA columns to store file content
```ts
// ❌ Bad: Database bloat and slow queries
export const files = sqliteTable('files', {
  content: blob('content'), // Never store file bytes
});
```

**Correct approach:** Store S3 reference only, upload file bytes to S3
```ts
// ✅ Good: Store metadata + S3 reference
export const files = sqliteTable('files', {
  url: text('url').notNull(), // Url to reference the file in s3
  fileKey: text('file_key').notNull(), // also save file_key for clarity
  // optional, save other metadata if needed
  // filename: text('filename'),
  // mimeType: text('mime_type'),
});
```

Use `storagePut()` to upload files (see S3 File Storage section).

### Navigation dead-ends in subpages
**Problem:** Creating nested routes without escape routes—no header nav, no sidebar, no back button.

**Root cause:** Implementing individual pages before establishing global layout structure.

**Solution:** Define layout wrapper in App.tsx first, then build pages inside it. For admin tools use DashboardLayout; for detail pages add back button with `router.back()`.

### Invisible text from theme/color mismatches

**Root cause:** Semantic colors (`bg-background`, `text-foreground`) are CSS variables that resolve based on ThemeProvider's active theme. Mismatches cause invisible text.

**Two critical rules:**

1. **Match theme to CSS variables:** If `defaultTheme="dark"` in App.tsx, ensure `.dark {}` in index.css has dark background + light foreground values
2. **Always pair bg with text:** When using `bg-{semantic}`, MUST also use `text-{semantic}-foreground` (not automatic - text inherits from parent otherwise)

**Quick reference:**
```tsx
// ✅ Theme + CSS alignment
<ThemeProvider defaultTheme="dark">  {/* Must match .dark in index.css */}
  <div className="bg-background text-foreground">...</div>
</ThemeProvider>

// ✅ Required class pairs
<div className="bg-popover text-popover-foreground">...</div>
<div className="bg-card text-card-foreground">...</div>
<div className="bg-accent text-accent-foreground">...</div>
```

### Nested anchor tags in Link components
**Problem:** Wrapping `<a>` tags inside another `<a>` or wouter's `<Link>` creates nested anchors and runtime errors.

**Solution:** Pass children directly to Link—it already renders an `<a>` internally.
```tsx
// ❌ Bad: <Link><a>...</a></Link> or <a><a>...</a></a>
// ✅ Good: <Link>...</Link> or just <a>...</a>
```

### Empty `Select.Item` values
**Rule:** Every `<Select.Item>` must have a non-empty `value` prop—never `""`, `undefined`, or omitted.
