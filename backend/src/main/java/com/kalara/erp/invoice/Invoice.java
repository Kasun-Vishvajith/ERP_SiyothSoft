package com.kalara.erp.invoice;

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

@Entity
@Table(name = "sales_invoices")
public class Invoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String number;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "customer_name", nullable = false, length = 120)
    private String customerName;

    @Column(length = 1000)
    private String notes;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal total;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_status", nullable = false, length = 20)
    private InvoiceDocumentStatus documentStatus;

    protected Invoice() {
    }

    public Invoice(String number, LocalDate date, Long customerId, String customerName, String notes, BigDecimal total) {
        this.number = number;
        update(date, customerId, customerName, notes, total);
        this.documentStatus = InvoiceDocumentStatus.ISSUED;
    }

    public void update(LocalDate date, Long customerId, String customerName, String notes, BigDecimal total) {
        this.date = date;
        this.customerId = customerId;
        this.customerName = customerName;
        this.notes = notes == null || notes.isBlank() ? null : notes.trim();
        this.total = total;
    }

    public Long getId() { return id; }
    public String getNumber() { return number; }
    public LocalDate getDate() { return date; }
    public Long getCustomerId() { return customerId; }
    public String getCustomerName() { return customerName; }
    public String getNotes() { return notes; }
    public BigDecimal getTotal() { return total; }
    public InvoiceDocumentStatus getDocumentStatus() { return documentStatus; }
    public void setDocumentStatus(InvoiceDocumentStatus documentStatus) { this.documentStatus = documentStatus; }
}
