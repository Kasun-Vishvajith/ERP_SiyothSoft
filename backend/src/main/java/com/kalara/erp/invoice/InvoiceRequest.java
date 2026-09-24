package com.kalara.erp.invoice;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public record InvoiceRequest(
        @NotNull @Positive Long customerId,
        @NotNull LocalDate date,
        @Size(max = 1000) String notes,
        @NotEmpty @Size(max = 100) List<@NotNull @Valid Line> items,
        InvoiceDocumentStatus documentStatus) {

    public record Line(
            @NotNull @Positive Long productId,
            @NotNull @Min(1) @Max(10000) Integer quantity) {
    }
}
