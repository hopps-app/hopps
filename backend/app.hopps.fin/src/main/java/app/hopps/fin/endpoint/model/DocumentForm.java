package app.hopps.fin.endpoint.model;

import jakarta.ws.rs.core.MediaType;
import org.jboss.resteasy.reactive.PartType;
import org.jboss.resteasy.reactive.RestForm;

import java.io.InputStream;

public record DocumentForm(
        @RestForm("file") @PartType(MediaType.APPLICATION_OCTET_STREAM) InputStream file,
        @RestForm @PartType(MediaType.TEXT_PLAIN) String filename,
        @RestForm @PartType(MediaType.TEXT_PLAIN) String mimetype,
        @RestForm @PartType(MediaType.TEXT_PLAIN) Long bommelId
) {
}
