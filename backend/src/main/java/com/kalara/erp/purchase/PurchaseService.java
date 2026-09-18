package com.kalara.erp.purchase;

import com.kalara.erp.common.Money;
import com.kalara.erp.common.PageResponse;
import com.kalara.erp.product.Product;
import com.kalara.erp.product.ProductRepository;
import com.kalara.erp.payment.PaymentRepository;
import com.kalara.erp.supplier.Supplier;
import com.kalara.erp.supplier.SupplierRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class PurchaseService {
    private final PurchaseRepository purchaseRepository;
    private final PurchaseItemRepository itemRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final PaymentRepository paymentRepository;

    public PurchaseService(PurchaseRepository purchaseRepository, PurchaseItemRepository itemRepository,
                           SupplierRepository supplierRepository, ProductRepository productRepository,
                           PaymentRepository paymentRepository) {
        this.purchaseRepository = purchaseRepository;
        this.itemRepository = itemRepository;
        this.supplierRepository = supplierRepository;
        this.productRepository = productRepository;
        this.paymentRepository = paymentRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<PurchaseSummary> list(int page, int size) {
        return list(page, size, "ALL");
    }

    @Transactional(readOnly = true)
    public PageResponse<PurchaseSummary> list(int page, int size, String status) {
        validatePage(page, size);
        if (!List.of("ALL", "PAID", "UNPAID", "PARTIALLY_PAID").contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown purchase payment status");
        }
        var request = PageRequest.of(page, size, Sort.by("id").descending());
        return PageResponse.from(purchaseRepository.search(status, request)
                .map(purchase -> PurchaseSummary.from(purchase, paymentRepository.totalForPurchase(purchase.getId()))));
    }

    @Transactional(readOnly = true)
    public PurchaseResponse get(Long id) {
        Purchase purchase = require(id);
        return PurchaseResponse.from(purchase, itemRepository.findByPurchaseIdOrderByIdAsc(id),
                paymentRepository.totalForPurchase(id));
    }

    public PurchaseResponse create(PurchaseRequest request) {
        Supplier supplier = supplierRepository.findById(request.supplierId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found"));
        Calculation calculation = calculateLines(request.items());
        Purchase purchase = purchaseRepository.save(new Purchase(
                "PUR-" + UUID.randomUUID(), request.date(), supplier.getId(), supplier.getName(),
                request.notes(), calculation.total()));
        saveItems(purchase.getId(), calculation.lines());
        return PurchaseResponse.from(purchase, itemRepository.findByPurchaseIdOrderByIdAsc(purchase.getId()),
                paymentRepository.totalForPurchase(purchase.getId()));
    }

    public PurchaseResponse update(Long id, PurchaseRequest request) {
        Purchase purchase = requireForUpdate(id);
        rejectPaid(purchase);
        Supplier supplier = supplierRepository.findById(request.supplierId()).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found"));
        Calculation calculation = calculateLines(request.items());
        purchase.update(request.date(), supplier.getId(), supplier.getName(), request.notes(), calculation.total());
        itemRepository.deleteByPurchaseId(id);
        itemRepository.flush();
        saveItems(id, calculation.lines());
        return PurchaseResponse.from(purchase, itemRepository.findByPurchaseIdOrderByIdAsc(id),
                paymentRepository.totalForPurchase(id));
    }

    public void delete(Long id) {
        Purchase purchase = requireForUpdate(id);
        rejectPaid(purchase);
        purchaseRepository.delete(purchase);
        purchaseRepository.flush();
    }

    private Calculation calculateLines(List<PurchaseRequest.Line> requestedLines) {
        List<LineValue> lines = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO.setScale(2);
        for (PurchaseRequest.Line line : requestedLines) {
            Product product = productRepository.findById(line.productId()).orElseThrow(() ->
                    new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
            BigDecimal lineTotal = Money.lineTotal(line.unitPrice(), line.quantity());
            total = Money.checked(total.add(lineTotal));
            lines.add(new LineValue(product, line.quantity(), line.unitPrice(), lineTotal));
        }
        return new Calculation(total, lines);
    }

    private void saveItems(Long purchaseId, List<LineValue> lines) {
        itemRepository.saveAll(lines.stream().map(line -> new PurchaseItem(
                purchaseId, line.product().getId(), line.product().getName(), line.quantity(),
                line.unitPrice(), line.lineTotal())).toList());
    }

    private Purchase require(Long id) {
        return purchaseRepository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase not found"));
    }

    private Purchase requireForUpdate(Long id) {
        return purchaseRepository.findForUpdate(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Purchase not found"));
    }

    private void rejectPaid(Purchase purchase) {
        if (paymentRepository.totalForPurchase(purchase.getId()).signum() > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Paid or partially paid purchases cannot be edited or deleted");
        }
    }

    private void validatePage(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Page must be non-negative; size must be 1 to 100");
        }
    }

    private record Calculation(BigDecimal total, List<LineValue> lines) { }
    private record LineValue(Product product, int quantity, BigDecimal unitPrice, BigDecimal lineTotal) { }
}
