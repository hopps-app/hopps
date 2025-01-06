package app.hopps.fin;

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

import java.io.InputStream;

@ApplicationScoped
public class S3Handler {
    private static final Logger LOG = LoggerFactory.getLogger(S3Handler.class);

    private final S3Client s3;

    @ConfigProperty(name = "app.hopps.fin.bucket.name")
    String bucketName;

    @Inject
    public S3Handler(S3Client s3) {
        this.s3 = s3;
    }

    public InputStream getFile(String documentKey) {
        var object = s3.getObjectAsBytes(GetObjectRequest.builder()
                .bucket(bucketName)
                .key(documentKey)
                .build());

        return object.asInputStream();
    }

    public void saveFile(FileUpload file) {
        s3.putObject(PutObjectRequest.builder()
                .bucket(bucketName)
                .key(file.fileName())
                .contentType(file.contentType())
                .build(), RequestBody.fromFile(file.uploadedFile()));
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
