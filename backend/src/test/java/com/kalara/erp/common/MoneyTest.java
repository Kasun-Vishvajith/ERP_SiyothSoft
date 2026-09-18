package com.kalara.erp.common;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MoneyTest {
    @Test
    void multipliesExactDecimals() {
        assertEquals(new BigDecimal("500.00"),
                Money.lineTotal(new BigDecimal("250.00"), 2));
    }

    @Test
    void rejectsZeroQuantity() {
        assertThrows(IllegalArgumentException.class,
                () -> Money.lineTotal(new BigDecimal("250.00"), 0));
    }

    @Test
    void rejectsUnsupportedPrecision() {
        assertThrows(ArithmeticException.class,
                () -> Money.lineTotal(new BigDecimal("1.001"), 1));
    }
}
