# Learning log

## 2026-09-18 — stage 01 setup check

### Goal

Confirm the tools and record the real project baseline before adding backend code.

### What I found

| Tool | Result |
| --- | --- |
| Java/JDK | Not available on PATH. |
| Node.js | `v22.23.2`; the workbook target is Node 24 LTS when supported. |
| npm | `10.9.8`. |
| Git | `2.54.0.windows.1`. |
| PostgreSQL client | `psql` is not available on PATH. |
| Docker | `29.5.2`. |
| Docker Compose | `v5.1.4`. |

### Existing implementation

The frontend prototype already builds with React, TypeScript, Vite and Sass. It uses local mock records for invoices and manual payments. The backend, PostgreSQL schema and API are not implemented yet.

### Verification

- `npm run build`: passed before temporary dependencies/build output were removed.
- Browser smoke check: navigation drawer, invoice validation/save, overpayment rejection, successful manual payment and paid-invoice locking passed.
- `git diff --check`: passed; only a normal line-ending warning was reported for `README.md`.

### Learning boundary

This stage is not complete yet because Java/JDK and PostgreSQL are missing. I will not claim a Spring Boot stage works until its wrapper/build and database checks actually run.

### Next single subtask

Create the Spring Boot backend skeleton and health endpoint, keeping generated build versions explicit and documenting the new files immediately afterward.

## 2026-09-18 — stage 04 backend skeleton

### Goal

Create the smallest backend process: one Spring application and one health endpoint.

### What changed

| File | Change | Why |
| --- | --- | --- |
| `backend/pom.xml` | Added a pinned Spring Boot 4.1.1 Maven project using Java 21. | Keep this stage limited to HTTP and test infrastructure. |
| `backend/src/main/java/com/kalara/erp/ErpApplication.java` | Added the application entry point. | Gives Spring a package root for component scanning. |
| `backend/src/main/java/com/kalara/erp/health/HealthController.java` | Added `GET /api/health`. | Provides a simple process-reachability check before database work. |
| `backend/src/main/resources/application.properties` | Bound the local server to `127.0.0.1:8080`. | Keeps unfinished endpoints private during learning. |

### Verification

- Expected: Maven compiles the project and `/api/health` returns `{"status":"ok"}`.
- Actual: Not run because Java/JDK is not installed or available on PATH.
- Failure case checked: The setup check confirmed `java` and `javac` are unavailable.

### Learning boundary

The source is present, but this stage is not marked complete until the project is compiled and the endpoint is called successfully.

### Next single subtask

Add PostgreSQL/JPA/validation/Flyway dependencies and the first products migration only after the Java/Maven path is available.

## 2026-09-18 — stage 05 database foundation

### Goal

Add the persistence dependencies and one repeatable products migration without creating Java entity classes yet.

### What changed

| File | Change | Why |
| --- | --- | --- |
| `backend/pom.xml` | Added JPA, validation, PostgreSQL and Flyway dependencies. | Prepare the backend for a real database while keeping schema ownership explicit. |
| `backend/src/main/resources/application.properties` | Added environment-based datasource settings and Hibernate validation mode. | Keep credentials outside source control and prevent two schema creators from competing. |
| `backend/src/main/resources/db/migration/V1__create_products.sql` | Added the products table with identity ID and non-negative two-decimal price. | Give the first feature a stable database contract. |

### Verification

- Expected: Flyway applies V1 once, Spring starts with `ddl-auto=validate`, and the products table persists after restart.
- Actual: Not run because Java/JDK and PostgreSQL/`psql` are not available on PATH.
- Failure case checked: The setup check confirmed `psql` is unavailable.

### Learning boundary

Do not mark this stage complete until the database role/database are created, Spring connects with `erp_user`, and Flyway history shows V1 once.

### Next single subtask

Implement the product API layers—entity, validated request/response DTOs, repository, service and controller—after the migration can be compiled and applied.

## 2026-09-18 — stage 06 product API source

### Goal

Implement one complete backend feature in small layers: entity, DTOs, repository, service, controller and safe error mapping.

### What changed

| File group | Change | Why |
| --- | --- | --- |
| `backend/src/main/java/com/kalara/erp/product/` | Added `Product`, request/response DTOs, repository, service and controller. | Makes the HTTP → service → repository → table flow explicit. |
| `backend/src/main/java/com/kalara/erp/common/PageResponse.java` | Added stable pagination metadata. | Keeps list responses predictable for the future frontend API client. |
| `backend/src/main/java/com/kalara/erp/common/ApiExceptionHandler.java` | Added safe mappings for expected API failures. | Prevents raw SQL and stack traces from reaching the browser. |

### Verification

- Expected: create, list, get, update, delete, validation errors and invalid pagination work against PostgreSQL.
- Actual: Not run because Java/JDK and PostgreSQL are not available on PATH.
- Failure cases designed: blank name, negative/over-precision price, unknown ID and invalid page size.

### Learning boundary

The source follows the workbook pattern but this stage is not marked complete until one POST is traced through the running application and database.

### Next single subtask

Add automated product API tests only after the local Maven and database path is available; then replace the frontend product/invoice mock boundary with a typed API helper one endpoint at a time.

## 2026-09-18 — stage 07 React shell review

### Goal

Confirm that the frontend shell satisfies the workbook’s simple, mobile-first direction before adding API-connected pages.

### What was verified

- Vite React TypeScript project with pinned dependencies and Sass is present.
- The `/api` development proxy targets the planned Spring server.
- Navigation works with a mobile drawer and desktop sidebar.
- Responsive invoice/payment cards replace tables on narrow screens.
- Focus-visible styles, labelled controls, loading, empty, error and success states are present.
- `npm run build` passed.
- Browser smoke checks passed for the drawer, invoice form validation/save, overpayment rejection, payment success and paid-invoice locking.

### Remaining exit-gate evidence

The exact 360px and desktop viewport acceptance screenshots/results have not been recorded yet. The shell is treated as implemented and smoke-tested, not as a completed backend-connected stage.

### Next single subtask

Add the typed frontend request helper and replace one mock product/invoice read with a real API call only after the backend can be run locally.

## 2026-09-18 — stage 09 customers and suppliers source

### Goal

Repeat the product pattern explicitly for customers and suppliers, keeping optional contact fields normalized and paginated.

### What changed

| File group | Change | Why |
| --- | --- | --- |
| `backend/src/main/resources/db/migration/V2__create_parties.sql` | Added customers and suppliers tables. | Keep the two business roles separate while their future rules may diverge. |
| `backend/src/main/java/com/kalara/erp/customer/` | Added entity, DTOs, repository, service and controller. | Provides explicit `/api/customers` CRUD and paginated lookup behavior. |
| `backend/src/main/java/com/kalara/erp/supplier/` | Added entity, DTOs, repository, service and controller. | Provides explicit `/api/suppliers` CRUD without a generic abstraction. |

### Verification

- Expected: blank names and invalid emails fail, omitted email succeeds, phone leading zeroes survive, and both endpoints paginate independently.
- Actual: Not run because Java/JDK and PostgreSQL are not available on PATH.
- Constraint behavior: future invoice/purchase foreign keys will make referenced-party deletion return the existing safe 409 response.

### Next single subtask

Implement the sales-invoice schema and transactional server-calculated totals, including product/customer snapshots.

## 2026-09-18 — stage 10 sales invoice source

### Goal

Add a multi-table sales invoice transaction where the server calculates totals and preserves historical names and prices.

### What changed

| File group | Change | Why |
| --- | --- | --- |
| `backend/src/main/resources/db/migration/V3__create_sales_invoices.sql` | Added invoice headers, item rows, foreign keys, cascade-to-lines and focused indexes. | Model the parent/line relationship without deleting historical products. |
| `backend/src/main/java/com/kalara/erp/common/Money.java` | Added exact quantity multiplication, scale and maximum checks. | Keep financial rules in one small reusable helper. |
| `backend/src/main/java/com/kalara/erp/invoice/` | Added entities, validated request, summary/detail DTOs, repositories, service and controller. | Keep HTTP, business rules and persistence responsibilities separate. |
| `backend/src/main/java/com/kalara/erp/common/ApiExceptionHandler.java` | Added safe amount/quantity error mapping. | Return a readable 400 without leaking exception details. |

### Business rules represented

- Invoice numbers are generated with `INV-` plus a UUID; clients cannot choose numbers or totals.
- Product selling price and name, plus customer name, are copied into invoice rows/header.
- Invoice create/update work inside one transaction.
- List responses omit line rows; detail responses include them.
- Payment totals are temporarily zero until the payment stage replaces those values.

### Verification

- Expected: two notebooks plus three pens total `650.00`; unknown products roll back the whole create; unsupported precision fails with 400.
- Actual: Not run because Java/JDK and PostgreSQL are not available on PATH.

### Next single subtask

Add the purchase schema and purchase service by adapting the invoice understanding without sharing business controllers.

## 2026-09-18 — stage 11 purchase source

### Goal

Implement purchases as a separate business flow: supplier money owed, validated purchase costs and no inventory mutation.

### What changed

| File group | Change | Why |
| --- | --- | --- |
| `backend/src/main/resources/db/migration/V4__create_purchases.sql` | Added purchase headers and cost lines with supplier/product foreign keys. | Keep purchasing history separate from sales history. |
| `backend/src/main/java/com/kalara/erp/purchase/` | Added entities, request/summary/detail DTOs, repositories, service and controller. | Reuse the transaction pattern while keeping purchase rules explicit. |

### Business rules represented

- Purchase numbers use `PUR-` plus a UUID and remain stable on updates.
- Purchase unit cost comes from validated input, not the product selling price.
- Product names are snapshotted for history.
- No stock quantity or catalogue selling price is changed.
- Payment values remain placeholders until the payment stage adds committed sums.

### Verification

- Expected: four units at `180.00` total `720.00`; invalid supplier/product rolls back; sales endpoints never expose purchases.
- Actual: Not run because Java/JDK and PostgreSQL are not available on PATH.

### Next single subtask

Add manual payments with exclusive invoice/purchase ownership, idempotent request IDs, balance checks and parent-row locking.

## 2026-09-18 — stage 12 manual payment source

### Goal

Record existing cash/bank payments safely without adding a gateway, card fields or inventory behavior.

### What changed

| File group | Change | Why |
| --- | --- | --- |
| `backend/src/main/resources/db/migration/V5__create_payments.sql` | Added payment rows with exclusive invoice-or-purchase ownership and unique request IDs. | Database constraints support safe retries and prevent ambiguous parent links. |
| `backend/src/main/java/com/kalara/erp/payment/` | Added payment entity, enum, DTOs, repository, service and controller. | Keeps payment logic one-way and explicit. |
| Invoice/purchase repositories and services | Added pessimistic parent locks, payment sums and paid-document edit/delete rejection. | Payment creation cannot race an edit/delete, and paid documents remain historical. |
| Invoice/purchase response DTOs | Replaced zero placeholders with derived paid, balance and status values. | The browser receives server-derived payment state. |

### Verification

- Expected: partial/full payment balances, overpayment 409, identical request retry returns one row, conflicting request reuse returns 409, and simultaneous payments serialize on the parent row.
- Actual: Not run because Java/JDK and PostgreSQL are not available on PATH.

### Learning boundary

Disabling a button is only a usability aid; the unique request ID and parent-row lock are the actual duplicate/concurrency protections.

### Next single subtask

Add session authentication and CSRF protection, then protect every application endpoint except health, login and CSRF retrieval.

## 2026-09-18 — stage 13 authentication source

### Goal

Add one framework-managed learning account, session login/logout, CSRF bootstrap and a frontend sign-in boundary.

### What changed

| File group | Change | Why |
| --- | --- | --- |
| `backend/pom.xml` | Added Spring Security and security-test dependencies. | Let Spring own password hashing, sessions and CSRF behavior. |
| `backend/src/main/java/com/kalara/erp/security/SecurityConfig.java` | Added environment-backed in-memory user, protected route rules, form login and logout. | Keep the first auth slice small without inventing a security framework. |
| `backend/src/main/java/com/kalara/erp/security/AuthController.java` | Added `/api/csrf` and authenticated `/api/me`. | Give the browser the framework token and a safe session check. |
| `backend/src/main/resources/application.properties` | Added HTTP-only, same-site local session cookie settings and a 30-minute timeout. | Make local HTTP usable while limiting browser exposure. |
| `frontend/src/api.ts` | Added same-origin requests, in-memory CSRF state, login/logout and typed status errors. | Keep credentials in the session cookie and distinguish 401 from a network outage. |
| `frontend/src/pages/LoginPage.tsx` and `frontend/src/App.tsx` | Added startup session check, login form, busy/error states and sign-out handling. | Make auth visible and testable before connecting real data. |
| `frontend/src/components/Sidebar.tsx` and `frontend/src/styles.scss` | Added current username, sign-out action and mobile-friendly auth presentation. | Keep the signed-in state understandable on both layouts. |

### Verification

- Expected: signed-out protected requests return 401, wrong credentials return 401, missing CSRF returns 403, valid session writes succeed and logout invalidates the session.
- Actual: `npm install --cache .npm-cache` and `npm run build` passed after the auth changes. Live backend login, cookie and CSRF checks are pending because Java/JDK and PostgreSQL are not available on PATH. Generated `node_modules/`, `.npm-cache/` and `dist/` were removed afterward.
- Safety check: no password, session ID or CSRF token is stored in localStorage or source control.

### Learning boundary

The source now has a real security boundary, but it is not marked complete until the backend security tests and manual cookie/CSRF checks run against the selected Spring version.

### Next single subtask

Read the testing guide and add focused backend tests for money rules, authentication, invoice snapshots and retry-safe payments.

## 2026-09-18 — stage 14 testing source

### Goal

Add a small automated proof layer before containerisation: pure money tests, isolated test configuration and security request checks.

### What changed

| File | Change | Why |
| --- | --- | --- |
| `backend/src/test/java/com/kalara/erp/common/MoneyTest.java` | Added exact multiplication, zero-quantity and unsupported-precision tests. | Protect the financial helper without starting Spring. |
| `backend/src/test/resources/application-test.properties` | Added separate `TEST_DB_*` settings and test-only auth variables. | Prevent integration tests from silently using the working database. |
| `backend/src/test/java/com/kalara/erp/security/SecurityIntegrationTest.java` | Added MockMvc checks for anonymous 401, missing CSRF 403 and CSRF-enabled logout. | Verify security behavior without bypassing the filter chain. |

### Verification

- Expected: `mvn test` from `backend/` runs the unit and integration checks against a separate test database; frontend `npm run build` remains green. This checkout has no Maven wrapper.
- Actual: Test source was added but Maven cannot run because Java/JDK is not available on PATH. The frontend auth build passed in the previous verification.
- Not claimed: the full manual acceptance matrix, database rollback/concurrency tests and responsive viewport evidence still need real execution.

### Learning boundary

An integration test must not point at the working database. The test profile makes that dependency explicit instead of providing a convenient but unsafe fallback.

### Next single subtask

Read the first Docker guide and add a small backend container definition only after the test boundaries are documented.

## 2026-09-18 — stage 15 Docker source

### Goal

Add reproducible backend/frontend image definitions and keep the browser entry point on one Nginx port.

### What changed

| File group | Change | Why |
| --- | --- | --- |
| `backend/pom.xml` and `backend/src/main/resources/application.properties` | Added stable `app.jar` packaging and `SERVER_ADDRESS` override. | Make the runtime artifact predictable and keep local binding private by default. |
| `backend/Dockerfile` | Added Maven build stage and non-root Java runtime stage. | Keep compiler/source out of the runtime image and avoid root execution. |
| `backend/.dockerignore` | Excluded target output, local env files and logs. | Keep secrets and unnecessary files out of the build context. |
| `frontend/Dockerfile` | Added Node build stage and Nginx runtime stage. | Serve the compiled SPA without running a development server. |
| `frontend/nginx.conf` | Added SPA fallback and `/api/` proxy to the `backend` service. | Keep browser requests same-origin so session cookies and CSRF headers work. |
| `frontend/.dockerignore`, `.env.example`, `.gitattributes` | Added container context exclusions, safe environment documentation and LF rules. | Make handoff safer and more repeatable. |

### Verification

- Expected: backend and frontend images build, containers share a named network, PostgreSQL data uses a named volume and Nginx serves the workflow at host port 8088.
- Actual: Dockerfiles were added but image builds and persistence checks were not run because the application has not passed local Maven/database checks yet. No Docker resources were created.
- Deviation: the guide assumes Maven wrapper files; this checkout has no wrapper and no JDK to generate one, so the backend builder uses the official Maven + Temurin image explicitly.

### Learning boundary

`localhost` inside the backend container would point back to that backend container. The configured `DB_URL` uses the database service name `db`, and the browser only reaches Nginx on the published host port.

### Next single subtask

Read the Compose guide and record the multi-container handoff without deleting or reusing unverified Docker resources.

## 2026-09-18 — stage 16 Compose source

### Goal

Capture the manual database/backend/frontend setup in one repeatable Compose file without creating or deleting Docker data.

### What changed

| File | Change | Why |
| --- | --- | --- |
| `compose.yaml` | Added PostgreSQL 17, backend and frontend services, a database healthcheck, service dependency and external `mini-erp-pgdata` volume. | Preserve the manual network/volume lessons while making startup repeatable. |
| `docs/FILE-MAP.md` and `README.md` | Documented the Compose handoff, environment template and current limitations. | Make secrets and verification boundaries visible. |

### Verification

- `docker compose --env-file .env.example config --quiet`: passed. It validates the Compose shape without printing resolved values or creating resources.
- `docker build --check ./backend` and `docker build --check ./frontend`: blocked because Docker Desktop's Linux engine is not running (`dockerDesktopLinuxEngine` pipe unavailable). The earlier sandbox attempt also lacked Docker Desktop config access.
- No containers, networks or volumes were created, stopped, deleted or reused.

### Learning boundary

Compose can validate configuration without proving that the application image builds or that data survives a restart. Those claims remain unchecked until Docker Desktop, Java-compatible backend source and PostgreSQL are all available.

### Next single subtask

Read the master checklist and audit the staged files and remaining exit gates one guide item at a time before connecting the frontend to the backend API.

## 2026-09-18 — stage 08 product UI connection source

### Goal

Connect the first catalogue screen to the authenticated product API without replacing the invoice/payment mock slice prematurely.

### What changed

| File group | Change | Why |
| --- | --- | --- |
| `frontend/src/types.ts` | Added `Product`, `ProductInput` and generic `PageResult` types. | Keep the API response shape explicit and keep money as strings. |
| `frontend/src/api.ts` | Reused the session/CSRF request helper for product requests. | Product writes inherit the same cookie and CSRF boundary. |
| `frontend/src/pages/ProductsPage.tsx` | Added cancellable pagination, loading, empty, error, delete confirmation and reload behavior. | A page change or mutation cannot leave an older response mounted accidentally. |
| `frontend/src/components/ProductForm.tsx` | Added create/edit form with preserved values on API errors and duplicate-submit protection. | Keep user input safe while the server remains authoritative. |
| `frontend/src/App.tsx`, `Sidebar.tsx`, `styles.scss` | Added Products navigation and compact catalogue presentation. | Make the connected slice reachable on mobile and desktop. |

### Verification

- `npm install --cache .npm-cache` and `npm run build`: passed after the product connection changes.
- Generated `node_modules/`, `.npm-cache/` and `dist/` were removed afterward.
- Live CRUD, pagination, referenced-record deletion and network-failure checks remain pending the backend/JDK/PostgreSQL runtime.

### Learning boundary

The frontend type cast is a compile-time contract, not runtime validation. It is acceptable for this controlled learning app only while the backend and integration tests remain the source of truth.

### Next single subtask

Read the customers-and-suppliers guide and add explicit customer and supplier API/page slices without creating a generic business abstraction.

## 2026-09-18 — stage 09 customer and supplier UI source

### Goal

Repeat the product UI pattern explicitly for customers and suppliers, including optional contact fields and paginated records.

### What changed

| File group | Change | Why |
| --- | --- | --- |
| `frontend/src/types.ts` | Added separate `Customer`/`CustomerInput` and `Supplier`/`SupplierInput` types. | Keep the two business roles independent. |
| `frontend/src/components/CustomerForm.tsx`, `CustomersPage.tsx` | Added customer CRUD form and paginated directory. | Customer requests call only `/api/customers`. |
| `frontend/src/components/SupplierForm.tsx`, `SuppliersPage.tsx` | Added supplier CRUD form and paginated directory. | Supplier requests call only `/api/suppliers`. |
| `frontend/src/App.tsx`, `frontend/src/styles.scss` | Wired both directories into navigation and responsive layout. | Make the two lookup flows usable before invoice/purchase forms. |

### Verification

- `npm run build`: passed after adding both directory flows.
- The forms retain entered values when a request fails, preserve phone strings such as `0771234567`, and disable repeated saves while a request is active.
- Live pagination, invalid-email responses and referenced-record 409 behavior remain pending Java/JDK/PostgreSQL.

### Learning boundary

The UI can show a server error but cannot prove a party is safe to delete. The database foreign keys and backend response remain authoritative once invoices and purchases reference these records.

### Next single subtask

Read the sales-invoice guide and connect the existing invoice form/list to server-calculated totals and snapshot responses.

## 2026-09-18 — stage 10 sales invoice UI source

### Goal

Move invoice create/edit from mock saving to the backend contract while keeping the browser total visibly approximate.

### What changed

| File | Change | Why |
| --- | --- | --- |
| `frontend/src/components/InvoiceForm.tsx` | Added authenticated customer/product lookup requests and API-backed POST/PUT submission. | The browser sends only IDs, date, notes and quantities; the server owns prices, totals and snapshots. |
| `frontend/src/App.tsx` | Stores the server-returned invoice response after a successful save. | The success notice can distinguish authoritative server data from the preview. |

### Verification

- `npm run build`: passed after the invoice form API connection.
- Lookup requests are cancelled when the form closes; payment-locked records disable editing controls.
- Live invoice creation, unknown-product rollback, snapshot persistence and referenced-record behavior remain pending Java/JDK/PostgreSQL.
- The invoice list and payment page still use their mock state until their own API passes are implemented.

### Learning boundary

The preview total is a convenience for the user. It is never sent in the request and must not be used as the saved financial value.

### Next single subtask

Read the purchases guide and add the separate purchase UI/API flow without changing invoice semantics or inventory quantities.

## 2026-09-18 — stage 11 purchase UI source

### Goal

Add purchases as a separate supplier-money-out flow with explicit unit costs and no stock updates.

### What changed

| File group | Change | Why |
| --- | --- | --- |
| `frontend/src/types.ts` | Added purchase item, detail, summary and draft types. | Keep purchase cost fields distinct from sales invoice fields. |
| `frontend/src/components/PurchaseForm.tsx` | Added supplier/product lookup, dynamic cost lines, create/edit requests and payment locks. | The request sends `unitPrice` as purchase cost and never changes catalogue price. |
| `frontend/src/pages/PurchasesPage.tsx` | Added paginated list, server-backed edit/delete, empty/loading/error states and locked paid rows. | Make the separate purchase lifecycle visible. |
| `frontend/src/App.tsx`, `frontend/src/styles.scss` | Wired purchases into navigation and lilac-accented layout. | Keep buying discoverable without mixing it into sales screens. |

### Verification

- `npm run build`: passed after adding purchase UI.
- The frontend source contains no stock quantity or inventory mutation call.
- Live purchase total, supplier/product validation, paid-lock and persistence checks remain pending Java/JDK/PostgreSQL.

### Learning boundary

Matching invoice and purchase shapes does not justify sharing business controllers: sales use customer money-in and catalogue prices, while purchases use supplier money-out and entered costs.

### Next single subtask

Read the manual-payments guide and connect payment history/form behavior to invoice and purchase balances with stable retry IDs.

## 2026-09-18 — stage 12 payment UI source

### Goal

Move manual payment submission and history from mock delays to the append-only payment API while keeping retry safety visible.

### What changed

| File | Change | Why |
| --- | --- | --- |
| `frontend/src/types.ts` | Added the nullable invoice/purchase `PaymentResponse` shape. | A payment belongs to exactly one parent document. |
| `frontend/src/pages/PaymentsPage.tsx` | Added payment-history loading and POST `/api/payments`; mapped server responses into the existing display model. | The server now decides whether a payment is accepted, duplicated or over the balance. |
| `frontend/src/pages/PaymentsPage.tsx` | Kept `requestId` stable across failed submissions and generated a new one only after success. | A retry represents the same intended payment. |

### Verification

- `npm run build`: passed after the payment API connection.
- No gateway, card fields or payment delete action were added.
- Live partial/full payment balances, overpayment rejection, duplicate request replay, concurrent payments and purchase payments remain pending Java/JDK/PostgreSQL.
- The selected invoice data and invoice list are still mock-backed in the parent shell; the next integration pass should refresh document balances from the server after payment success.

### Learning boundary

Disabling the submit button prevents accidental double clicks but does not make a network retry safe. The request UUID and backend unique constraint provide that guarantee.

### Next single subtask

Read the authentication guide again only when changing auth behavior; first connect invoice list/detail refreshes so server payment balances drive the UI consistently.

## 2026-09-18 — invoice and balance refresh integration

### Goal

Remove the remaining invoice-list balance mismatch after API-backed form and payment changes.

### What changed

| File | Change | Why |
| --- | --- | --- |
| `frontend/src/App.tsx` | Loads invoice summaries from `/api/invoices`, fetches detail before edit, deletes through the API and reloads after save/payment. | Server-derived totals, balances and payment status now drive the list when the backend is available. |
| `frontend/src/pages/InvoicesPage.tsx` | Added external loading/error/retry inputs, server-summary display and delete action. | Keep list state visible without pretending summary rows contain detail line items. |
| `frontend/src/types.ts` | Added `InvoiceSummary`. | Distinguish list response fields from detail response fields. |

### Verification

- `npm run build`: passed after invoice list/detail/delete and refresh integration.
- The frontend now shows an API error/retry state instead of silently keeping stale invoice data when the list request fails.
- Live invoice/payment balance verification remains pending Java/JDK/PostgreSQL; payment page still uses the selected invoice state while the parent refresh completes.

### Learning boundary

Summary rows intentionally do not claim to contain item details. The UI fetches the detail endpoint only when edit is requested, keeping list payloads small.

### Next single subtask

Run a static source audit for endpoint paths, file-map coverage and generated-file cleanup before attempting runtime verification again.

## 2026-09-18 — static source audit

### What was checked

- Frontend endpoint calls use the shared session/CSRF request helper; no page calls `fetch` directly.
- New frontend/backend/Docker/test files are listed in `docs/FILE-MAP.md`.
- `npm run build` passed after the final invoice-refresh import fix.
- `git diff --check` passed with only normal LF-to-CRLF warnings for edited Markdown/attributes files.
- Generated `frontend/node_modules/`, `frontend/dist/`, `frontend/.npm-cache/` and `backend/target/` are absent.
- `.gitignore` still contains only its pre-existing learning-pack rule, and `ERP-Learning-Pack/` was not edited.

### Remaining runtime gates

Java/JDK, PostgreSQL/`psql` and the Docker Desktop Linux engine are unavailable in this environment. Therefore Maven tests, Flyway, live auth/CSRF, database-backed CRUD, concurrent payment checks, image builds and Compose startup remain unclaimed.

The test profile now uses explicit non-production `test-user`/`test-password` values for the in-memory security bean; it still requires externally supplied `TEST_DB_*` values and never points at the working database.

## 2026-09-18 — integration test coverage source

### What changed

Added `backend/src/test/java/com/kalara/erp/flow/BusinessFlowIntegrationTest.java` against the isolated `test` profile. It covers server-calculated invoice totals, historical price snapshots, unknown-product rollback, idempotent payment replay, overpayment rejection and safe deletion failure for a referenced customer.

### Verification

The test source was reviewed but not executed because Java/JDK and PostgreSQL are unavailable. It uses MockMvc with `@WithMockUser` and `csrf()` for authenticated writes; no test method globally disables the security filter chain.

## 2026-09-18 — auth expiry resilience

### What changed

`frontend/src/api.ts` now emits a small session-expired event for later authenticated 401 responses, and `frontend/src/App.tsx` returns the user to the login screen with a clear message. Initial `/api/me` and failed `/api/login` 401s remain local decisions so they do not create a redirect loop.

### Verification

`npm run build` passed after this change. Live session expiry and cookie behavior still require the Spring backend.

## 2026-09-18 — frontend mock removal

### Goal

Ensure the reachable application no longer falls back to hard-coded business records after the API connection work.

### What changed

| File group | Change | Why |
| --- | --- | --- |
| `frontend/src/utils.ts` | Added shared formatting/status helpers. | Keep display-only logic without keeping business records in the browser. |
| `frontend/src/App.tsx` | Starts invoice/payment state empty and relies on API results. | Prevent stale mock records from appearing as real data. |
| `frontend/src/mockData.ts` | Removed. | No mock catalogue, invoice or payment dataset remains. |
| `frontend/src/pages/ComingSoonPage.tsx` | Removed after all navigation views became real screens. | Avoid a placeholder path in the application shell. |

### Verification

- `npm run build`: passed after removing mock records and the placeholder page.
- Generated frontend folders were removed after the check.
- Runtime empty/loading/error behavior still requires a running authenticated backend.

## 2026-09-18 — lookup pagination optimization

### Goal

Prevent invoice and purchase forms from silently limiting product, customer or supplier choices to the first 100 records.

### What changed

| File group | Change | Why |
| --- | --- | --- |
| `frontend/src/components/LookupPager.tsx` | Added a reusable previous/next lookup control. | Keep the pagination behavior visible and easy to understand. |
| `frontend/src/components/InvoiceForm.tsx` | Requests customer/product pages of ten and preserves selected edit records as explicit options when they are on another page. | Every server lookup page remains reachable without losing historical selections. |
| `frontend/src/components/PurchaseForm.tsx` | Added the same explicit supplier/product paging behavior. | Purchase lookups follow the same accessibility and data-access rule. |
| `frontend/src/styles.scss` | Added compact lookup pager styling. | Keep the controls readable on mobile forms. |

### Verification

- `npm run build`: passed after the lookup pagination change.
- Generated frontend folders were removed afterward.
- Live page boundaries and lookup data require the backend runtime to execute.

## 2026-09-18 — server-side invoice pagination

### Goal

Remove the arbitrary 100-record invoice-list cap and keep search/status filtering aligned with server-derived payment state.

### What changed

| File group | Change | Why |
| --- | --- | --- |
| `backend/src/main/java/com/kalara/erp/invoice/InvoiceRepository.java` | Added a paged query for invoice/customer search and derived payment-status filters. | Filtering and page boundaries now operate over the full database result set. |
| `backend/src/main/java/com/kalara/erp/invoice/InvoiceService.java`, `InvoiceController.java` | Added `q` and `status` parameters with validation. | Keep the API contract explicit and reject unknown status values. |
| `frontend/src/pages/InvoicesPage.tsx` | Fetches one server page at a time and sends search/status parameters. | Avoid loading an arbitrary maximum into the browser. |
| `frontend/src/App.tsx` | Lets the invoice page own list loading while retaining the current page for payment navigation. | Keep list pagination close to its controls. |

### Verification

- `npm run build`: passed after the server-pagination integration.
- Generated frontend folders were removed afterward.
- The JPQL query, Flyway schema and live filtered page behavior remain pending Maven/PostgreSQL verification.

## 2026-09-18 — payment history pagination

### Goal

Avoid loading an arbitrary 100-payment history page into the browser.

### What changed

`frontend/src/pages/PaymentsPage.tsx` now requests ten payment records at a time, displays the server’s total count and exposes previous/next history controls. A successful new payment returns the history view to page one while preserving its retry-safe request ID behavior.

### Verification

- `npm run build`: passed after payment history pagination.
- Generated frontend folders were removed afterward.
- Live page totals and payment persistence remain pending the backend runtime.

### Next single subtask

Install or expose the required runtime tools, then run the backend test profile and the documented acceptance matrix without changing the learning pack or `.gitignore`.

## 2026-09-18 — payment invoice lookup pagination

### Goal

Keep the manual-payment screen useful when it is opened directly, even when the invoice list is currently showing a different server page.

### What changed

`frontend/src/pages/PaymentsPage.tsx` now requests unpaid invoice summaries independently with ten records per page. The screen keeps the invoice-page records as a small fallback for navigation from an invoice action, merges records by ID, and refreshes the lookup after a successful payment. `LookupPager` is reused for the invoice selector.

### Verification

- `npm ci --cache .npm-cache` and `npm run build`: passed.
- Generated frontend folders were removed afterward.
- Live unpaid-invoice page boundaries and payment balance refresh remain pending the backend runtime.

## 2026-09-18 — test profile startup correction

### Goal

Make the security and business-flow test context start with the same required configuration as the application.

### What changed

`backend/src/test/resources/application-test.properties` now supplies explicit non-production credentials for the in-memory test user. Database connection values remain external `TEST_DB_*` settings.

### Verification

- Source configuration review completed.
- Maven tests remain pending because Java/JDK, Maven and PostgreSQL are unavailable in this environment.

## 2026-09-18 — purchase payment UI and responsive records

### Goal

Complete the second supported payment parent and keep record-heavy views usable on small screens.

### What changed

| File group | Change | Why |
| --- | --- | --- |
| `backend/src/main/java/com/kalara/erp/purchase/PurchaseRepository.java`, `PurchaseService.java`, `PurchaseController.java` | Added server-side `ALL`, `PAID`, `UNPAID` and `PARTIALLY_PAID` purchase filters. | The payment selector can page only unpaid purchases instead of loading an arbitrary maximum. |
| `frontend/src/pages/PurchasesPage.tsx` | Added current-page context, responsive cards and a purchase payment action. | Purchase balances can enter the shared manual-payment flow. |
| `frontend/src/pages/PaymentsPage.tsx`, `frontend/src/types.ts`, `frontend/src/App.tsx` | Added invoice/purchase parent selection, lookup paging, purchase refresh handling and nullable payment parent IDs. | The browser now matches the backend’s exclusive invoice-or-purchase payment contract. |
| `frontend/src/styles.scss`, `frontend/src/pages/InvoicesPage.tsx` | Hide desktop tables below the tablet breakpoint and use compact cards on mobile. | Preserve the mobile-first layout direction without removing desktop tables. |

### Verification

- `npm run build`: passed after the invoice/purchase payment changes.
- Payment history now resolves purchase numbers from the active paged lookup as well as invoice numbers.
- Selecting a different payment parent now starts a new retry-safe request ID; retries remain stable only for the same intended payment.
- Generated frontend folders were removed afterward.
- Purchase JPQL, payment behavior and responsive rendering remain pending runtime/browser verification.

## 2026-09-18 — directory mobile cards and success states

### Goal

Apply the mobile-first record pattern consistently to every navigable directory, not only invoices, purchases and payments.

### What changed

`ProductsPage.tsx`, `CustomersPage.tsx` and `SuppliersPage.tsx` now use explicit readable record components: desktop tables are hidden below the tablet breakpoint, compact cards are shown on mobile, and successful create/update/delete operations announce a status message. Existing pagination, loading, empty and API-error behavior remains intact.

Unused placeholder-screen styles were removed from `styles.scss`; no reachable placeholder component or mock record source remains.

### Verification

- `npm ci --cache .npm-cache` and `npm run build`: passed.
- Generated frontend folders were removed afterward.
- Browser-width and keyboard verification remain pending because the live backend/runtime is unavailable.

## 2026-09-18 — concurrent payment test coverage

### Goal

Cover the workbook’s payment exit cases more directly: partial payment, full settlement, derived invoice balance and two competing payments against one invoice.

### What changed

`backend/src/test/java/com/kalara/erp/flow/BusinessFlowIntegrationTest.java` now verifies that a 200.00 payment leaves a 450.00 balance, a 450.00 payment settles the invoice, and two concurrent 400.00 requests produce exactly one created payment and one 409 conflict. The concurrent requests attach their own MockMvc user because `@WithMockUser` is not propagated to executor threads.

The same flow suite now creates a purchase and a separate sales invoice, pays only the purchase, and asserts that the purchase is settled while the invoice remains unpaid. Zero-total documents are excluded from the server-side `UNPAID` lookup because their derived status is already `PAID` without a payment.

`SecurityIntegrationTest.java` also rejects a wrong password through the configured form-login endpoint.

### Verification

- Source review completed, including explicit executor cleanup and a bounded ten-second wait for each competing request.
- Maven/PostgreSQL execution remains pending because the required runtime is unavailable.

### Next single subtask

Expose Java, Maven, PostgreSQL and the Docker Desktop Linux engine, then run the backend tests and the documented mobile/browser acceptance matrix. Source work must not be called runtime-complete until those checks pass.

## 2026-09-18 — acceptance matrix

### Goal

Make every remaining verification claim explicit before runtime tools become available.

### What changed

Added `docs/ACCEPTANCE-MATRIX.md` with separate rows for frontend builds, responsive/accessibility checks, API validation/authentication, invoice snapshots, payments, persistence, Compose and protected-file boundaries. Each row identifies whether current evidence is a source proof, a passed static command or a pending runtime/browser check.

### Verification

- The latest frontend production build passed before the matrix was added.
- `docker compose --env-file .env.example config --quiet` passed previously without creating resources.
- Java, Maven, PostgreSQL and the Docker engine are still unavailable, so backend/container/browser rows remain pending.

## 2026-09-18 — backend compilation verification

### Goal

Use the Java runtime discovered in Android Studio to verify as much of the backend as the current machine allows, without changing the protected learning pack or substituting a different database engine.

### What changed

Spring Boot 4 keeps MVC test support in `spring-boot-starter-webmvc-test` and exposes `AutoConfigureMockMvc` from `org.springframework.boot.webmvc.test.autoconfigure`. The backend test dependency and both integration-test imports were updated accordingly.

### Verification

- Android Studio supplied JDK 25.0.3, which successfully compiled the project with Maven's Java 21 release target.
- `mvn -q -DskipTests package` passed, including production and test-source compilation.
- The full test suite starts, but its Spring context cannot initialize without a real PostgreSQL test database. The test profile intentionally requires separate `TEST_DB_URL`, `TEST_DB_USER` and `TEST_DB_PASSWORD` values; this machine has no PostgreSQL server available.
- Temporary Maven/dependency/build directories will be removed after verification. No database alternative is being introduced because the locking and migration checks are PostgreSQL-specific.

### Next single subtask

Provide an isolated PostgreSQL test database (or start the Docker Linux engine), then rerun `mvn test` with the `TEST_DB_*` values before claiming backend behavior is runtime-complete.

## 2026-09-18 — runtime acceptance verification

### Goal

Run the application through its real PostgreSQL, Docker Compose and browser boundaries, then record the acceptance result without changing the protected learning pack or `.gitignore`.

### What changed

Boot 4 Flyway startup was corrected by using the dedicated `spring-boot-starter-flyway` together with the PostgreSQL Flyway database module. Compose now starts PostgreSQL, applies all five migrations, starts the backend and serves the frontend through the Nginx API proxy.

### Verification

- The isolated PostgreSQL test database ran the complete backend suite: 13 tests passed across money, security, invoice, purchase and payment flows.
- Live HTTP smoke checks passed for CSRF acquisition, anonymous protection, login, missing-CSRF rejection, product/customer/invoice creation, server-calculated invoice total, historical unit-price snapshot, payment idempotency, paid-document locking, validation errors and logout.
- The live smoke result was: invoice total `51.00`, historical unit price `25.50` after the product changed to `30.00`, first payment `201`, same request ID `200`, paid edit `409`, invalid product price `400`.
- Restarting the database and backend preserved the invoice count (`1` before and `1` after) and Flyway version `5`.
- Browser verification passed at the live mobile viewport (`360px` form and drawer/card layout) and desktop viewport (`1366px` sidebar, table and wide form layout). A keyboard tab focus outline was also observed.
- The frontend production build and Compose image build passed. The application is available at `http://localhost:8088` while the Compose stack is running.

### Protected boundaries

`ERP-Learning-Pack/` remains ignored and unchanged. `.gitignore` remains unchanged. No payment gateway or inventory functionality was added; payments remain manual and inventory is not mutated.

### Next single subtask

Repeat the acceptance matrix after future feature changes. Current source, container, API, persistence and browser verification are complete for the proposed learning-pack scope.
