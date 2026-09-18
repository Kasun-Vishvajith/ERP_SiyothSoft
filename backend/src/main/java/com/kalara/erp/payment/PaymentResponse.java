package com.kalara.erp.payment;

import com.kalara.erp.common.Money;
import java.util.UUID;

public record PaymentResponse(
        Long id,
        UUID requestId,
        Long invoiceId,
        Long purchaseId,
        String amount,
        PaymentMethod method,
        java.time.LocalDate paidOn,
        String reference) {

    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(payment.getId(), payment.getRequestId(), payment.getInvoiceId(),
                payment.getPurchaseId(), Money.text(payment.getAmount()), payment.getMethod(),
                payment.getPaidOn(), payment.getReference());
    }
}
