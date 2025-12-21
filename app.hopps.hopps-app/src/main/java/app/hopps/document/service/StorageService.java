package app.hopps.document.service;

import java.io.InputStream;
import java.nio.file.Path;

import org.eclipse.microprofile.config.inject.ConfigProperty;

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
	@Inject
	S3Client s3Client;

	@ConfigProperty(name = "bucket.name")
	String bucketName;

	public void uploadFile(String key, Path filePath, String contentType)
	{
		PutObjectRequest request = PutObjectRequest.builder()
			.bucket(bucketName)
			.key(key)
			.contentType(contentType)
			.build();

		s3Client.putObject(request, filePath);
	}

	public void uploadFile(String key, byte[] content, String contentType)
	{
		PutObjectRequest request = PutObjectRequest.builder()
			.bucket(bucketName)
			.key(key)
			.contentType(contentType)
			.build();

		s3Client.putObject(request, RequestBody.fromBytes(content));
	}

	public ResponseInputStream<GetObjectResponse> downloadFile(String key)
	{
		GetObjectRequest request = GetObjectRequest.builder()
			.bucket(bucketName)
			.key(key)
			.build();

		return s3Client.getObject(request);
	}

	public void deleteFile(String key)
	{
		DeleteObjectRequest request = DeleteObjectRequest.builder()
			.bucket(bucketName)
			.key(key)
			.build();

		s3Client.deleteObject(request);
	}

	public boolean fileExists(String key)
	{
		try
		{
			s3Client.headObject(builder -> builder.bucket(bucketName).key(key));
			return true;
		}
		catch (Exception e)
		{
			return false;
		}
	}
}
