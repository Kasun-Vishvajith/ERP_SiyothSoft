package com.kalara.erp.product;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal price;

    @Column(name = "stock_count", nullable = false)
    private Integer stockCount;

    protected Product() {
        // JPA creates entities through this constructor when reading a row.
    }

    public Product(String name, BigDecimal price) {
        this(name, price, 0);
    }

    public Product(String name, BigDecimal price, Integer stockCount) {
        update(name, price, stockCount);
    }

    public void update(String name, BigDecimal price) {
        update(name, price, this.stockCount == null ? 0 : this.stockCount);
    }

    public void update(String name, BigDecimal price, Integer stockCount) {
        this.name = name.trim();
        this.price = price;
        this.stockCount = stockCount == null ? 0 : stockCount;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public Integer getStockCount() {
        return stockCount;
    }

    public void increaseStock(int quantity) {
        if (quantity < 0) throw new IllegalArgumentException("Quantity must not be negative");
        stockCount = Math.addExact(stockCount, quantity);
    }

    public void decreaseStock(int quantity) {
        if (quantity < 0 || quantity > stockCount) {
            throw new IllegalArgumentException("Insufficient stock");
        }
        stockCount -= quantity;
    }
}
