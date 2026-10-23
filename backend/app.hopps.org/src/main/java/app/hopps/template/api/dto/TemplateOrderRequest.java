package app.hopps.template.api.dto;

import jakarta.validation.constraints.NotNull;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

import java.util.List;

@Schema(name = "TemplateOrderRequest", description = "Template ids in their new order, first to last")
public record TemplateOrderRequest(
        @NotNull @Schema(description = "Template ids in their new order. Templates not listed keep their position after the listed ones.") List<Long> ids) {
}
