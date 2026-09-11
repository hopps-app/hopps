package app.hopps.shared.infrastructure.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

/**
 * Stores files in an S3 bucket. Works against AWS S3 as well as S3-compatible servers (MinIO, LocalStack); the endpoint
 * and credentials come from the {@code quarkus.s3.*} configuration.
 */
public class S3FileStorage implements FileStorage {

    private static final Logger LOG = LoggerFactory.getLogger(S3FileStorage.class);

    private static final int HTTP_NOT_FOUND = 404;

    private final S3Client s3;
    private final String bucketName;

    public S3FileStorage(S3Client s3, String bucketName) {
        this.s3 = s3;
        this.bucketName = bucketName;
    }

    @Override
    public void initialize() {
        if (!bucketExists()) {
            LOG.info("Bucket {} does not exist, creating it", bucketName);
            s3.createBucket(CreateBucketRequest.builder().bucket(bucketName).build());
        }
        LOG.info("S3 file storage ready, bucket={}", bucketName);
    }

    @Override
    public void put(String key, byte[] content, String contentType) {
        StorageKeys.validateKey(key);
        try {
            s3.putObject(PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .contentType(contentType)
                    .build(), RequestBody.fromBytes(content));
        } catch (S3Exception e) {
            throw new StorageException("Could not store file: key=" + key, e);
        }
        LOG.debug("Stored file in S3: key={}, size={}", key, content.length);
    }

    @Override
    public StoredFile get(String key) {
        StorageKeys.validateKey(key);
        try {
            ResponseInputStream<GetObjectResponse> stream = s3.getObject(GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build());
            GetObjectResponse response = stream.response();
            long size = response.contentLength() == null ? -1 : response.contentLength();
            return new StoredFile(stream, size, response.contentType());
        } catch (NoSuchKeyException | NoSuchBucketException e) {
            throw new StoredFileNotFoundException(key, e);
        } catch (S3Exception e) {
            if (e.statusCode() == HTTP_NOT_FOUND) {
                throw new StoredFileNotFoundException(key, e);
            }
            throw new StorageException("Could not read file: key=" + key, e);
        }
    }

    @Override
    public void delete(String key) {
        StorageKeys.validateKey(key);
        try {
            // S3 deletes are idempotent: removing a key that does not exist succeeds.
            s3.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build());
        } catch (S3Exception e) {
            throw new StorageException("Could not delete file: key=" + key, e);
        }
        LOG.debug("Deleted file from S3: key={}", key);
    }

    @Override
    public boolean exists(String key) {
        StorageKeys.validateKey(key);
        try {
            s3.headObject(HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build());
            return true;
        } catch (NoSuchKeyException | NoSuchBucketException e) {
            return false;
        } catch (S3Exception e) {
            if (e.statusCode() == HTTP_NOT_FOUND) {
                return false;
            }
            throw new StorageException("Could not check file: key=" + key, e);
        }
    }

    private boolean bucketExists() {
        try {
            s3.headBucket(HeadBucketRequest.builder().bucket(bucketName).build());
            return true;
        } catch (NoSuchBucketException e) {
            return false;
        } catch (S3Exception e) {
            if (e.statusCode() == HTTP_NOT_FOUND) {
                return false;
            }
            throw new StorageException("Could not check bucket: " + bucketName, e);
        }
    }
}
