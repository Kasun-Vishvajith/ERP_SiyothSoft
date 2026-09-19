# ERP - 2026-09-18

A small, mobile-first ERP application to practise full-stack development.

## Current status

The responsive UI is API-backed. It includes the application shell, product/customer/supplier directories, invoice and purchase forms/lists, and manual payments. The backend source contains the matching resources, validation, sessions and database migrations.

Runtime status: Docker Desktop's Linux engine is available and the Compose stack has been built and exercised with PostgreSQL. The backend integration suite passes against an isolated test database, and live HTTP/browser checks cover authentication, CSRF, snapshots, payment locking, persistence and responsive layouts. The Android Studio JDK 25.0.3 remains available off PATH for compilation; the container build uses Java 21. See [`docs/LEARNING-LOG.md`](docs/LEARNING-LOG.md) for the chronological record and [`docs/FILE-MAP.md`](docs/FILE-MAP.md) for the real file inventory.

The latest source audit confirms there are no retained `node_modules/`, `dist/`, `.npm-cache/` or `target/` folders. The learning pack and existing `.gitignore` remain unchanged. The requirement-by-requirement verification boundary is recorded in [`docs/ACCEPTANCE-MATRIX.md`](docs/ACCEPTANCE-MATRIX.md).

`ERP-Learning-Pack/` contains the learning workbook and is intentionally unchanged. The root `.gitignore` is also intentionally unchanged.

## Frontend

From `frontend/`:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite proxy is configured for the backend at `127.0.0.1:8080`. The app checks `/api/me` on startup and shows the session login when the API reports 401. Set `ERP_USERNAME` and `ERP_PASSWORD` in the backend terminal; do not commit them.

Run the production checks with:

```powershell
npm run build
```

The backend test source uses a separate `TEST_DB_URL`, `TEST_DB_USER` and `TEST_DB_PASSWORD` profile. The isolated PostgreSQL test run passed all 13 tests. This checkout has no Maven wrapper; the Dockerfile uses an official Maven builder image.

## Backend

The backend source is under `backend/` and targets Java 21 with Spring Boot 4.1.1. Set `DB_URL`, `DB_USER`, `DB_PASSWORD`, `ERP_USERNAME` and `ERP_PASSWORD` when running it outside Compose, then verify `GET http://localhost:8080/api/health` returns `{"status":"ok"}`. Database, validation and feature dependencies are intentionally added one workbook stage at a time.

The backend image uses an official Maven + Temurin builder because this checkout does not have Maven wrapper files; the frontend image uses Nginx to serve the build and proxy `/api/` to the `backend` service. Copy `.env.example` to an untracked `.env`, replace every placeholder, and never commit the real file. Flyway is wired through the Spring Boot Flyway starter and the PostgreSQL database module so the five migrations run during startup.

Compose configuration can be checked without starting services:

```powershell
docker compose --env-file .env.example config --quiet
```

Create the named volume once if needed, then run `docker compose up --build -d` and open `http://localhost:8088`. Do not use `down -v`; the `mini-erp-pgdata` external volume is the persistence boundary. The latest acceptance run restarted the database and backend and confirmed the invoice count was preserved.

## UI direction

- Mobile uses a hamburger drawer and compact invoice/payment cards.
- Desktop uses a persistent sidebar and data tables.
- Forms are single-column on small screens and use a two-column detail grid when space allows.
- Invoice and purchase lookups are paginated in the form instead of silently limiting choices to the first 100 records.
- Invoice list search, status filtering and page boundaries are evaluated by the backend; the browser requests one page at a time.
- Desktop tables switch to compact record cards on smaller screens for invoices, purchases and payment history.
- Colors use cool off-white surfaces, white cards, muted cornflower-blue actions, mint payment states and lilac purchase accents.
- Invoice-form and purchase-form totals are previews only; backend services calculate authoritative totals and snapshot values. Invoice summaries/detail/delete and payment history/submission use API calls. No mock record set is retained in the frontend.
- Any invoice or purchase with a recorded payment is locked from editing/deletion by the backend rule.
- Manual payments use request IDs and parent-row locks; there is no payment gateway. Purchases add stock and invoices deduct stock transactionally, while the payment form calls the API for either an invoice or purchase, pages unpaid choices independently and refreshes its lookup after a successful payment.
- Session cookies and CSRF are framework-managed; the frontend keeps only the CSRF token in memory and returns to login when a later session request receives 401.

## Frontend file map

| File | Purpose |
| --- | --- |
| `frontend/package.json` | Vite, React, TypeScript and Sass scripts/dependencies. |
| `frontend/tsconfig.json` | TypeScript project references. |
| `frontend/tsconfig.app.json` | Strict TypeScript settings for React source. |
| `frontend/tsconfig.node.json` | TypeScript settings for Vite configuration. |
| `frontend/vite.config.ts` | React plugin, local dev port and future API proxy. |
| `frontend/index.html` | Browser document and React mount point. |
| `frontend/src/main.tsx` | Mounts the app with React StrictMode. |
| `frontend/src/App.tsx` | Holds auth state, navigation, current invoice/payment context and screen transitions. |
| `frontend/src/api.ts` | Same-origin session requests, CSRF handling and typed HTTP status errors. |
| `frontend/src/types.ts` | Shared invoice, payment, lookup and navigation types. |
| `frontend/src/utils.ts` | Shared money formatting and payment-status labels. |
| `frontend/src/styles.scss` | Mobile-first layout, responsive breakpoints, colors, states and accessibility focus styles. |
| `frontend/src/components/Sidebar.tsx` | Desktop sidebar and mobile navigation drawer. |
| `frontend/src/components/StatusBadge.tsx` | Consistent invoice payment-state badges. |
| `frontend/src/components/EmptyState.tsx` | Reusable empty result state with a clear next action. |
| `frontend/src/components/InvoiceForm.tsx` | API-backed invoice form, dynamic lines, preview total and payment-lock messaging. |
| `frontend/src/components/ProductForm.tsx` | Server-backed product create/edit form with preserved input on errors. |
| `frontend/src/components/CustomerForm.tsx` | Explicit customer create/edit form with optional contact fields. |
| `frontend/src/components/SupplierForm.tsx` | Explicit supplier create/edit form with optional contact fields. |
| `frontend/src/components/LookupPager.tsx` | Previous/next control for paginated form lookups. |
| `frontend/src/components/PurchaseForm.tsx` | Purchase create/edit form with supplier/product lookups and explicit unit costs. |
| `frontend/src/pages/InvoicesPage.tsx` | Server-backed searchable/status-filtered invoice list with pagination, loading, error, empty, success and responsive card/table views. |
| `frontend/src/pages/ProductsPage.tsx` | Product table/card list with loading, empty, error, success, pagination and CRUD states. |
| `frontend/src/pages/CustomersPage.tsx` | Customer table/card list, pagination, CRUD actions, success notices and referenced-record errors. |
| `frontend/src/pages/SuppliersPage.tsx` | Supplier table/card list, pagination, CRUD actions, success notices and referenced-record errors. |
| `frontend/src/pages/PurchasesPage.tsx` | Responsive purchase list, server-backed CRUD, purchase payment action and paid-record locking. |
| `frontend/src/pages/PaymentsPage.tsx` | API-backed manual payment form for invoices and purchases, server errors, retry-safe request ID and paginated payment history. |
| `frontend/src/pages/LoginPage.tsx` | Username/password login form with accessible error and busy states. |
| `frontend/Dockerfile` | Multi-stage Vite build and Nginx runtime image. |
| `frontend/nginx.conf` | SPA fallback and same-origin backend proxy. |
| `frontend/.dockerignore` | Frontend Docker build-context exclusions. |
| `backend/pom.xml` | Pinned Spring Boot Maven project, persistence dependencies and Spring Security. |
| `backend/Dockerfile` | Multi-stage Maven build and non-root Java runtime image. |
| `backend/.dockerignore` | Backend Docker build-context exclusions. |
| `compose.yaml` | PostgreSQL, backend and Nginx services with an external named data volume. |
| `backend/src/main/java/com/kalara/erp/ErpApplication.java` | Spring application entry point. |
| `backend/src/main/java/com/kalara/erp/health/HealthController.java` | Process-reachability endpoint at `/api/health`. |
| `backend/src/main/resources/application.properties` | Local backend binding and port configuration. |
| `backend/src/main/java/com/kalara/erp/security/SecurityConfig.java` | Environment-backed learning user, session login/logout and CSRF protection. |
| `backend/src/main/java/com/kalara/erp/security/AuthController.java` | CSRF bootstrap and authenticated `/api/me` endpoint. |
| `backend/src/test/resources/application-test.properties` | Separate test-database and test-credential configuration. |
| `backend/src/test/java/com/kalara/erp/common/MoneyTest.java` | Exact money-rule unit tests. |
| `backend/src/test/java/com/kalara/erp/security/SecurityIntegrationTest.java` | MockMvc authentication and CSRF checks. |
| `backend/src/test/java/com/kalara/erp/flow/BusinessFlowIntegrationTest.java` | Invoice snapshot/rollback, separate invoice/purchase settlement, payment idempotency and concurrent-lock integration checks. |
| `backend/src/main/resources/db/migration/V1__create_products.sql` | First Flyway products-table migration. |
| `backend/src/main/java/com/kalara/erp/common/PageResponse.java` | Stable pagination response shape. |
| `backend/src/main/java/com/kalara/erp/common/ApiExceptionHandler.java` | Safe API error responses. |
| `backend/src/main/java/com/kalara/erp/product/Product.java` | Products-table entity mapping. |
| `backend/src/main/java/com/kalara/erp/product/ProductRequest.java` | Validated product input. |
| `backend/src/main/java/com/kalara/erp/product/ProductResponse.java` | Product API output with decimal-string money. |
| `backend/src/main/java/com/kalara/erp/product/ProductRepository.java` | Product persistence and pagination access. |
| `backend/src/main/java/com/kalara/erp/product/ProductService.java` | Product business rules and transactions. |
| `backend/src/main/java/com/kalara/erp/product/ProductController.java` | `/api/products` HTTP endpoints. |
| `backend/src/main/resources/db/migration/V2__create_parties.sql` | Customers and suppliers migration. |
| `backend/src/main/java/com/kalara/erp/customer/*` | Explicit customer entity, DTO, repository, service and controller. |
| `backend/src/main/java/com/kalara/erp/supplier/*` | Explicit supplier entity, DTO, repository, service and controller. |
| `backend/src/main/resources/db/migration/V3__create_sales_invoices.sql` | Invoice header/line schema, snapshots, constraints and indexes. |
| `backend/src/main/java/com/kalara/erp/common/Money.java` | Exact backend money calculations and range checks. |
| `backend/src/main/java/com/kalara/erp/invoice/*` | Sales invoice entities, DTOs, repositories, transaction service and controller. |
| `backend/src/main/resources/db/migration/V4__create_purchases.sql` | Purchase header/line schema with supplier/product constraints. |
| `backend/src/main/java/com/kalara/erp/purchase/*` | Purchase entities, DTOs, repositories, cost calculations, service and controller. |

## Project documentation

| File | Purpose |
| --- | --- |
| `docs/ACCEPTANCE-MATRIX.md` | Requirement-by-requirement evidence, runtime boundaries and the final verification command sequence. |
| `docs/LEARNING-LOG.md` | Chronological implementation notes, source decisions and verification results. |
| `docs/FILE-MAP.md` | Expanded inventory of the learning-pack-derived implementation files. |

## Next small implementation step

Keep future changes small, update the learning log and acceptance matrix after each stage, and rerun the relevant Compose/API/browser checks before calling a later change complete.
