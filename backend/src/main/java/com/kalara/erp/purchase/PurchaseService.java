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
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
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
        Map<Long, Product> products = lockProducts(request.items().stream().map(PurchaseRequest.Line::productId).toList());
        Calculation calculation = calculateLines(request.items(), products);
        applyStockDelta(Map.of(), quantitiesByProduct(calculation.lines()), products);
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
        List<PurchaseItem> previousItems = itemRepository.findByPurchaseIdOrderByIdAsc(id);
        TreeSet<Long> productIds = new TreeSet<>(request.items().stream().map(PurchaseRequest.Line::productId).toList());
        productIds.addAll(previousItems.stream().map(PurchaseItem::getProductId).toList());
        Map<Long, Product> products = lockProducts(productIds);
        Calculation calculation = calculateLines(request.items(), products);
        applyStockDelta(quantitiesByItems(previousItems), quantitiesByProduct(calculation.lines()), products);
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
        List<PurchaseItem> previousItems = itemRepository.findByPurchaseIdOrderByIdAsc(id);
        Map<Long, Product> products = lockProducts(previousItems.stream().map(PurchaseItem::getProductId).toList());
        applyStockDelta(quantitiesByItems(previousItems), Map.of(), products);
        purchaseRepository.delete(purchase);
        purchaseRepository.flush();
    }

    private Calculation calculateLines(List<PurchaseRequest.Line> requestedLines, Map<Long, Product> products) {
        List<LineValue> lines = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO.setScale(2);
        for (PurchaseRequest.Line line : requestedLines) {
            Product product = products.get(line.productId());
            if (product == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found");
            BigDecimal lineTotal = Money.lineTotal(line.unitPrice(), line.quantity());
            total = Money.checked(total.add(lineTotal));
            lines.add(new LineValue(product, line.quantity(), line.unitPrice(), lineTotal));
        }
        return new Calculation(total, lines);
    }

    private Map<Long, Product> lockProducts(Collection<Long> ids) {
        Map<Long, Product> products = new HashMap<>();
        for (Long id : new TreeSet<>(ids)) {
            Product product = productRepository.findForUpdate(id).orElseThrow(() ->
                    new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
            products.put(id, product);
        }
        return products;
    }

    private Map<Long, Integer> quantitiesByProduct(List<LineValue> lines) {
        Map<Long, Integer> quantities = new HashMap<>();
        for (LineValue line : lines) quantities.merge(line.product().getId(), line.quantity(), Integer::sum);
        return quantities;
    }

    private Map<Long, Integer> quantitiesByItems(List<PurchaseItem> items) {
        Map<Long, Integer> quantities = new HashMap<>();
        for (PurchaseItem item : items) quantities.merge(item.getProductId(), item.getQuantity(), Integer::sum);
        return quantities;
    }

    private void applyStockDelta(Map<Long, Integer> previous, Map<Long, Integer> next, Map<Long, Product> products) {
        TreeSet<Long> ids = new TreeSet<>(previous.keySet());
        ids.addAll(next.keySet());
        for (Long id : ids) {
            Product product = products.get(id);
            int delta = next.getOrDefault(id, 0) - previous.getOrDefault(id, 0);
            if (delta > 0) {
                product.increaseStock(delta);
            } else if (delta < 0) {
                int requested = -delta;
                if (requested > product.getStockCount()) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Cannot remove " + requested + " units of " + product.getName()
                                    + "; only " + product.getStockCount() + " remain");
                }
                product.decreaseStock(requested);
            }
        }
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
