package com.kalara.erp.payment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "payments")
public class Payment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", nullable = false, unique = true)
    private UUID requestId;

    @Column(name = "invoice_id")
    private Long invoiceId;

    @Column(name = "purchase_id")
    private Long purchaseId;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentMethod method;

    @Column(name = "paid_on", nullable = false)
    private LocalDate paidOn;

    @Column(length = 200)
    private String reference;

    protected Payment() {
    }

    public Payment(UUID requestId, Long invoiceId, Long purchaseId, BigDecimal amount,
                   PaymentMethod method, LocalDate paidOn, String reference) {
        this.requestId = requestId;
        this.invoiceId = invoiceId;
        this.purchaseId = purchaseId;
        this.amount = amount;
        this.method = method;
        this.paidOn = paidOn;
        this.reference = reference == null || reference.isBlank() ? null : reference.trim();
    }

    public Long getId() { return id; }
    public UUID getRequestId() { return requestId; }
    public Long getInvoiceId() { return invoiceId; }
    public Long getPurchaseId() { return purchaseId; }
    public BigDecimal getAmount() { return amount; }
    public PaymentMethod getMethod() { return method; }
    public LocalDate getPaidOn() { return paidOn; }
    public String getReference() { return reference; }
}
