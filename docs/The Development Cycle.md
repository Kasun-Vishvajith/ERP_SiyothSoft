# The Development Cycle

## What this document is for

This document explains how the Mini ERP application was built from the first idea to the working application.

It is written for someone who wants to understand the codebase, not only copy commands. It explains:

- what was built and why;
- how the frontend, backend and database work together;
- why the security rules exist;
- how totals, snapshots and payments stay safe;
- what the important files do;
- what the file extensions mean; and
- how to run and test the application.

The project is intentionally small. It includes products, customers, suppliers, sales invoices, purchases and manual payments. It does not include a payment gateway, stock/inventory changes, or a large multi-user identity system.

---

## 1. Start with the main idea

### What is an ERP?

ERP means **Enterprise Resource Planning**. An ERP keeps business records in one place and connects those records.

```text
Product catalogue
       │
       ├── Sales invoice ── Customer
       │         │
       │         └── Manual payment
       │
       └── Purchase ─────── Supplier
                 │
                 └── Manual payment
```

For example:

1. A product has a current selling price.
2. A customer buys the product.
3. The application creates an invoice.
4. The backend calculates the invoice total.
5. The customer pays later or immediately.
6. The payment reduces the invoice balance.

The application also records purchases from suppliers. A purchase uses a cost entered by the user. It does not change stock because inventory is outside this learning scope.

### The most important rule

The browser is useful for input and display. The backend is the authority for business data.

The browser may show a total preview, but the backend calculates and saves the real total. The same idea is used for payment balances, payment status, snapshots and payment locks.

```text
Browser preview: helpful for the user
Backend result: the saved business truth
Database rules: the final safety boundary
```

---

## 2. The basic web application model

The project has three main parts.

### Frontend

The frontend is the part the user sees in the browser. It contains React components, forms, tables, mobile cards and API calls.

Technology:

- React for reusable user-interface components;
- TypeScript for safer JavaScript;
- SCSS for styles and responsive layout;
- Vite for development and production builds.

### Backend

The backend receives HTTP requests, checks them, applies business rules, reads and writes the database, and returns JSON.

Technology:

- Java 21;
- Spring Boot 4.1.1;
- Spring MVC for HTTP endpoints;
- Spring Data JPA for database access;
- Spring Security for login, sessions and CSRF;
- Bean Validation for request validation;
- Flyway for database migrations.

### Database

PostgreSQL stores durable business data. Browser memory is temporary, so a database is needed to keep records after a browser or service restart.

### One request from beginning to end

```text
User clicks Save
      ↓
React form creates JSON
      ↓
frontend/src/api.ts sends a same-origin request
      ↓
Nginx forwards /api/ to Spring Boot
      ↓
Controller validates the request shape
      ↓
Service applies business rules in a transaction
      ↓
Repository reads/writes PostgreSQL
      ↓
Spring returns JSON and an HTTP status
      ↓
React updates the screen
```

Understanding this flow makes the rest of the code easier to read.

---

## 3. What the file extensions mean

| Extension or name | Meaning in this project |
| --- | --- |
| `.md` | Markdown documentation with headings, lists, tables and code blocks. |
| `.tsx` | TypeScript that can contain JSX, which looks like HTML inside React code. |
| `.ts` | TypeScript without JSX. Used for types, API helpers and configuration. |
| `.scss` | Sass stylesheet. This project uses it for variables, layout, responsive rules and states. |
| `.java` | Java source for Spring Boot, entities, services, controllers and tests. |
| `.sql` | PostgreSQL commands used by Flyway migrations. |
| `.properties` | Simple `key=value` Spring configuration. |
| `.xml` | Structured configuration. `pom.xml` describes Maven dependencies and the build. |
| `.json` | Data and npm metadata. API responses also use JSON. |
| `.yaml` / `.yml` | Configuration written in YAML. `compose.yaml` describes Docker services. |
| `.html` | The browser document where React is mounted. |
| `.lock` | Exact dependency versions. `package-lock.json` makes installs repeatable. |
| `Dockerfile` | Instructions for building a container image. |
| `.dockerignore` | Files excluded from a Docker build context. |
| `.gitignore` | Files Git should ignore. The existing file ignores the learning pack. |
| `.gitattributes` | Git rules for text handling, including line endings. |

The extension is a clue about the job of the file. A `.sql` file should describe database changes, while a `.tsx` file should describe a React screen or component.

---

## 4. The development cycle

The application was built in small stages. Each stage answered one question before the next larger feature was added.

```text
Understand the brief
        ↓
Choose boundaries and structure
        ↓
Create backend and database foundations
        ↓
Build one business area at a time
        ↓
Add the React shell and connect it to the API
        ↓
Add security and tests
        ↓
Containerise the application
        ↓
Run API, database, container and browser checks
        ↓
Document what was learned
```

### Stage 1: Read the learning pack and protect the boundary

`ERP-Learning-Pack/` was read before implementation. It contains the learning material and business requirements. It was not edited.

The root `.gitignore` contains:

```gitignore
/ERP-Learning-Pack/
```

This keeps the original learning material separate from the implementation. The code was built beside the pack, not inside it.

The project records the work in:

- `docs/LEARNING-LOG.md` for the chronological history;
- `docs/FILE-MAP.md` for the real file inventory;
- `docs/ACCEPTANCE-MATRIX.md` for tested requirements; and
- this document for the complete learning explanation.

### Stage 2: Choose the architecture

The backend uses a simple layered structure:

```text
Controller  →  Service  →  Repository  →  Database
     ↑             │
     └── DTOs ─────┘
```

The controller owns HTTP routes. A request DTO defines allowed input. A response DTO defines safe output. The service owns business rules and transactions. The repository owns database access.

Without layers, one controller would contain HTTP handling, SQL, money calculations and security decisions. Layers make each responsibility easier to understand and test.

### Stage 3: Create the backend foundation

The backend starts at `backend/src/main/java/com/kalara/erp/ErpApplication.java`. `@SpringBootApplication` starts Spring Boot and scans the `com.kalara.erp` package.

`backend/pom.xml` adds Spring Web, JPA, validation, Security, PostgreSQL, Flyway and test dependencies. The Java target is 21.

`application.properties` reads database settings from the environment:

```properties
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USER}
spring.datasource.password=${DB_PASSWORD}
server.address=${SERVER_ADDRESS:127.0.0.1}
server.port=8080
```

The local default binds to `127.0.0.1`, keeping a directly started backend private. Docker supplies `0.0.0.0` inside its internal network so the frontend container can reach it.

Hibernate uses `ddl-auto=validate`. Hibernate checks that Java mappings match the database, but it does not silently create tables. Flyway owns schema changes through visible, numbered migration files.

### Stage 4: Build the database one migration at a time

Flyway runs `backend/src/main/resources/db/migration/` files in version order.

`V1__create_products.sql` creates products. `V2__create_parties.sql` creates customers and suppliers. `V3__create_sales_invoices.sql` creates invoice headers and lines. `V4__create_purchases.sql` creates purchase headers and lines. `V5__create_payments.sql` creates payments.

The migrations use primary keys, foreign keys, indexes, `NOT NULL` fields and database checks. These rules protect data even if another client calls the database later.

Invoice and purchase lines keep both relationship IDs and historical values:

```text
product_id    → which catalogue product was used
product_name  → what it was called at the time
unit_price    → what the price/cost was at the time
line_total    → calculated value for the line
```

This is the snapshot rule. A later catalogue change must not rewrite an old financial document.

The payment migration also contains:

```sql
request_id uuid NOT NULL UNIQUE
```

and a check that exactly one of `invoice_id` or `purchase_id` is present. These are database-level protections for safe retry and correct parent ownership.

### Stage 5: Build common backend rules

`common/Money.java` centralises exact calculations. It rejects missing or negative amounts, invalid quantities and unsupported precision. `RoundingMode.UNNECESSARY` prevents a value such as `1.001` from being silently rounded.

`common/PageResponse.java` gives every list endpoint the same shape:

```json
{
  "content": [],
  "page": 0,
  "size": 10,
  "totalElements": 0,
  "totalPages": 0
}
```

`common/ApiExceptionHandler.java` turns expected failures into safe JSON messages. It returns `400` for invalid input, `404` for missing records and `409` for business conflicts. It does not expose SQL, stack traces or schema names to the browser.

### Stage 6: Build products, customers and suppliers

Each directory follows the same pattern:

```text
Entity          database mapping
Request         allowed and validated input
Response        safe API output
Repository      database access
Service         operations and transactions
Controller      HTTP routes
```

For example, products provide:

```text
GET    /api/products?page=0&size=10
GET    /api/products/{id}
POST   /api/products
PUT    /api/products/{id}
DELETE /api/products/{id}
```

The client cannot choose a new database ID. Names are trimmed. Pagination is limited and sorted by a unique ID so page boundaries are stable. A referenced customer cannot be deleted because an invoice still needs that relationship.

### Stage 7: Build invoices with server authority

The invoice form sends references and quantities, not trusted money:

```json
{
  "customerId": 1,
  "date": "2026-09-18",
  "notes": "Practice sale",
  "items": [{ "productId": 3, "quantity": 2 }]
}
```

There is no client-owned total, unit price or line total in this request.

`InvoiceService.create()` runs in a transaction:

1. find the customer;
2. find every product;
3. calculate every line with `Money.lineTotal()`;
4. add the line totals;
5. save the invoice header;
6. save product name and price snapshots; and
7. return the saved invoice and its payment balance.

If a product is unknown, the transaction fails and the partial invoice is rolled back.

Invoice search and status filtering are server-side:

```text
GET /api/invoices?q=Runtime&status=PAID&page=0&size=10
```

Status is derived from the saved invoice total and the sum of its payments. It is `UNPAID`, `PARTIALLY_PAID` or `PAID`.

### Stage 8: Build purchases without inventory side effects

Purchases are similar to invoices, but they represent buying from a supplier. A purchase line includes a unit cost:

```json
{
  "supplierId": 2,
  "date": "2026-09-18",
  "items": [{ "productId": 3, "quantity": 4, "unitPrice": "18.00" }]
}
```

The backend calculates the purchase total from cost and quantity and snapshots the supplier and product names. The form says that the selling price is not changed. No stock count is created or changed because inventory is outside this project.

### Stage 9: Build manual payments safely

The payment feature records money already received. It is not a card processor, bank API or payment gateway.

```json
{
  "requestId": "a-unique-uuid",
  "invoiceId": 5,
  "purchaseId": null,
  "amount": "100.00",
  "method": "BANK_TRANSFER",
  "paidOn": "2026-09-18",
  "reference": "TRANSFER-001"
}
```

Exactly one parent is required:

```text
invoiceId set, purchaseId empty  → valid invoice payment
invoiceId empty, purchaseId set  → valid purchase payment
both set or both empty            → rejected
```

#### Why a request ID exists

Networks fail. A user can click Save and not see the response. If the frontend sends the same payment again, the backend must not create a second payment.

The frontend creates a UUID and keeps it until that intended payment succeeds. The database makes `request_id` unique. The service checks that a repeated request has the same details.

```text
First request with this ID       → 201 Created
Same request with same details   → 200 OK, existing payment
Same ID with changed details     → 409 Conflict
```

#### Why row locking exists

Suppose an invoice has LKR 650 outstanding and two requests arrive for LKR 400.

Without a lock, both requests could read 650 before either payment is saved. The invoice could receive LKR 800. `PaymentService` loads the invoice or purchase with a database row lock before checking the balance. One request finishes first, and the other sees the new balance and returns `409 Conflict`.

#### Why payments lock editing

After money is recorded, changing the original document would change the meaning of an already recorded financial event. Invoice and purchase services reject update and delete when a payment exists. The browser shows a warning, but the backend enforces the real rule.

### Stage 10: Build the React application shell

`frontend/src/main.tsx` mounts `<App />` inside React `StrictMode`.

`frontend/src/App.tsx` coordinates:

- login state and the signed-in username;
- the current navigation view;
- mobile drawer state;
- invoice and purchase reload signals;
- the currently edited invoice;
- the payment target; and
- shared success/error messages.

The app starts with `GET /api/me`:

```text
loading      → show a session check
401          → show LoginPage
other error  → show a backend-unavailable message
success      → show the application shell
```

App chooses which page to show. It does not contain every form field, so navigation logic stays separate from page logic.

#### React ideas used here

- **Component:** a reusable piece of UI, such as `Sidebar` or `InvoiceForm`.
- **Props:** values and callbacks passed from a parent to a child.
- **State:** changing data held by a component, such as form input or loading status.
- **Effect:** work related to something outside rendering, such as loading an API page.
- **Type:** a TypeScript description of expected data.

`frontend/src/types.ts` defines products, customers, suppliers, invoices, purchases, payments and paged results. This gives the frontend a shared language for API data.

### Stage 11: Build the mobile-first UI

The design uses cool off-white backgrounds, white cards, muted cornflower-blue actions, mint payment states and lilac purchase accents.

Mobile is the first layout:

- a hamburger button opens the navigation drawer;
- wide tables become compact record cards;
- forms use one column;
- controls fit narrow screens;
- the drawer closes through its close button, scrim or Escape.

Desktop adds:

- a persistent sidebar;
- data tables instead of cards;
- wider line-item rows;
- two-column form fields; and
- side-by-side payment form and history.

The main responsive rules are in `frontend/src/styles.scss`:

```scss
@media (min-width: 768px) { /* tables and wider line items */ }
@media (min-width: 960px) { /* persistent sidebar and wide shell */ }
```

The stylesheet also contains focus outlines, reduced-motion support, skeleton loading states, alerts, empty states and overflow protection. The live browser check used 360px mobile and 1366px desktop widths.

### Stage 12: Connect the frontend to the API

All requests go through `frontend/src/api.ts`. The helper:

1. uses relative `/api/...` paths;
2. sends cookies with `credentials: "same-origin"`;
3. adds JSON content type when needed;
4. gets a CSRF token before a write;
5. adds the server-provided CSRF header;
6. converts failures into `HttpError` objects; and
7. announces later `401` responses so the app can return to login.

The pages use this helper instead of many different `fetch` implementations.

Every list follows this state model:

```text
loading → request API
success + records → table/cards
success + no records → EmptyState
failure → readable error alert
write success → success notice and reload
write failure → validation or conflict alert
```

The invoice page adds server search, status filtering and pagination. The product, customer and supplier pages add CRUD forms. Purchase and payment pages add their own lookups and histories.

Form totals are previews only. On submit, the backend loads the real records and calculates the saved value.

### Stage 13: Add authentication and security

Security was added before the application was treated as complete. Hidden buttons are not security; a user can call an API directly.

`SecurityConfig.java` reads one learning account from `ERP_USERNAME` and `ERP_PASSWORD`. Spring hashes the password with BCrypt. Successful login creates a session cookie. The password is not stored in the frontend or local storage.

This is intentionally a simple learning account. A larger application would add a user table, roles, account recovery and an identity provider.

Public endpoints are:

- `/api/health` for process health;
- `/api/csrf` to bootstrap the CSRF token;
- `/api/login` for sign-in; and
- `/error` for framework errors.

All business APIs require an authenticated session.

#### Why CSRF protection exists

The app uses cookies for the session, and browsers automatically send matching cookies. A malicious site could try to make a logged-in browser submit a request unless the application checks that the request came from the real app.

CSRF means **Cross-Site Request Forgery**. The backend gives the real frontend a token. The frontend sends it on write requests. Spring rejects a write without a valid token.

```text
GET /api/csrf        → token and header name
POST /api/invoices   → session cookie + CSRF header
```

CSRF is not a password and does not replace authentication. It protects cookie-based writes from unwanted cross-site actions.

The session cookie is `HttpOnly`, uses `SameSite=Lax`, and has a 30-minute timeout. Validation also matters: DTO constraints reject invalid values, services enforce business rules, database constraints protect relationships, and API errors hide SQL and stack traces.

### Stage 14: Add tests

Tests are executable explanations of important rules.

`MoneyTest.java` is a unit test. It tests exact multiplication, rejects zero quantity and rejects unsupported precision without starting the complete application.

`SecurityIntegrationTest.java` starts Spring and uses `MockMvc` to test anonymous access, CSRF, logout and wrong-password behavior.

`BusinessFlowIntegrationTest.java` uses a separate PostgreSQL test database. It checks:

- invoice totals and historical price snapshots;
- rollback when a product is unknown;
- partial and full payments;
- overpayment rejection;
- request ID retry behavior;
- concurrent payment locking;
- separation of invoice and purchase payments; and
- protection against deleting a referenced customer.

The test profile requires `TEST_DB_URL`, `TEST_DB_USER` and `TEST_DB_PASSWORD`. It must never silently use the working database. The verified run passed all 13 backend tests.

### Stage 15: Containerise the application

Docker packages the application with consistent runtime versions.

`backend/Dockerfile` uses two stages:

```text
Maven + Java 21 builder  → compiles app.jar
Java 21 JRE runtime      → runs app.jar
```

The final image does not need Maven and runs as a non-root `erp` user. This reduces tools and privileges in the runtime container.

`frontend/Dockerfile` uses:

```text
Node builder  → npm ci and npm run build
Nginx runtime → serves the generated dist folder
```

`frontend/nginx.conf` serves the React application, falls back to `index.html` for client-side paths, and proxies `/api/` to the backend. The proxy keeps browser requests same-origin, which helps session cookies and CSRF behavior.

### Stage 16: Run the services with Compose

`compose.yaml` defines:

```text
db        → PostgreSQL 17
backend   → Spring Boot API
frontend  → Nginx and React build
```

The backend waits for the database health check. PostgreSQL uses the external Docker volume `mini-erp-pgdata`. The external volume makes the data boundary clear and prevents a normal `docker compose down` from deleting records.

The frontend is published only to `127.0.0.1:8088`, keeping the learning app local to the machine.

`.env.example` documents `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `ERP_USERNAME` and `ERP_PASSWORD` without real credentials. Create an untracked `.env` from it and replace the placeholders.

---

## 17. Complete codebase map

### Root and documentation

| File | Why it exists |
| --- | --- |
| `README.md` | Quick project status, setup and file overview. |
| `.env.example` | Safe template for database and login environment values. |
| `.gitignore` | Existing Git rules. It was left unchanged and ignores the learning pack. |
| `.gitattributes` | Keeps text files consistent across operating systems. |
| `compose.yaml` | Connects PostgreSQL, backend and frontend containers. |
| `docs/LEARNING-LOG.md` | Chronological decisions and verification notes. |
| `docs/FILE-MAP.md` | Inventory of implementation files. |
| `docs/ACCEPTANCE-MATRIX.md` | Requirement-by-requirement evidence. |
| `docs/The Development Cycle.md` | This complete learning explanation. |

### Frontend configuration

| File | Why it exists |
| --- | --- |
| `frontend/package.json` | Npm scripts and dependency versions. |
| `frontend/package-lock.json` | Exact dependency tree used by npm. |
| `frontend/tsconfig.json` | TypeScript project references. |
| `frontend/tsconfig.app.json` | Strict settings for application code. |
| `frontend/tsconfig.node.json` | TypeScript settings for Vite configuration. |
| `frontend/vite.config.ts` | React plugin, development port and local API proxy. |
| `frontend/index.html` | Browser document containing the React mount element. |
| `frontend/Dockerfile` | Builds the frontend and packages it in Nginx. |
| `frontend/nginx.conf` | SPA fallback and backend API proxy. |
| `frontend/.dockerignore` | Keeps local dependencies and generated files out of the build context. |

### Frontend shared code and components

| File | Why it exists |
| --- | --- |
| `frontend/src/main.tsx` | Mounts React and enables `StrictMode`. |
| `frontend/src/App.tsx` | Coordinates authentication, navigation, forms and page transitions. |
| `frontend/src/api.ts` | One helper for cookies, CSRF, JSON requests and typed HTTP errors. |
| `frontend/src/types.ts` | Shared TypeScript shapes for API records and drafts. |
| `frontend/src/utils.ts` | Money formatting and payment-status labels. |
| `frontend/src/styles.scss` | Mobile-first layout, colors, cards, tables, states and focus styles. |
| `frontend/src/components/Sidebar.tsx` | Desktop sidebar and mobile drawer. |
| `frontend/src/components/StatusBadge.tsx` | Consistent payment-state badges. |
| `frontend/src/components/EmptyState.tsx` | Shared no-records message. |
| `frontend/src/components/LookupPager.tsx` | Previous/next controls for paged lookups. |
| `frontend/src/components/InvoiceForm.tsx` | Sales invoice create/edit form and server-authoritative save. |
| `frontend/src/components/PurchaseForm.tsx` | Purchase create/edit form and cost lines. |
| `frontend/src/components/ProductForm.tsx` | Product create/edit form. |
| `frontend/src/components/CustomerForm.tsx` | Customer create/edit form. |
| `frontend/src/components/SupplierForm.tsx` | Supplier create/edit form. |

### Frontend pages

| File | Why it exists |
| --- | --- |
| `frontend/src/pages/LoginPage.tsx` | Username/password sign-in screen. |
| `frontend/src/pages/InvoicesPage.tsx` | Searchable, status-filtered invoice list with cards/tables. |
| `frontend/src/pages/PaymentsPage.tsx` | Manual payment form and paginated history. |
| `frontend/src/pages/PurchasesPage.tsx` | Purchase list, CRUD actions and payment entry. |
| `frontend/src/pages/ProductsPage.tsx` | Product directory and CRUD actions. |
| `frontend/src/pages/CustomersPage.tsx` | Customer directory and CRUD actions. |
| `frontend/src/pages/SuppliersPage.tsx` | Supplier directory and CRUD actions. |
| `frontend/src/vite-env.d.ts` | Vite and stylesheet type declarations. |

### Backend configuration and common code

| File | Why it exists |
| --- | --- |
| `backend/pom.xml` | Maven dependencies, Java version and Spring Boot build. |
| `backend/src/main/resources/application.properties` | Database, server, JPA, Flyway and session settings. |
| `backend/src/main/java/com/kalara/erp/ErpApplication.java` | Spring Boot entry point. |
| `backend/src/main/java/com/kalara/erp/health/HealthController.java` | Public `GET /api/health`. |
| `backend/src/main/java/com/kalara/erp/security/SecurityConfig.java` | Password hashing, account, session login/logout and CSRF. |
| `backend/src/main/java/com/kalara/erp/security/AuthController.java` | CSRF bootstrap and authenticated `/api/me`. |
| `backend/src/main/java/com/kalara/erp/common/Money.java` | Exact money and quantity rules. |
| `backend/src/main/java/com/kalara/erp/common/PageResponse.java` | Shared paginated response shape. |
| `backend/src/main/java/com/kalara/erp/common/ApiExceptionHandler.java` | Safe API statuses and error messages. |
| `backend/Dockerfile` | Maven build image and Java runtime image. |
| `backend/.dockerignore` | Keeps target output, secrets and logs out of the build context. |

### Backend business areas

Each area uses the entity/request/response/repository/service/controller pattern.

| Area | Files | Main job |
| --- | --- | --- |
| Products | `product/Product.java`, `ProductRequest.java`, `ProductResponse.java`, `ProductRepository.java`, `ProductService.java`, `ProductController.java` | Catalogue data and current selling prices. |
| Customers | `customer/Customer.java`, `CustomerRequest.java`, `CustomerResponse.java`, `CustomerRepository.java`, `CustomerService.java`, `CustomerController.java` | Sales customer directory. |
| Suppliers | `supplier/Supplier.java`, `SupplierRequest.java`, `SupplierResponse.java`, `SupplierRepository.java`, `SupplierService.java`, `SupplierController.java` | Purchase supplier directory. |
| Invoices | `invoice/Invoice.java`, `InvoiceItem.java`, `InvoiceRequest.java`, `InvoiceResponse.java`, `InvoiceSummary.java`, `InvoiceRepository.java`, `InvoiceItemRepository.java`, `InvoiceService.java`, `InvoiceController.java` | Sales documents, totals, snapshots and locks. |
| Purchases | `purchase/Purchase.java`, `PurchaseItem.java`, `PurchaseRequest.java`, `PurchaseResponse.java`, `PurchaseSummary.java`, `PurchaseRepository.java`, `PurchaseItemRepository.java`, `PurchaseService.java`, `PurchaseController.java` | Purchase documents, cost totals, snapshots and locks. |
| Payments | `payment/Payment.java`, `PaymentMethod.java`, `PaymentRequest.java`, `PaymentResponse.java`, `PaymentRepository.java`, `PaymentService.java`, `PaymentController.java` | Manual payments, balances and safe retries. |

### Database migrations

| File | Main job |
| --- | --- |
| `V1__create_products.sql` | Products table. |
| `V2__create_parties.sql` | Customers and suppliers tables. |
| `V3__create_sales_invoices.sql` | Invoice headers, lines, snapshots and indexes. |
| `V4__create_purchases.sql` | Purchase headers, lines, snapshots and indexes. |
| `V5__create_payments.sql` | Payments, parent exclusivity and retry uniqueness. |

### Backend tests

| File | Main job |
| --- | --- |
| `backend/src/test/resources/application-test.properties` | Separate database and test login settings. |
| `backend/src/test/java/com/kalara/erp/common/MoneyTest.java` | Money unit tests. |
| `backend/src/test/java/com/kalara/erp/security/SecurityIntegrationTest.java` | Login, anonymous access and CSRF tests. |
| `backend/src/test/java/com/kalara/erp/flow/BusinessFlowIntegrationTest.java` | Invoice, purchase, payment, rollback and concurrency tests. |

---

## 18. How to run the application

### Docker Compose: recommended path

Start Docker Desktop. From PowerShell:

```powershell
cd "C:\Users\kasun\Projects\SiyothSoft\ERP - 2026-09-18"
Copy-Item .env.example .env
notepad .env
```

Replace the placeholders. Keep `DB_PASSWORD` equal to `POSTGRES_PASSWORD` if the file is also used for a direct backend run. Then create the persistent volume and start the services:

```powershell
docker volume create mini-erp-pgdata
docker compose --env-file .env up --build -d
docker compose --env-file .env ps
```

Open `http://localhost:8088` and use the username and password from `.env`.

To stop without deleting data:

```powershell
docker compose down
```

Do not use `docker compose down -v` for normal stopping. The external `mini-erp-pgdata` volume is the persistence boundary.

### Frontend-only development server

If the backend is already running on `127.0.0.1:8080`, run:

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to the local backend.

### Frontend production check

```powershell
cd frontend
npm ci
npm run build
```

The generated `node_modules` and `dist` folders are build output, not source files.

---

## 19. How to read one feature in the code

Use invoices as the example.

1. Open `frontend/src/pages/InvoicesPage.tsx` and find the API request.
2. Open `frontend/src/api.ts` to see cookies, CSRF and error handling.
3. Open `invoice/InvoiceController.java` and match the route with the frontend path.
4. Open `invoice/InvoiceService.java` to see totals, snapshots, pagination and locks.
5. Open `InvoiceRepository.java` and `InvoiceItemRepository.java` to see database access.
6. Open `V3__create_sales_invoices.sql` to see the real columns and constraints.
7. Open `BusinessFlowIntegrationTest.java` to see expected behavior in executable form.

This six-part path works for products, purchases and payments too:

```text
screen → API helper → controller → service → repository → migration → test
```

The complete lesson is:

```text
input → validation → business rule → transaction → database → response → screen
```

---

## 20. Why the code contains comments

Comments are placed around logic that may not be obvious to a new developer. Good comments explain a reason, not a sentence that merely repeats the code.

Examples in this project explain:

- why local server binding is private;
- why the backend owns money calculations;
- why a managed entity is flushed before a foreign-key conflict is returned;
- why the payment request ID stays stable during a retry;
- why tests use a separate database;
- why the runtime container uses a non-root user; and
- why a purchase does not mutate inventory.

When a rule changes, update its nearby comment. Do not add comments that promise behavior the code does not implement.

---

## 21. What was verified

The completed acceptance work verified:

- frontend TypeScript/Vite production build;
- backend production and test compilation;
- 13 backend tests against isolated PostgreSQL;
- anonymous access rejection;
- login, logout and CSRF behavior;
- server-calculated invoice totals;
- historical product-price snapshots;
- rollback for an unknown product;
- payment retry idempotency;
- overpayment rejection;
- concurrent payment locking;
- invoice/purchase payment separation;
- paid-document edit locking;
- database and business-record persistence after restart;
- Docker Compose startup and Nginx API proxy;
- mobile layout at 360px;
- desktop layout at 1366px; and
- visible keyboard focus.

The learning pack and `.gitignore` remain unchanged. No gateway or inventory feature was added.

---

## 22. A short learning path

Read the project in this order:

1. Read this document once without opening every file.
2. Read `frontend/src/types.ts` to learn the data shapes.
3. Read `frontend/src/api.ts` to learn the browser/server boundary.
4. Read `InvoicesPage.tsx` and `InvoiceForm.tsx`.
5. Read `InvoiceController.java` and `InvoiceService.java`.
6. Read `Invoice.java`, `InvoiceItem.java` and their repositories.
7. Read `V3__create_sales_invoices.sql`.
8. Read `BusinessFlowIntegrationTest.java`.
9. Repeat the same path for payments.
10. Read `SecurityConfig.java` and `AuthController.java`.
11. Read `compose.yaml` and both Dockerfiles.
12. Make one small change, run the build, and update the documentation.

Once you understand the data path, the rest of the Mini ERP is the same set of ideas applied to different business records.
