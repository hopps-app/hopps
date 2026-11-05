package app.hopps.uploadlink.api.dto;

import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;

/** Multipart body of a receipt submitted through an upload link. Only the file and the name are required. */
@Schema(name = "PublicReceiptForm", requiredProperties = { "file", "name" })
public record PublicReceiptForm(
        @RestForm("file") @Schema(type = SchemaType.STRING, format = "binary", description = "The receipt (PNG, JPEG or PDF)") FileUpload file,
        @RestForm("name") @Schema(description = "Name of the submitter", maxLength = 255) String name,
        @RestForm("comment") @Schema(description = "Optional note for the treasurer", maxLength = 2000, nullable = true) String comment,
        @RestForm("privatelyPaid") @Schema(description = "Whether the submitter paid privately", defaultValue = "false", nullable = true) Boolean privatelyPaid) {
}
