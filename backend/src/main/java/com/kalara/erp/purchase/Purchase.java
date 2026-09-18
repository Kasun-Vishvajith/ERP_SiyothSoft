package com.kalara.erp.purchase;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "purchases")
public class Purchase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String number;

    @Column(name = "date", nullable = false)
    private LocalDate date;

    @Column(name = "supplier_id", nullable = false)
    private Long supplierId;

    @Column(name = "supplier_name", nullable = false, length = 120)
    private String supplierName;

    @Column(length = 1000)
    private String notes;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal total;

    protected Purchase() {
    }

    public Purchase(String number, LocalDate date, Long supplierId, String supplierName, String notes, BigDecimal total) {
        this.number = number;
        update(date, supplierId, supplierName, notes, total);
    }

    public void update(LocalDate date, Long supplierId, String supplierName, String notes, BigDecimal total) {
        this.date = date;
        this.supplierId = supplierId;
        this.supplierName = supplierName;
        this.notes = notes == null || notes.isBlank() ? null : notes.trim();
        this.total = total;
    }

    public Long getId() { return id; }
    public String getNumber() { return number; }
    public LocalDate getDate() { return date; }
    public Long getSupplierId() { return supplierId; }
    public String getSupplierName() { return supplierName; }
    public String getNotes() { return notes; }
    public BigDecimal getTotal() { return total; }
}
