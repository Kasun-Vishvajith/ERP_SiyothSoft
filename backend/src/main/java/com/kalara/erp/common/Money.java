package com.kalara.erp.common;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Centralizes exact money calculations so controllers never become the source
 * of financial rules.
 */
public final class Money {
    private static final BigDecimal MAX = new BigDecimal("999999999999.99");

    private Money() {
    }

    public static BigDecimal lineTotal(BigDecimal price, int quantity) {
        if (price == null || price.signum() < 0 || quantity < 1 || quantity > 10000) {
            throw new IllegalArgumentException("Invalid price or quantity");
        }
        return checked(price.multiply(BigDecimal.valueOf(quantity)));
    }

    public static BigDecimal checked(BigDecimal amount) {
        if (amount == null) {
            throw new IllegalArgumentException("Amount is required");
        }
        BigDecimal scaled = amount.setScale(2, RoundingMode.UNNECESSARY);
        if (scaled.signum() < 0 || scaled.compareTo(MAX) > 0) {
            throw new IllegalArgumentException("Amount exceeds supported range");
        }
        return scaled;
    }

    public static String text(BigDecimal amount) {
        return checked(amount).toPlainString();
    }
}
