package app.hopps.shared.infrastructure.storage;

import app.hopps.transaction.domain.TransactionRecord;
import io.quarkus.cache.Cache;
import io.quarkus.cache.CacheName;
import io.quarkus.cache.CacheResult;
import io.quarkus.cache.CaffeineCache;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
import java.nio.file.Files;
import java.util.concurrent.CompletableFuture;

/**
 * S3 storage handler for managing document uploads and downloads. Provides caching for frequently accessed documents.
 */
@ApplicationScoped
public class S3Handler {

    private static final Logger LOG = LoggerFactory.getLogger(S3Handler.class);

    private final S3Client s3;
    private final Cache documentCache;

    @ConfigProperty(name = "app.hopps.fin.bucket.name")
    String bucketName;

    @Inject
    public S3Handler(S3Client s3, @CacheName("document-cache") Cache documentCache) {
        this.s3 = s3;
        this.documentCache = documentCache;
    }

    public byte[] getFile(TransactionRecord transactionRecord) {
        return getFile(transactionRecord.getDocumentKey());
    }

    @CacheResult(cacheName = "document-cache")
    public byte[] getFile(String documentKey) {
        var object = s3.getObjectAsBytes(GetObjectRequest.builder()
                .bucket(bucketName)
                .key(documentKey)
                .build());

        LOG.info("Content-Type of downloaded image: {}", object.response().contentType());
        return object.asByteArray();
    }

    public void saveFile(String documentKey, String contentType, byte[] fileContents) {
        s3.putObject(PutObjectRequest.builder()
                .bucket(bucketName)
                .key(documentKey)
                .contentType(contentType)
                .build(), RequestBody.fromBytes(fileContents));

        documentCache.as(CaffeineCache.class)
                .put(documentKey, CompletableFuture.completedFuture(fileContents));
    }

    public void saveFile(String documentKey, FileUpload file) throws IOException {
        byte[] fileContents = Files.readAllBytes(file.uploadedFile());
        this.saveFile(documentKey, file.contentType(), fileContents);
    }

    void setup(@Observes StartupEvent ev) {
        if (!checkBucketExists()) {
            // Throw exception when not creatable
            createBucket();
        }
    }

    private void createBucket() {
        s3.createBucket(CreateBucketRequest.builder().bucket(bucketName).build());
    }

    private boolean checkBucketExists() {
        try {
            s3.headBucket(HeadBucketRequest.builder().bucket(bucketName).build());
            return true;
        } catch (NoSuchBucketException noSuchBucketException) {
            LOG.warn("Bucket not found");
            return false;
        }
    }
}
