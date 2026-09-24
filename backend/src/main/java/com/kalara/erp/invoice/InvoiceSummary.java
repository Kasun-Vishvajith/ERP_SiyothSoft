package com.kalara.erp.invoice;

import com.kalara.erp.common.Money;
import java.math.BigDecimal;
import java.time.LocalDate;

public record InvoiceSummary(
        Long id,
        String number,
        LocalDate date,
        Long customerId,
        String customerName,
        String total,
        String amountPaid,
        String balance,
        String paymentStatus,
        String documentStatus) {

    public static InvoiceSummary from(Invoice invoice, BigDecimal amountPaid) {
        BigDecimal paid = Money.checked(amountPaid == null ? BigDecimal.ZERO : amountPaid);
        BigDecimal balance = Money.checked(invoice.getTotal().subtract(paid));
        return new InvoiceSummary(
                invoice.getId(), invoice.getNumber(), invoice.getDate(), invoice.getCustomerId(),
                invoice.getCustomerName(), Money.text(invoice.getTotal()), Money.text(paid),
                Money.text(balance), status(paid, balance), invoice.getDocumentStatus().name());
    }

    private static String status(BigDecimal paid, BigDecimal balance) {
        if (balance.signum() == 0) return "PAID";
        return paid.signum() == 0 ? "UNPAID" : "PARTIALLY_PAID";
    }
}
