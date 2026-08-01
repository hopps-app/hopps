-- Uploaded organization logo (Vereinslogo): the S3 object key plus its content type.
-- profilepicture stays untouched for externally hosted images.
ALTER TABLE organization ADD COLUMN logokey varchar(255);
ALTER TABLE organization ADD COLUMN logocontenttype varchar(255);
