package com.kalara.erp.customer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "customers")
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 254)
    private String email;

    @Column(length = 30)
    private String phone;

    protected Customer() {
    }

    public Customer(String name, String email, String phone) {
        update(name, email, phone);
    }

    public void update(String name, String email, String phone) {
        this.name = name.trim();
        this.email = optionalText(email);
        this.phone = optionalText(phone);
    }

    private String optionalText(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getPhone() { return phone; }
}
