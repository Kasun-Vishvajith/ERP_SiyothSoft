package com.kalara.erp.invoice;

import com.kalara.erp.common.Money;
import com.kalara.erp.common.PageResponse;
import com.kalara.erp.customer.Customer;
import com.kalara.erp.customer.CustomerRepository;
import com.kalara.erp.payment.PaymentRepository;
import com.kalara.erp.product.Product;
import com.kalara.erp.product.ProductRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class InvoiceService {
    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository itemRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final PaymentRepository paymentRepository;

    public InvoiceService(InvoiceRepository invoiceRepository, InvoiceItemRepository itemRepository,
                          CustomerRepository customerRepository, ProductRepository productRepository,
                          PaymentRepository paymentRepository) {
        this.invoiceRepository = invoiceRepository;
        this.itemRepository = itemRepository;
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
        this.paymentRepository = paymentRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<InvoiceSummary> list(int page, int size) {
        return list(page, size, "", "ALL");
    }

    @Transactional(readOnly = true)
    public PageResponse<InvoiceSummary> list(int page, int size, String query, String status) {
        validatePage(page, size);
        if (!List.of("ALL", "PAID", "UNPAID", "PARTIALLY_PAID").contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown invoice payment status");
        }
        var request = PageRequest.of(page, size, Sort.by("id").descending());
        String normalizedQuery = query == null ? "" : query.trim();
        return PageResponse.from(invoiceRepository.search(normalizedQuery, status, request)
                .map(invoice -> InvoiceSummary.from(invoice, paymentRepository.totalForInvoice(invoice.getId()))));
    }

    @Transactional(readOnly = true)
    public InvoiceResponse get(Long id) {
        Invoice invoice = require(id);
        return InvoiceResponse.from(invoice, itemRepository.findByInvoiceIdOrderByIdAsc(id),
                paymentRepository.totalForInvoice(id));
    }

    public InvoiceResponse create(InvoiceRequest request) {
        Customer customer = customerRepository.findById(request.customerId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        Calculation calculation = calculateLines(request.items());
        Invoice invoice = invoiceRepository.save(new Invoice(
                "INV-" + UUID.randomUUID(), request.date(), customer.getId(), customer.getName(),
                request.notes(), calculation.total()));
        saveItems(invoice.getId(), calculation.lines());
        return InvoiceResponse.from(invoice, itemRepository.findByInvoiceIdOrderByIdAsc(invoice.getId()),
                paymentRepository.totalForInvoice(invoice.getId()));
    }

    public InvoiceResponse update(Long id, InvoiceRequest request) {
        Invoice invoice = requireForUpdate(id);
        rejectPaid(invoice);
        Customer customer = customerRepository.findById(request.customerId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        Calculation calculation = calculateLines(request.items());
        invoice.update(request.date(), customer.getId(), customer.getName(), request.notes(), calculation.total());
        itemRepository.deleteByInvoiceId(id);
        itemRepository.flush();
        saveItems(id, calculation.lines());
        return InvoiceResponse.from(invoice, itemRepository.findByInvoiceIdOrderByIdAsc(id),
                paymentRepository.totalForInvoice(id));
    }

    public void delete(Long id) {
        Invoice invoice = requireForUpdate(id);
        rejectPaid(invoice);
        invoiceRepository.delete(invoice);
        invoiceRepository.flush();
    }

    private Calculation calculateLines(List<InvoiceRequest.Line> requestedLines) {
        List<LineValue> lines = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO.setScale(2);
        for (InvoiceRequest.Line line : requestedLines) {
            Product product = productRepository.findById(line.productId()).orElseThrow(() ->
                    new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
            BigDecimal lineTotal = Money.lineTotal(product.getPrice(), line.quantity());
            total = Money.checked(total.add(lineTotal));
            lines.add(new LineValue(product, line.quantity(), lineTotal));
        }
        return new Calculation(total, lines);
    }

    private void saveItems(Long invoiceId, List<LineValue> lines) {
        itemRepository.saveAll(lines.stream().map(line -> new InvoiceItem(
                invoiceId, line.product().getId(), line.product().getName(), line.quantity(),
                line.product().getPrice(), line.lineTotal())).toList());
    }

    private Invoice require(Long id) {
        return invoiceRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));
    }

    private Invoice requireForUpdate(Long id) {
        return invoiceRepository.findForUpdate(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));
    }

    private void rejectPaid(Invoice invoice) {
        if (paymentRepository.totalForInvoice(invoice.getId()).signum() > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Paid or partially paid invoices cannot be edited or deleted");
        }
    }

    private void validatePage(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Page must be non-negative; size must be 1 to 100");
        }
    }

    private record Calculation(BigDecimal total, List<LineValue> lines) { }
    private record LineValue(Product product, int quantity, BigDecimal lineTotal) { }
}
