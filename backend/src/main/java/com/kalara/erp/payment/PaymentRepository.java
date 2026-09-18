package com.kalara.erp.payment;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByRequestId(UUID requestId);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.invoiceId = :id")
    BigDecimal totalForInvoice(@Param("id") Long id);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.purchaseId = :id")
    BigDecimal totalForPurchase(@Param("id") Long id);

    Page<Payment> findAllByInvoiceId(Long invoiceId, Pageable pageable);

    Page<Payment> findAllByPurchaseId(Long purchaseId, Pageable pageable);
}
