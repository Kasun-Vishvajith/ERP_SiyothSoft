package com.kalara.erp.purchase;

import com.kalara.erp.common.Money;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record PurchaseResponse(
        Long id,
        String number,
        LocalDate date,
        Long supplierId,
        String supplierName,
        String notes,
        List<Item> items,
        String total,
        String amountPaid,
        String balance,
        String paymentStatus) {

    public static PurchaseResponse from(Purchase purchase, List<PurchaseItem> items, BigDecimal amountPaid) {
        BigDecimal paid = Money.checked(amountPaid == null ? BigDecimal.ZERO : amountPaid);
        BigDecimal balance = Money.checked(purchase.getTotal().subtract(paid));
        return new PurchaseResponse(
                purchase.getId(), purchase.getNumber(), purchase.getDate(), purchase.getSupplierId(),
                purchase.getSupplierName(), purchase.getNotes(), items.stream().map(Item::from).toList(),
                Money.text(purchase.getTotal()), Money.text(paid), Money.text(balance), status(paid, balance));
    }

    private static String status(BigDecimal paid, BigDecimal balance) {
        if (balance.signum() == 0) return "PAID";
        return paid.signum() == 0 ? "UNPAID" : "PARTIALLY_PAID";
    }

    public record Item(Long id, Long productId, String productName, Integer quantity,
                       String unitPrice, String lineTotal) {
        public static Item from(PurchaseItem item) {
            return new Item(item.getId(), item.getProductId(), item.getProductName(), item.getQuantity(),
                    Money.text(item.getUnitPrice()), Money.text(item.getLineTotal()));
        }
    }
}
