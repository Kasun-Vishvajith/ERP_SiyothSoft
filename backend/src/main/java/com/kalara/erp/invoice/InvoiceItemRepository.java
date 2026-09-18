package com.kalara.erp.invoice;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, Long> {
    List<InvoiceItem> findByInvoiceIdOrderByIdAsc(Long invoiceId);

    void deleteByInvoiceId(Long invoiceId);
}
