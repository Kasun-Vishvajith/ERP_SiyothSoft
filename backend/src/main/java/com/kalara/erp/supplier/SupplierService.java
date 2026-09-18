package com.kalara.erp.supplier;

import com.kalara.erp.common.PageResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class SupplierService {
    private final SupplierRepository repository;

    public SupplierService(SupplierRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public PageResponse<SupplierResponse> list(int page, int size) {
        validatePage(page, size);
        var request = PageRequest.of(page, size, Sort.by("id").descending());
        return PageResponse.from(repository.findAll(request).map(SupplierResponse::from));
    }

    @Transactional(readOnly = true)
    public SupplierResponse get(Long id) {
        return SupplierResponse.from(require(id));
    }

    public SupplierResponse create(SupplierRequest request) {
        return SupplierResponse.from(repository.save(new Supplier(request.name(), request.email(), request.phone())));
    }

    public SupplierResponse update(Long id, SupplierRequest request) {
        Supplier supplier = require(id);
        supplier.update(request.name(), request.email(), request.phone());
        return SupplierResponse.from(supplier);
    }

    public void delete(Long id) {
        repository.delete(require(id));
        repository.flush();
    }

    private Supplier require(Long id) {
        return repository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found"));
    }

    private void validatePage(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Page must be non-negative; size must be 1 to 100");
        }
    }
}
