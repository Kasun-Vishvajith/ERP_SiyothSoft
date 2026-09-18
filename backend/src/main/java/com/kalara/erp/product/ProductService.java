package com.kalara.erp.product;

import com.kalara.erp.common.PageResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ProductService {
    private final ProductRepository repository;

    public ProductService(ProductRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> list(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Page must be non-negative; size must be 1 to 100");
        }

        // Sorting by the unique ID makes page boundaries stable between requests.
        var pageRequest = PageRequest.of(page, size, Sort.by("id").descending());
        return PageResponse.from(repository.findAll(pageRequest).map(ProductResponse::from));
    }

    @Transactional(readOnly = true)
    public ProductResponse get(Long id) {
        return ProductResponse.from(require(id));
    }

    public ProductResponse create(ProductRequest request) {
        return ProductResponse.from(repository.save(new Product(request.name(), request.price())));
    }

    public ProductResponse update(Long id, ProductRequest request) {
        Product product = require(id);
        product.update(request.name(), request.price());
        // The managed entity is flushed when this transaction commits.
        return ProductResponse.from(product);
    }

    public void delete(Long id) {
        repository.delete(require(id));
        // Flush now so a foreign-key conflict becomes the current API error.
        repository.flush();
    }

    private Product require(Long id) {
        return repository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }
}
