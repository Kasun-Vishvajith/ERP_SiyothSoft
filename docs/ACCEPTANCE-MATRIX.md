# Mini ERP acceptance matrix

This matrix records what is proven by source checks and the runtime evidence collected for the current implementation. A source implementation is not marked as a runtime pass without a matching check.

| Area | Check | Expected result | Current evidence | Status |
| --- | --- | --- | --- | --- |
| Frontend | `npm ci --cache .npm-cache` and `npm run build` | TypeScript compilation and Vite production bundle succeed | Latest build passed; generated folders were removed afterward | Passed |
| Frontend | Mobile layout at 360px | Drawer navigation, single-column forms and compact cards fit without page-wide table overflow | Live browser viewport 360x800 showed the drawer, compact card/list and single-column invoice form | Passed |
| Frontend | Desktop layout at 1366px | Sidebar and data tables are available | Live browser viewport 1366x768 showed the persistent sidebar, invoice table and desktop form grid | Passed |
| Frontend | Keyboard focus | Menu, fields, actions and dialogs have visible focus | Live tab check reported a 2.4px cornflower focus outline; source also contains `:focus-visible` styles | Passed |
| Frontend | Invoice search/status/page controls | Browser requests filtered server pages and renders loading/error/empty/success states | Live UI rendered the controls; API smoke requests for `q=Runtime&status=PAID&page=0&size=10` and `status=UNPAID` both returned 200 with server-filtered pages | Passed |
| Frontend | Manual payment retry | Same request ID is retained for a retry; changing the intended parent starts a new ID | Live API flow returned 201 then 200 for the same payment request ID; source covers parent changes | Passed |
| Backend | Production/test source compilation | Java sources compile with the Java 21 release target | Docker Maven builder and isolated test container compiled production and test sources successfully | Passed |
| Backend | Health endpoint | `GET /api/health` returns `{"status":"ok"}` | Live proxied request returned HTTP 200 with `{"status":"ok"}` | Passed |
| Backend | Validation/malformed JSON | Invalid input returns safe 400 messages | Live invalid product returned 400; `SecurityIntegrationTest` and `BusinessFlowIntegrationTest` passed | Passed |
| Backend | Authentication/CSRF | Anonymous APIs return 401, wrong password returns 401, write without CSRF returns 403 | Live smoke flow returned 401/204/403; security suite passed all 4 tests | Passed |
| Backend | Invoice snapshot | Invoice total and line price remain unchanged after catalogue price changes | Live invoice remained at total 51.00 and unit price 25.50 after product changed to 30.00; flow suite passed | Passed |
| Backend | Invoice rollback | Unknown product does not leave a header behind | `BusinessFlowIntegrationTest` passed the rollback assertion | Passed |
| Backend | Payment balance | Partial payment, full settlement and overpayment rejection preserve balances | Full flow suite passed balance/overpayment cases; live payment settled the invoice | Passed |
| Backend | Payment idempotency | Replaying one request ID returns one payment record | Full flow suite passed; live retry returned HTTP 200 after the original 201 | Passed |
| Backend | Concurrent payments | Two 400.00 payments against 650.00 produce one 201 and one 409 | `BusinessFlowIntegrationTest` passed the bounded concurrent lock assertion | Passed |
| Backend | Parent separation | Paying a purchase settles only the purchase; the invoice remains unpaid | `BusinessFlowIntegrationTest` passed the separate-parent assertion | Passed |
| Backend | Paid-document locking | Paid or partially paid invoices/purchases cannot be edited or deleted | Flow suite and live paid-invoice edit returned HTTP 409 | Passed |
| Backend | Inventory movement | Purchases add stock, invoices deduct stock, and unpaid document edits/deletes reverse and reapply quantities | Source implemented with transactional product-row locks; runtime verification pending after the V6 migration is applied | Pending |
| Backend | Insufficient stock | An invoice that would make stock negative is rejected without saving a partial invoice | Source returns HTTP 409 before the invoice is committed; runtime verification pending | Pending |
| Data | Persistence | Restart keeps migrations and business records | PostgreSQL/backend restart preserved invoice count 1 and Flyway version 5 | Passed |
| Containers | Compose shape | PostgreSQL, backend and frontend resolve with a named external volume | `docker compose --env-file .env.example config --quiet` passed | Passed |
| Containers | Full startup/proxy | Login, API calls and SPA proxy work through `http://localhost:8188` | Compose built all images, PostgreSQL became healthy, backend started, and live HTTP smoke passed through Nginx | Passed |
| Safety | Learning pack and ignore boundary | `ERP-Learning-Pack/` and `.gitignore` remain unchanged | `git check-ignore` confirms the learning pack rule | Passed |

## Runtime command sequence

The current machine has the runtime needed for the verification sequence. Repeat the frontend and Compose checks after source changes; use the isolated PostgreSQL test container for the backend suite when Maven is not installed on the host:

```powershell
cd frontend
npm ci
npm run build
cd ..
docker compose --env-file .env.example up --build -d
```

Then execute the browser matrix at 360px, 768px and 1366px, record actual results here, and keep the external `mini-erp-pgdata` volume when restarting. Do not use `docker compose down -v`. The completed run used a separate `mini_erp_test` database and did not reuse production records for integration tests.
