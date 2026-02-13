-- When a category is deleted, set the category_id to NULL on associated transactions
-- instead of blocking the delete with a foreign key violation.
-- This ensures transactions are preserved but lose their category assignment.

ALTER TABLE transaction DROP CONSTRAINT IF EXISTS fk_transaction_category;

ALTER TABLE transaction ADD CONSTRAINT fk_transaction_category
    FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE SET NULL;
