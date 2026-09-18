package com.kalara.erp.customer;

import com.kalara.erp.common.PageResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class CustomerService {
    private final CustomerRepository repository;

    public CustomerService(CustomerRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public PageResponse<CustomerResponse> list(int page, int size) {
        validatePage(page, size);
        var request = PageRequest.of(page, size, Sort.by("id").descending());
        return PageResponse.from(repository.findAll(request).map(CustomerResponse::from));
    }

    @Transactional(readOnly = true)
    public CustomerResponse get(Long id) {
        return CustomerResponse.from(require(id));
    }

    public CustomerResponse create(CustomerRequest request) {
        return CustomerResponse.from(repository.save(new Customer(request.name(), request.email(), request.phone())));
    }

    public CustomerResponse update(Long id, CustomerRequest request) {
        Customer customer = require(id);
        customer.update(request.name(), request.email(), request.phone());
        return CustomerResponse.from(customer);
    }

    public void delete(Long id) {
        repository.delete(require(id));
        repository.flush();
    }

    private Customer require(Long id) {
        return repository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
    }

    private void validatePage(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Page must be non-negative; size must be 1 to 100");
        }
    }
}
