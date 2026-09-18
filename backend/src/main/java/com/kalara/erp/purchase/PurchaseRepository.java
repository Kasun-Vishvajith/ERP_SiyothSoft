package com.kalara.erp.purchase;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

public interface PurchaseRepository extends JpaRepository<Purchase, Long> {
    @Query("""
            select p from Purchase p
            where :status = 'ALL'
               or (:status = 'PAID' and (select coalesce(sum(pay.amount), 0) from Payment pay where pay.purchaseId = p.id) = p.total)
               or (:status = 'UNPAID' and p.total > 0
                   and (select coalesce(sum(pay.amount), 0) from Payment pay where pay.purchaseId = p.id) = 0)
               or (:status = 'PARTIALLY_PAID' and (select coalesce(sum(pay.amount), 0) from Payment pay where pay.purchaseId = p.id) > 0
                   and (select coalesce(sum(pay.amount), 0) from Payment pay where pay.purchaseId = p.id) < p.total)
            """)
    Page<Purchase> search(@Param("status") String status, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Purchase p where p.id = :id")
    Optional<Purchase> findForUpdate(@Param("id") Long id);
}
