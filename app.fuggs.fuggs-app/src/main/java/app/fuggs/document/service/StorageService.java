package app.fuggs.document.service;

import java.nio.file.Path;

import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@ApplicationScoped
public class StorageService
{
	private static final Logger LOG = LoggerFactory.getLogger(StorageService.class);

	@Inject
	S3Client s3Client;

	@ConfigProperty(name = "bucket.name")
	String bucketName;

	public void uploadFile(String key, Path filePath, String contentType)
	{
		LOG.info("Uploading file to S3: key={}, contentType={}", key, contentType);
		LOG.debug("Upload source path: {}", filePath);

		PutObjectRequest request = PutObjectRequest.builder()
			.bucket(bucketName)
			.key(key)
			.contentType(contentType)
			.build();

		s3Client.putObject(request, filePath);
		LOG.info("File uploaded successfully: key={}", key);
	}

	public void uploadFile(String key, byte[] content, String contentType)
	{
		LOG.info("Uploading file to S3: key={}, contentType={}, size={} bytes", key, contentType, content.length);

		PutObjectRequest request = PutObjectRequest.builder()
			.bucket(bucketName)
			.key(key)
			.contentType(contentType)
			.build();

		s3Client.putObject(request, RequestBody.fromBytes(content));
		LOG.info("File uploaded successfully: key={}", key);
	}

	public ResponseInputStream<GetObjectResponse> downloadFile(String key)
	{
		LOG.info("Downloading file from S3: key={}", key);

		GetObjectRequest request = GetObjectRequest.builder()
			.bucket(bucketName)
			.key(key)
			.build();

		ResponseInputStream<GetObjectResponse> response = s3Client.getObject(request);
		LOG.debug("File download initiated: key={}", key);
		return response;
	}

	public void deleteFile(String key)
	{
		LOG.info("Deleting file from S3: key={}", key);

		DeleteObjectRequest request = DeleteObjectRequest.builder()
			.bucket(bucketName)
			.key(key)
			.build();

		s3Client.deleteObject(request);
		LOG.info("File deleted successfully: key={}", key);
	}

	public boolean fileExists(String key)
	{
		LOG.debug("Checking if file exists in S3: key={}", key);
		try
		{
			s3Client.headObject(builder -> builder.bucket(bucketName).key(key));
			LOG.debug("File exists: key={}", key);
			return true;
		}
		catch (Exception e)
		{
			LOG.debug("File does not exist: key={}", key);
			return false;
		}
	}
}
