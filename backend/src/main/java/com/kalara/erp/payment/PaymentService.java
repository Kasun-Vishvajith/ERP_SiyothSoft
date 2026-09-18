package com.kalara.erp.payment;

import com.kalara.erp.common.Money;
import com.kalara.erp.common.PageResponse;
import com.kalara.erp.invoice.Invoice;
import com.kalara.erp.invoice.InvoiceRepository;
import com.kalara.erp.purchase.Purchase;
import com.kalara.erp.purchase.PurchaseRepository;
import java.math.BigDecimal;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final PurchaseRepository purchaseRepository;

    public PaymentService(PaymentRepository paymentRepository, InvoiceRepository invoiceRepository,
                          PurchaseRepository purchaseRepository) {
        this.paymentRepository = paymentRepository;
        this.invoiceRepository = invoiceRepository;
        this.purchaseRepository = purchaseRepository;
    }

    public PaymentCreateResult create(PaymentRequest request) {
        boolean hasInvoice = request.invoiceId() != null;
        boolean hasPurchase = request.purchaseId() != null;
        if (hasInvoice == hasPurchase) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Choose exactly one invoice or purchase");
        }

        if (hasInvoice) {
            Invoice invoice = invoiceRepository.findForUpdate(request.invoiceId()).orElseThrow(() ->
                    new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));
            Payment existing = paymentRepository.findByRequestId(request.requestId()).orElse(null);
            if (existing != null) return existingResult(existing, request);
            return createForInvoice(invoice, request);
        }

        Purchase purchase = purchaseRepository.findForUpdate(request.purchaseId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase not found"));
        Payment existing = paymentRepository.findByRequestId(request.requestId()).orElse(null);
        if (existing != null) return existingResult(existing, request);
        return createForPurchase(purchase, request);
    }

    @Transactional(readOnly = true)
    public PageResponse<PaymentResponse> list(int page, int size, Long invoiceId, Long purchaseId) {
        if (invoiceId != null && purchaseId != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Filter by invoice or purchase, not both");
        }
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Page must be non-negative; size must be 1 to 100");
        }
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        Page<Payment> payments = invoiceId != null
                ? paymentRepository.findAllByInvoiceId(invoiceId, pageable)
                : purchaseId != null
                ? paymentRepository.findAllByPurchaseId(purchaseId, pageable)
                : paymentRepository.findAll(pageable);
        return PageResponse.from(payments.map(PaymentResponse::from));
    }

    private PaymentCreateResult createForInvoice(Invoice invoice, PaymentRequest request) {
        BigDecimal paid = paymentRepository.totalForInvoice(invoice.getId());
        ensureWithinBalance(request.amount(), invoice.getTotal(), paid);
        Payment payment = paymentRepository.save(new Payment(
                request.requestId(), invoice.getId(), null, request.amount(), request.method(),
                request.paidOn(), request.reference()));
        return new PaymentCreateResult(PaymentResponse.from(payment), true);
    }

    private PaymentCreateResult createForPurchase(Purchase purchase, PaymentRequest request) {
        BigDecimal paid = paymentRepository.totalForPurchase(purchase.getId());
        ensureWithinBalance(request.amount(), purchase.getTotal(), paid);
        Payment payment = paymentRepository.save(new Payment(
                request.requestId(), null, purchase.getId(), request.amount(), request.method(),
                request.paidOn(), request.reference()));
        return new PaymentCreateResult(PaymentResponse.from(payment), true);
    }

    private void ensureWithinBalance(BigDecimal amount, BigDecimal total, BigDecimal paid) {
        BigDecimal balance = Money.checked(total.subtract(paid));
        if (amount.compareTo(balance) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Payment exceeds the outstanding balance");
        }
    }

    private PaymentCreateResult existingResult(Payment existing, PaymentRequest request) {
        boolean same = Objects.equals(existing.getInvoiceId(), request.invoiceId())
                && Objects.equals(existing.getPurchaseId(), request.purchaseId())
                && existing.getAmount().compareTo(request.amount()) == 0
                && existing.getMethod() == request.method()
                && Objects.equals(existing.getPaidOn(), request.paidOn())
                && Objects.equals(normalize(existing.getReference()), normalize(request.reference()));
        if (!same) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Request ID was already used for different payment details");
        }
        return new PaymentCreateResult(PaymentResponse.from(existing), false);
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public record PaymentCreateResult(PaymentResponse payment, boolean created) {
    }
}
