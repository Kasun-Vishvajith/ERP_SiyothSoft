package com.kalara.erp.flow;

import com.jayway.jsonpath.JsonPath;
import com.kalara.erp.customer.Customer;
import com.kalara.erp.customer.CustomerRepository;
import com.kalara.erp.invoice.Invoice;
import com.kalara.erp.invoice.InvoiceItem;
import com.kalara.erp.invoice.InvoiceItemRepository;
import com.kalara.erp.invoice.InvoiceRepository;
import com.kalara.erp.payment.PaymentRepository;
import com.kalara.erp.product.Product;
import com.kalara.erp.product.ProductRepository;
import com.kalara.erp.purchase.Purchase;
import com.kalara.erp.purchase.PurchaseItem;
import com.kalara.erp.purchase.PurchaseItemRepository;
import com.kalara.erp.purchase.PurchaseRepository;
import com.kalara.erp.supplier.Supplier;
import com.kalara.erp.supplier.SupplierRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "integration-user")
class BusinessFlowIntegrationTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private InvoiceItemRepository invoiceItemRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PurchaseRepository purchaseRepository;

    @Autowired
    private PurchaseItemRepository purchaseItemRepository;

    @Autowired
    private SupplierRepository supplierRepository;

    private Product product;
    private Customer customer;
    private Supplier supplier;

    @BeforeEach
    void cleanAndSeed() {
        paymentRepository.deleteAllInBatch();
        invoiceItemRepository.deleteAllInBatch();
        purchaseItemRepository.deleteAllInBatch();
        invoiceRepository.deleteAllInBatch();
        purchaseRepository.deleteAllInBatch();
        customerRepository.deleteAllInBatch();
        supplierRepository.deleteAllInBatch();
        productRepository.deleteAllInBatch();

        product = productRepository.saveAndFlush(new Product("Notebook", new BigDecimal("250.00"), 10));
        customer = customerRepository.saveAndFlush(new Customer("Acme Retail", null, "0771234567"));
        supplier = supplierRepository.saveAndFlush(new Supplier("Acme Wholesale", null, "0777654321"));
    }

    @Test
    @WithMockUser(username = "integration-user")
    void invoiceCalculatesTotalAndKeepsProductSnapshot() throws Exception {
        String body = """
                {"customerId":%d,"date":"2026-09-18","notes":"Practice sale","items":[
                  {"productId":%d,"quantity":2}
                ]}
                """.formatted(customer.getId(), product.getId());

        String response = mockMvc.perform(post("/api/invoices")
                        .with(csrf())
                        .with(user("integration-user"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.total", is("500.00")))
                .andExpect(jsonPath("$.items[0].unitPrice", is("250.00")))
                .andReturn().getResponse().getContentAsString();

        org.junit.jupiter.api.Assertions.assertEquals(8,
                productRepository.findById(product.getId()).orElseThrow().getStockCount());

        Number invoiceId = JsonPath.read(response, "$.id");
        product.update("Notebook", new BigDecimal("300.00"));
        productRepository.saveAndFlush(product);

        mockMvc.perform(get("/api/invoices/{id}", invoiceId.longValue())
                        .with(user("integration-user")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total", is("500.00")))
                .andExpect(jsonPath("$.items[0].unitPrice", is("250.00")));
    }

    @Test
    @WithMockUser(username = "integration-user")
    void unknownProductDoesNotCreateInvoice() throws Exception {
        long before = invoiceRepository.count();
        String body = "{" +
                "\"customerId\":" + customer.getId() + "," +
                "\"date\":\"2026-09-18\"," +
                "\"items\":[{\"productId\":999999,\"quantity\":1}]}";

        mockMvc.perform(post("/api/invoices")
                        .with(csrf())
                        .with(user("integration-user"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound());

        org.junit.jupiter.api.Assertions.assertEquals(before, invoiceRepository.count());
    }

    @Test
    @WithMockUser(username = "integration-user")
    void paymentRetryIsIdempotentAndOverpaymentIsRejected() throws Exception {
        Invoice invoice = invoiceRepository.saveAndFlush(new Invoice(
                "INV-INTEGRATION-001", LocalDate.of(2026, 9, 18), customer.getId(),
                customer.getName(), null, new BigDecimal("650.00")));
        invoiceItemRepository.saveAndFlush(new InvoiceItem(
                invoice.getId(), product.getId(), product.getName(), 2,
                new BigDecimal("250.00"), new BigDecimal("500.00")));

        UUID requestId = UUID.randomUUID();
        String payment = """
                {"requestId":"%s","invoiceId":%d,"purchaseId":null,"amount":"200.00",
                 "method":"BANK_TRANSFER","paidOn":"2026-09-18","reference":"ACME-001"}
                """.formatted(requestId, invoice.getId());

        String first = mockMvc.perform(post("/api/payments")
                        .with(csrf())
                        .with(user("integration-user"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payment))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Number paymentId = JsonPath.read(first, "$.id");

        mockMvc.perform(post("/api/payments")
                        .with(csrf())
                        .with(user("integration-user"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payment))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(paymentId.intValue())));

        String overpayment = payment.replace(requestId.toString(), UUID.randomUUID().toString())
                .replace("200.00", "500.00");
        mockMvc.perform(post("/api/payments")
                        .with(csrf())
                        .with(user("integration-user"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(overpayment))
                .andExpect(status().isConflict());

        String finalPayment = payment.replace(requestId.toString(), UUID.randomUUID().toString())
                .replace("200.00", "450.00");
        mockMvc.perform(post("/api/payments")
                        .with(csrf())
                        .with(user("integration-user"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(finalPayment))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/invoices/{id}", invoice.getId())
                        .with(user("integration-user")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amountPaid", is("650.00")))
                .andExpect(jsonPath("$.balance", is("0.00")))
                .andExpect(jsonPath("$.paymentStatus", is("PAID")));

        org.junit.jupiter.api.Assertions.assertEquals(2, paymentRepository.count());
    }

    @Test
    @WithMockUser(username = "integration-user")
    void simultaneousPaymentsAreSerializedByInvoiceLock() throws Exception {
        Invoice invoice = invoiceRepository.saveAndFlush(new Invoice(
                "INV-INTEGRATION-CONCURRENT", LocalDate.of(2026, 9, 18), customer.getId(),
                customer.getName(), null, new BigDecimal("650.00")));
        invoiceItemRepository.saveAndFlush(new InvoiceItem(
                invoice.getId(), product.getId(), product.getName(), 2,
                new BigDecimal("250.00"), new BigDecimal("500.00")));

        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<Integer> first = submitPayment(executor, start, invoice.getId(), UUID.randomUUID());
            Future<Integer> second = submitPayment(executor, start, invoice.getId(), UUID.randomUUID());
            start.countDown();

            int firstStatus = first.get(10, TimeUnit.SECONDS);
            int secondStatus = second.get(10, TimeUnit.SECONDS);
            org.junit.jupiter.api.Assertions.assertTrue(
                    (firstStatus == 201 && secondStatus == 409)
                            || (firstStatus == 409 && secondStatus == 201),
                    "Expected one created payment and one overpayment conflict");
            org.junit.jupiter.api.Assertions.assertEquals(1, paymentRepository.count());
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    @WithMockUser(username = "integration-user")
    void purchasePaymentChangesPurchaseBalanceOnly() throws Exception {
        Invoice invoice = invoiceRepository.saveAndFlush(new Invoice(
                "INV-INTEGRATION-SCOPE", LocalDate.of(2026, 9, 18), customer.getId(),
                customer.getName(), null, new BigDecimal("250.00")));
        Purchase purchase = purchaseRepository.saveAndFlush(new Purchase(
                "PUR-INTEGRATION-SCOPE", LocalDate.of(2026, 9, 18), supplier.getId(),
                supplier.getName(), null, new BigDecimal("720.00")));
        purchaseItemRepository.saveAndFlush(new PurchaseItem(
                purchase.getId(), product.getId(), product.getName(), 4,
                new BigDecimal("180.00"), new BigDecimal("720.00")));

        String payment = """
                {"requestId":"%s","invoiceId":null,"purchaseId":%d,"amount":"720.00",
                 "method":"BANK_TRANSFER","paidOn":"2026-09-18","reference":"WHOLESALE-001"}
                """.formatted(UUID.randomUUID(), purchase.getId());

        mockMvc.perform(post("/api/payments")
                        .with(csrf())
                        .with(user("integration-user"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payment))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/purchases/{id}", purchase.getId())
                        .with(user("integration-user")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amountPaid", is("720.00")))
                .andExpect(jsonPath("$.balance", is("0.00")))
                .andExpect(jsonPath("$.paymentStatus", is("PAID")));
        mockMvc.perform(get("/api/invoices/{id}", invoice.getId())
                        .with(user("integration-user")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amountPaid", is("0.00")))
                .andExpect(jsonPath("$.paymentStatus", is("UNPAID")));
    }

    @Test
    @WithMockUser(username = "integration-user")
    void referencedCustomerCannotBeDeleted() throws Exception {
        Invoice invoice = invoiceRepository.saveAndFlush(new Invoice(
                "INV-INTEGRATION-002", LocalDate.of(2026, 9, 18), customer.getId(),
                customer.getName(), null, new BigDecimal("250.00")));
        invoiceItemRepository.saveAndFlush(new InvoiceItem(
                invoice.getId(), product.getId(), product.getName(), 1,
                new BigDecimal("250.00"), new BigDecimal("250.00")));

        mockMvc.perform(delete("/api/customers/{id}", customer.getId())
                        .with(csrf())
                        .with(user("integration-user")))
                .andExpect(status().isConflict());
    }

    private Future<Integer> submitPayment(ExecutorService executor, CountDownLatch start,
                                           Long invoiceId, UUID requestId) {
        return executor.submit(() -> {
            start.await();
            return mockMvc.perform(post("/api/payments")
                            .with(csrf())
                            .with(user("integration-user"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"requestId":"%s","invoiceId":%d,"purchaseId":null,
                                     "amount":"400.00","method":"CASH","paidOn":"2026-09-18"}
                                    """.formatted(requestId, invoiceId)))
                    .andReturn().getResponse().getStatus();
        });
    }
}
