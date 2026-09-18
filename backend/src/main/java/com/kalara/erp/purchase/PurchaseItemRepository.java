package com.kalara.erp.purchase;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseItemRepository extends JpaRepository<PurchaseItem, Long> {
    List<PurchaseItem> findByPurchaseIdOrderByIdAsc(Long purchaseId);

    void deleteByPurchaseId(Long purchaseId);
}
