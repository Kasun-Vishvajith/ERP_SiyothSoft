package com.kalara.erp.purchase;

import com.kalara.erp.common.Money;
import java.math.BigDecimal;
import java.time.LocalDate;

public record PurchaseSummary(
        Long id,
        String number,
        LocalDate date,
        Long supplierId,
        String supplierName,
        String total,
        String amountPaid,
        String balance,
        String paymentStatus) {

    public static PurchaseSummary from(Purchase purchase, BigDecimal amountPaid) {
        BigDecimal paid = Money.checked(amountPaid == null ? BigDecimal.ZERO : amountPaid);
        BigDecimal balance = Money.checked(purchase.getTotal().subtract(paid));
        return new PurchaseSummary(
                purchase.getId(), purchase.getNumber(), purchase.getDate(), purchase.getSupplierId(),
                purchase.getSupplierName(), Money.text(purchase.getTotal()), Money.text(paid),
                Money.text(balance), status(paid, balance));
    }

    private static String status(BigDecimal paid, BigDecimal balance) {
        if (balance.signum() == 0) return "PAID";
        return paid.signum() == 0 ? "UNPAID" : "PARTIALLY_PAID";
    }
}
