package com.kalara.erp.purchase;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record PurchaseRequest(
        @NotNull @Positive Long supplierId,
        @NotNull LocalDate date,
        @Size(max = 1000) String notes,
        @NotEmpty @Size(max = 100) List<@NotNull @Valid Line> items) {

    public record Line(
            @NotNull @Positive Long productId,
            @NotNull @Min(1) @Max(10000) Integer quantity,
            @NotNull @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal unitPrice) {
    }
}
