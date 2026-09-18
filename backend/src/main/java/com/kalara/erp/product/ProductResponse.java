package com.kalara.erp.product;

/**
 * Keeps money explicit as a two-decimal string at the JSON boundary.
 */
public record ProductResponse(Long id, String name, String price) {
    public static ProductResponse from(Product product) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getPrice().setScale(2).toPlainString());
    }
}
