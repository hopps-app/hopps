package app.hopps.fin;

import app.hopps.fin.endpoint.model.DocumentForm;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.apache.commons.io.IOUtils;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;

import java.io.IOException;
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

    public void saveFile(DocumentForm documentForm) {
        try {
            byte[] bytes = IOUtils.toByteArray(documentForm.file());

            s3.putObject(PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(documentForm.filename())
                    .contentType(documentForm.mimetype())
                    .build(), RequestBody.fromBytes(bytes));
        } catch (IOException e) {
            LOG.warn("Could not upload file");
            throw new IllegalArgumentException("Could not upload file to s3");
        }
    }

    void setup(@Observes StartupEvent ev) {
        if (!checkBucketExists()) {
            // Throw exception when exist but not creatable
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
