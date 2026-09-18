package com.kalara.erp.invoice;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    @Query("""
            select i from Invoice i
            where (:query = '' or lower(i.number) like lower(concat('%', :query, '%'))
                or lower(i.customerName) like lower(concat('%', :query, '%')))
              and (
                :status = 'ALL'
                or (:status = 'PAID' and (select coalesce(sum(p.amount), 0) from Payment p where p.invoiceId = i.id) = i.total)
                or (:status = 'UNPAID' and i.total > 0
                    and (select coalesce(sum(p.amount), 0) from Payment p where p.invoiceId = i.id) = 0)
                or (:status = 'PARTIALLY_PAID' and (select coalesce(sum(p.amount), 0) from Payment p where p.invoiceId = i.id) > 0
                    and (select coalesce(sum(p.amount), 0) from Payment p where p.invoiceId = i.id) < i.total)
              )
            """)
    Page<Invoice> search(@Param("query") String query, @Param("status") String status, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Invoice i where i.id = :id")
    Optional<Invoice> findForUpdate(@Param("id") Long id);
}
