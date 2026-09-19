# UI redesign — 19 September 2026

Implemented a midnight navy and lime visual system inspired by the supplied dashboard references. Shared styles cover all seven modules, forms, table/card layouts, loading states, alerts and sign-in. Navigation now uses consistent SVG icons and the signed-in user's initials.

The invoice page adds page-scoped sales bars and a collection ring, calculated from the existing API response. Summary labels explicitly describe the current page and active filters; these are not business-wide analytics. No sample data is shipped in the application.

## Verification

- `npm run build`: passed (TypeScript and production Vite build).
- `git diff --check`: passed.
- Browser checks at 1440px and 390px: passed. Search and status filtering, invoice-form navigation, all seven navigation destinations, mobile drawer dismissal, sign-in layout, and document overflow checked. No browser runtime errors.
- Screenshots: `desktop.png`, `mobile.png`, `login.png` in this directory.
- Browser verification uses isolated intercepted API fixtures in `check.cjs`. The ERP Compose stack was not running, so live backend integration was not verified. No business records were created or changed.

The fixture check requires Playwright and installed Microsoft Edge, with the frontend running at http://127.0.0.1:5173. Set PLAYWRIGHT_MODULE to the installed Playwright module path if it is not on the Node module lookup path, then run `node docs/evidence/ui-redesign/check.cjs` from the repository root.
