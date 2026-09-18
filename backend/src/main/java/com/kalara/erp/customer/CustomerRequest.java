package com.kalara.erp.customer;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CustomerRequest(
        @NotBlank @Size(max = 120) String name,
        @Email @Size(max = 254) String email,
        @Size(max = 30) String phone) {
}
