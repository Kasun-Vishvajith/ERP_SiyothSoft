# Mini ERP file map

This is the actual project inventory. Planned files are added only when the corresponding workbook stage begins; this document does not claim that a planned backend file already exists.

## Root and documentation

| Path | Status | Purpose |
| --- | --- | --- |
| `README.md` | implemented | Project status, frontend startup, UI decisions and next stage. |
| `.gitignore` | pre-existing, unchanged | Currently ignores `ERP-Learning-Pack/`; it is intentionally not edited in this task. |
| `.gitattributes` | pre-existing | Keeps text line endings consistent. |
| `.env.example` | implemented | Documents container environment keys without real credentials. |
| `compose.yaml` | implemented, built and run | PostgreSQL, backend and Nginx services with a named external data volume. |
| `docs/FILE-MAP.md` | implemented | Explains the real files and their stage status. |
| `docs/LEARNING-LOG.md` | implemented | Records the setup check and later learning-stage results. |
| `docs/ACCEPTANCE-MATRIX.md` | implemented, runtime rows verified | Separates source evidence from the completed backend, container and browser checks. |

## Frontend

| Path | Status | Purpose |
| --- | --- | --- |
| `frontend/package.json` | implemented | React/Vite/TypeScript/Sass scripts and pinned dependencies. |
| `frontend/package-lock.json` | implemented | Exact npm dependency resolution. |
| `frontend/Dockerfile` | implemented and built | Node build stage plus small Nginx static runtime. |
| `frontend/nginx.conf` | implemented | SPA fallback and same-origin `/api/` reverse proxy to the backend service. |
| `frontend/.dockerignore` | implemented | Keeps local dependencies, build output, secrets and logs out of the frontend context. |
| `frontend/index.html` | implemented | Browser document and React mount point. |
| `frontend/vite.config.ts` | implemented | Vite React plugin, port and future `/api` proxy. |
| `frontend/tsconfig*.json` | implemented | Strict TypeScript project and build settings. |
| `frontend/src/main.tsx` | implemented | React entry point with StrictMode. |
| `frontend/src/App.tsx` | implemented | Shell state, navigation, current invoice/payment context and screen switching. |
| `frontend/src/api.ts` | implemented | Same-origin session requests, in-memory CSRF token and typed HTTP errors. |
| `frontend/src/types.ts` | implemented | Shared invoice, payment, lookup and navigation types. |
| `frontend/src/utils.ts` | implemented | Shared money formatting and payment-status labels for API-backed screens. |
| `frontend/src/styles.scss` | implemented | Mobile-first layout, responsive breakpoints, colors and focus states. |
| `frontend/src/components/Sidebar.tsx` | implemented | Desktop sidebar and accessible mobile drawer. |
| `frontend/src/components/StatusBadge.tsx` | implemented | Invoice payment-state labels. |
| `frontend/src/components/EmptyState.tsx` | implemented | Reusable empty result state. |
| `frontend/src/components/InvoiceForm.tsx` | implemented | API-backed invoice form, dynamic line validation, preview and payment-lock message. |
| `frontend/src/components/ProductForm.tsx` | implemented | Server-backed product create/edit form with preserved input on errors. |
| `frontend/src/components/CustomerForm.tsx` | implemented | Explicit customer create/edit form with optional contact fields. |
| `frontend/src/components/SupplierForm.tsx` | implemented | Explicit supplier create/edit form with optional contact fields. |
| `frontend/src/components/LookupPager.tsx` | implemented | Small previous/next control for paginated form lookups. |
| `frontend/src/components/PurchaseForm.tsx` | implemented | Purchase create/edit form with supplier/product lookups and explicit unit costs. |
| `frontend/src/pages/InvoicesPage.tsx` | implemented | Server-backed invoice summaries with server search/status filters, pagination, loading/error states and responsive records. |
| `frontend/src/pages/ProductsPage.tsx` | implemented | Authenticated product list with readable table/card records, loading, empty, error, success, pagination and CRUD states. |
| `frontend/src/pages/InventoryPage.tsx` | implemented | Stock dashboard with total/low/out-of-stock summaries, filters and persisted on-hand count editing. |
| `frontend/src/pages/CustomersPage.tsx` | implemented | Customer table/card records, pagination, CRUD actions, success notices and referenced-record error display. |
| `frontend/src/pages/SuppliersPage.tsx` | implemented | Supplier table/card records, pagination, CRUD actions, success notices and referenced-record error display. |
| `frontend/src/pages/PurchasesPage.tsx` | implemented | Purchase list, responsive records, server-backed CRUD, payment action and paid-record locking. |
| `frontend/src/pages/PaymentsPage.tsx` | implemented | API-backed manual-payment form for invoices and purchases, paged unpaid-parent lookups, retry ID, server errors and paginated history. |
| `frontend/src/pages/LoginPage.tsx` | implemented | Accessible username/password form with busy and error states. |
| `frontend/src/vite-env.d.ts` | implemented | Vite client and stylesheet type declarations. |

## Backend and database

| Path | Status | Purpose |
| --- | --- | --- |
| `backend/pom.xml` | implemented and built | Pinned Spring Boot 4.1.1 Maven project with Java 21, Flyway, persistence, security and test dependencies. |
| `backend/Dockerfile` | implemented and built | Multi-stage backend image with Maven build stage and non-root Java runtime. |
| `backend/.dockerignore` | implemented | Keeps build output, local secrets and logs out of the backend build context. |
| `backend/src/main/java/com/kalara/erp/ErpApplication.java` | implemented and built | Spring application entry point and component-scan root. |
| `backend/src/main/java/com/kalara/erp/health/HealthController.java` | implemented and verified | `GET /api/health` process-reachability endpoint. |
| `backend/src/main/resources/application.properties` | implemented and verified | Loopback binding and port 8080 for the local learning backend. |
| `backend/src/main/java/com/kalara/erp/security/SecurityConfig.java` | implemented and verified | In-memory learning account, BCrypt password encoding, sessions, login/logout and CSRF protection. |
| `backend/src/main/java/com/kalara/erp/security/AuthController.java` | implemented and verified | Public CSRF bootstrap plus authenticated `/api/me` session check. |
| `backend/src/test/resources/application-test.properties` | implemented and tested | Separate test-database and test-credential configuration. |
| `backend/src/test/java/com/kalara/erp/common/MoneyTest.java` | implemented and tested | Unit tests for exact multiplication, zero quantity and unsupported precision. |
| `backend/src/test/java/com/kalara/erp/security/SecurityIntegrationTest.java` | implemented and tested | MockMvc checks for anonymous 401, missing CSRF 403 and accepted authenticated logout. |
| `backend/src/test/java/com/kalara/erp/flow/BusinessFlowIntegrationTest.java` | implemented and tested | Separate-database flow checks for invoice totals/snapshots, rollback, invoice/purchase settlement, retry/overpayment, concurrent payment locking and referenced-customer deletion. |
| `backend/src/main/resources/db/migration/V1__create_products.sql` | implemented and applied | First Flyway migration for the products table. |
| `backend/src/main/java/com/kalara/erp/common/PageResponse.java` | implemented and verified | Stable pagination response shape. |
| `backend/src/main/java/com/kalara/erp/common/ApiExceptionHandler.java` | implemented and verified | Converts expected validation, malformed JSON, missing-record and constraint failures to safe API responses. |
| `backend/src/main/java/com/kalara/erp/product/Product.java` | implemented and verified | JPA mapping for products, persisted stock count and guarded stock increase/decrease operations. |
| `backend/src/main/java/com/kalara/erp/product/ProductRequest.java` | implemented and verified | Validated create/update input including optional non-negative stock count. |
| `backend/src/main/java/com/kalara/erp/product/ProductResponse.java` | implemented and verified | API output with money represented as a two-decimal string plus stock count. |
| `backend/src/main/java/com/kalara/erp/product/ProductRepository.java` | implemented and verified | Spring Data access, pagination and pessimistic row locks for stock movement. |
| `backend/src/main/java/com/kalara/erp/product/ProductService.java` | implemented and verified | Product rules, stable pagination, CRUD, stock count updates and transaction boundaries. |
| `backend/src/main/java/com/kalara/erp/product/ProductController.java` | implemented and verified | Product HTTP endpoints under `/api/products`. |
| `backend/src/main/resources/db/migration/V2__create_parties.sql` | implemented and applied | Customer and supplier tables. |
| `backend/src/main/java/com/kalara/erp/customer/Customer.java` | implemented and verified | Customer identity/contact entity. |
| `backend/src/main/java/com/kalara/erp/customer/CustomerRequest.java` | implemented and verified | Validated customer input. |
| `backend/src/main/java/com/kalara/erp/customer/CustomerResponse.java` | implemented and verified | Customer API output. |
| `backend/src/main/java/com/kalara/erp/customer/CustomerRepository.java` | implemented and verified | Customer persistence access. |
| `backend/src/main/java/com/kalara/erp/customer/CustomerService.java` | implemented and verified | Customer normalization, CRUD and pagination rules. |
| `backend/src/main/java/com/kalara/erp/customer/CustomerController.java` | implemented and verified | `/api/customers` HTTP endpoints. |
| `backend/src/main/java/com/kalara/erp/supplier/Supplier.java` | implemented and verified | Supplier identity/contact entity. |
| `backend/src/main/java/com/kalara/erp/supplier/SupplierRequest.java` | implemented and verified | Validated supplier input. |
| `backend/src/main/java/com/kalara/erp/supplier/SupplierResponse.java` | implemented and verified | Supplier API output. |
| `backend/src/main/java/com/kalara/erp/supplier/SupplierRepository.java` | implemented and verified | Supplier persistence access. |
| `backend/src/main/java/com/kalara/erp/supplier/SupplierService.java` | implemented and verified | Supplier normalization, CRUD and pagination rules. |
| `backend/src/main/java/com/kalara/erp/supplier/SupplierController.java` | implemented and verified | `/api/suppliers` HTTP endpoints. |
| `backend/src/main/resources/db/migration/V3__create_sales_invoices.sql` | implemented and applied | Invoice headers, snapshot lines, constraints and indexes. |
| `backend/src/main/java/com/kalara/erp/common/Money.java` | implemented and verified | Exact two-decimal calculations and supported amount limits. |
| `backend/src/main/java/com/kalara/erp/invoice/Invoice.java` | implemented and verified | Sales invoice header mapping and customer snapshot. |
| `backend/src/main/java/com/kalara/erp/invoice/InvoiceItem.java` | implemented and verified | Product/name/price snapshot line mapping. |
| `backend/src/main/java/com/kalara/erp/invoice/InvoiceRequest.java` | implemented and verified | Validated customer/date/line input; clients cannot submit total or price. |
| `backend/src/main/java/com/kalara/erp/invoice/InvoiceSummary.java` | implemented and verified | Lightweight paginated invoice row without items. |
| `backend/src/main/java/com/kalara/erp/invoice/InvoiceResponse.java` | implemented and verified | Invoice detail output with snapshots and money strings. |
| `backend/src/main/java/com/kalara/erp/invoice/InvoiceRepository.java` | implemented and verified | Invoice header persistence. |
| `backend/src/main/java/com/kalara/erp/invoice/InvoiceItemRepository.java` | implemented and verified | Ordered line retrieval and transactional replacement. |
| `backend/src/main/java/com/kalara/erp/invoice/InvoiceService.java` | implemented and verified | Atomic server calculations, snapshots, stock deduction/reversal, create/edit/delete and pagination. |
| `backend/src/main/java/com/kalara/erp/invoice/InvoiceController.java` | implemented and verified | `/api/invoices` list/detail/create/update/delete endpoints. |
| `backend/src/main/resources/db/migration/V4__create_purchases.sql` | implemented and applied | Purchase headers, cost lines, constraints and indexes. |
| `backend/src/main/java/com/kalara/erp/purchase/Purchase.java` | implemented and verified | Purchase header and supplier snapshot mapping. |
| `backend/src/main/java/com/kalara/erp/purchase/PurchaseItem.java` | implemented and verified | Purchase product/cost/quantity snapshot line mapping. |
| `backend/src/main/java/com/kalara/erp/purchase/PurchaseRequest.java` | implemented and verified | Validated supplier/date/purchase-cost line input. |
| `backend/src/main/java/com/kalara/erp/purchase/PurchaseSummary.java` | implemented and verified | Lightweight paginated purchase row. |
| `backend/src/main/java/com/kalara/erp/purchase/PurchaseResponse.java` | implemented and verified | Purchase detail output with cost snapshots and balance placeholders. |
| `backend/src/main/java/com/kalara/erp/purchase/PurchaseRepository.java` | implemented and verified | Purchase header persistence and payment-status filtering. |
| `backend/src/main/java/com/kalara/erp/purchase/PurchaseItemRepository.java` | implemented and verified | Ordered line retrieval and replacement. |
| `backend/src/main/java/com/kalara/erp/purchase/PurchaseService.java` | implemented and verified | Purchase-cost calculations, stock addition/reversal, payment-status filtering and transaction rules. |
| `backend/src/main/java/com/kalara/erp/purchase/PurchaseController.java` | implemented and verified | `/api/purchases` HTTP endpoints including status-filtered lists. |
| `backend/src/main/resources/db/migration/V5__create_payments.sql` | implemented and applied | Append-only payments with exclusive parent ownership and unique retry IDs. |
| `backend/src/main/resources/db/migration/V6__add_product_stock_count.sql` | implemented | Adds a non-negative persisted stock count to products with a zero default for existing rows. |
| `backend/src/main/java/com/kalara/erp/payment/Payment.java` | implemented and verified | Payment table mapping. |
| `backend/src/main/java/com/kalara/erp/payment/PaymentMethod.java` | implemented and verified | Closed CASH/BANK_TRANSFER method set. |
| `backend/src/main/java/com/kalara/erp/payment/PaymentRequest.java` | implemented and verified | Retry-safe payment input and amount validation. |
| `backend/src/main/java/com/kalara/erp/payment/PaymentResponse.java` | implemented and verified | Payment API output with decimal-string amount. |
| `backend/src/main/java/com/kalara/erp/payment/PaymentRepository.java` | implemented and verified | Request-ID lookup, document sums and filtered history. |
| `backend/src/main/java/com/kalara/erp/payment/PaymentService.java` | implemented and verified | Parent locking, duplicate handling and balance checks. |
| `backend/src/main/java/com/kalara/erp/payment/PaymentController.java` | implemented and verified | `/api/payments` list/create endpoints. |

The backend image was built with the container Maven/Temurin toolchain. The live Compose stack connected to PostgreSQL, applied migrations V1 through V5, served `/api/health`, and passed the isolated PostgreSQL test suite.

## Generated verification output

`frontend/node_modules/`, `frontend/dist/`, `backend/target/` and the temporary Maven cache are generated for checks and are not retained in the workspace after verification because the existing `.gitignore` is intentionally unchanged.

## Stage status

- Stages 04–16: source, build, database, API, security and Compose verification passed in the container-backed acceptance run.
- Stage 07 React shell: mobile-first styles, proxy, production build and live 360px/1366px browser layouts verified.
- Stages 08–12 UI connections: products, parties, invoices, purchases and payments use API state with paginated lookups, records, loading/error/empty/success states and responsive cards/tables; live shell verification passed.
- Stage 13 authentication: Spring Security session/CSRF boundary and live login/logout verification passed.
- Stage 14 testing: isolated PostgreSQL Maven run passed all 13 tests.
- Stage 15/16 Docker and Compose handoff: both images built, all services started, migrations applied and persistence survived a database/backend restart.
- Static audit: endpoint paths use the shared API helper, all current handwritten source files are represented here, and generated `node_modules`, `dist`, `.npm-cache` and `target` folders are absent.
- Frontend mock removal: mock records and the unused placeholder page were removed; all reachable navigation screens now use API state or explicit loading/error states.
- Lookup pagination: invoice and purchase forms now request ten lookup records at a time and expose page controls instead of silently fetching only the first 100 records.
- Invoice list pagination: the repository/service/controller accept query and payment-status filters, and the frontend requests one server page at a time.
- Payment history pagination: the frontend requests ten payment records per page and exposes history navigation.
- Payment invoice lookup: the payment form now requests unpaid invoices independently in pages of ten, so direct navigation is not limited to the invoice list's current page.
- Purchase payment flow: purchase status filtering, purchase-row payment actions and invoice/purchase selection in the payment screen now cover both supported payment parents; the integration source also checks that parent balances stay separate.
- Responsive records: invoice, purchase, product, customer, supplier and payment history tables are desktop-only while compact record cards are used on smaller screens.
