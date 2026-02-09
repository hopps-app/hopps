-- Fix Category_SEQ increment to match Hibernate's default allocationSize of 50
-- Without this, Hibernate validation fails with "inconsistent increment-size; found [1] but expecting [50]"

ALTER SEQUENCE IF EXISTS category_seq INCREMENT BY 50;
