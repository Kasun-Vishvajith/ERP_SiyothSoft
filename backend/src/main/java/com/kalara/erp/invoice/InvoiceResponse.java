package com.kalara.erp.invoice;

import com.kalara.erp.common.Money;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record InvoiceResponse(
        Long id,
        String number,
        LocalDate date,
        Long customerId,
        String customerName,
        String notes,
        List<Item> items,
        String total,
        String amountPaid,
        String balance,
        String paymentStatus,
        String documentStatus) {

    public static InvoiceResponse from(Invoice invoice, List<InvoiceItem> items, BigDecimal amountPaid) {
        BigDecimal paid = Money.checked(amountPaid == null ? BigDecimal.ZERO : amountPaid);
        BigDecimal balance = Money.checked(invoice.getTotal().subtract(paid));
        return new InvoiceResponse(
                invoice.getId(), invoice.getNumber(), invoice.getDate(), invoice.getCustomerId(),
                invoice.getCustomerName(), invoice.getNotes(), items.stream().map(Item::from).toList(),
                Money.text(invoice.getTotal()), Money.text(paid), Money.text(balance), status(paid, balance),
                invoice.getDocumentStatus().name());
    }

    private static String status(BigDecimal paid, BigDecimal balance) {
        if (balance.signum() == 0) return "PAID";
        return paid.signum() == 0 ? "UNPAID" : "PARTIALLY_PAID";
    }

    public record Item(Long id, Long productId, String productName, Integer quantity,
                       String unitPrice, String lineTotal) {
        public static Item from(InvoiceItem item) {
            return new Item(item.getId(), item.getProductId(), item.getProductName(), item.getQuantity(),
                    Money.text(item.getUnitPrice()), Money.text(item.getLineTotal()));
        }
    }
}
