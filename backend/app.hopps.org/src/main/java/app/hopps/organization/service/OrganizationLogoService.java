package app.hopps.organization.service;

import app.hopps.document.service.StorageService;
import app.hopps.organization.domain.Organization;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.util.List;
import java.util.UUID;

/**
 * Stores and reads the organization logo. The logo lives in S3 like document files do; the organization only keeps the
 * object key.
 */
@ApplicationScoped
public class OrganizationLogoService {

    private static final Logger LOG = LoggerFactory.getLogger(OrganizationLogoService.class);

    private static final List<String> ALLOWED_CONTENT_TYPES = List.of("image/png", "image/jpeg", "image/svg+xml");
    private static final String SVG_CONTENT_TYPE = "image/svg+xml";
    private static final long MAX_SIZE_BYTES = 2L * 1024 * 1024;
    private static final int MIN_DIMENSION_PX = 256;

    @Inject
    StorageService storageService;

    /**
     * Validates and stores the uploaded logo, replacing any previously uploaded one.
     *
     * @param organization
     *            the organization to attach the logo to
     * @param file
     *            the uploaded image (PNG or SVG)
     */
    public void upload(Organization organization, FileUpload file) {
        if (file == null || file.fileName() == null || file.fileName().isBlank()) {
            throw new BadRequestException("File is required");
        }
        if (!ALLOWED_CONTENT_TYPES.contains(file.contentType())) {
            throw new ClientErrorException(
                    "Unsupported file type: " + file.contentType() + ". Allowed: " + ALLOWED_CONTENT_TYPES,
                    Response.Status.UNSUPPORTED_MEDIA_TYPE);
        }
        if (file.size() > MAX_SIZE_BYTES) {
            throw new ClientErrorException("Logo is larger than 2 MB", Response.Status.REQUEST_ENTITY_TOO_LARGE);
        }

        byte[] bytes;
        try {
            bytes = Files.readAllBytes(file.uploadedFile());
        } catch (IOException e) {
            LOG.error("Failed to read uploaded logo", e);
            throw new BadRequestException("Fehler beim Lesen der Datei");
        }

        validateMinimumSize(bytes, file.contentType());

        String previousKey = organization.getLogoKey();
        String key = "organizations/" + organization.getId() + "/logo/" + UUID.randomUUID() + "/" + file.fileName();
        storageService.uploadFile(key, bytes, file.contentType());
        LOG.info("Logo uploaded: organizationId={}, key={}, size={}", organization.getId(), key, file.size());

        organization.setLogoKey(key);
        organization.setLogoContentType(file.contentType());

        if (previousKey != null && !previousKey.equals(key)) {
            deleteQuietly(previousKey);
        }
    }

    public ResponseInputStream<GetObjectResponse> download(Organization organization) {
        return storageService.downloadFile(organization.getLogoKey());
    }

    /**
     * Raster logos (PNG, JPEG) must be at least 256 px on both edges so they stay sharp. SVG is vector, so there is
     * nothing to measure — everything else is checked, so a newly allowed raster type is covered automatically.
     */
    private void validateMinimumSize(byte[] bytes, String contentType) {
        if (SVG_CONTENT_TYPE.equals(contentType)) {
            return;
        }

        BufferedImage image;
        try {
            image = ImageIO.read(new ByteArrayInputStream(bytes));
        } catch (IOException e) {
            throw new BadRequestException("Die Bilddatei konnte nicht gelesen werden");
        }
        if (image == null) {
            throw new BadRequestException("Die Bilddatei konnte nicht gelesen werden");
        }
        if (image.getWidth() < MIN_DIMENSION_PX || image.getHeight() < MIN_DIMENSION_PX) {
            throw new BadRequestException(
                    "Das Logo muss mindestens " + MIN_DIMENSION_PX + " px breit und hoch sein");
        }
    }

    private void deleteQuietly(String key) {
        try {
            storageService.deleteFile(key);
            LOG.info("Previous logo deleted: key={}", key);
        } catch (Exception e) {
            LOG.warn("Failed to delete previous logo: key={}", key, e);
        }
    }
}
