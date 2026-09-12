package app.hopps.shared.infrastructure.storage;

import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.enterprise.inject.Instance;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Inject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.services.s3.S3Client;

import java.nio.file.Path;

/**
 * Creates the {@link FileStorage} backend selected by {@link StorageConfig#type()}.
 * <p>
 * The {@link S3Client} is injected as an {@link Instance} and only resolved for the S3 backend, so a local-storage
 * deployment does not need any S3 credentials.
 */
@ApplicationScoped
public class FileStorageProducer {

    private static final Logger LOG = LoggerFactory.getLogger(FileStorageProducer.class);

    @Inject
    StorageConfig config;

    @Produces
    @ApplicationScoped
    public FileStorage fileStorage(Instance<S3Client> s3Client) {
        return switch (config.type()) {
            case S3 -> {
                LOG.info("Using S3 file storage (bucket={})", config.s3().bucket());
                yield new S3FileStorage(s3Client.get(), config.s3().bucket());
            }
            case LOCAL -> {
                LOG.info("Using local file storage (root={})", config.local().root());
                yield new LocalFileStorage(Path.of(config.local().root()));
            }
        };
    }

    /**
     * Prepares the backend at startup so that a missing bucket or an unwritable directory surfaces immediately instead
     * of on the first upload.
     */
    void onStart(@Observes StartupEvent event, FileStorage fileStorage) {
        fileStorage.initialize();
    }
}
