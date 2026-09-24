ALTER TABLE sales_invoices
    ADD COLUMN document_status varchar(20) NOT NULL DEFAULT 'ISSUED';

ALTER TABLE sales_invoices
    ADD CONSTRAINT ck_sales_invoice_document_status
    CHECK (document_status IN ('DRAFT', 'ISSUED', 'CANCELLED'));
