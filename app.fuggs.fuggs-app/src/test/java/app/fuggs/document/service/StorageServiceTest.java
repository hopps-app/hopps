package app.fuggs.document.service;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.is;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;

@QuarkusTest
class StorageServiceTest
{
	@Inject
	StorageService storageService;

	@Test
	void shouldUploadAndDownloadFileFromBytes()
	{
		String key = "test/upload-bytes-" + System.currentTimeMillis() + ".txt";
		String content = "Hello from S3 test!";

		storageService.uploadFile(key, content.getBytes(StandardCharsets.UTF_8), "text/plain");

		var response = storageService.downloadFile(key);
		String downloadedContent = new String(readAllBytes(response), StandardCharsets.UTF_8);

		assertThat(downloadedContent, equalTo(content));
	}

	@Test
	void shouldUploadAndDownloadFileFromPath() throws IOException
	{
		String key = "test/upload-path-" + System.currentTimeMillis() + ".txt";
		String content = "Hello from path upload!";

		Path tempFile = Files.createTempFile("test-upload", ".txt");
		Files.writeString(tempFile, content);

		try
		{
			storageService.uploadFile(key, tempFile, "text/plain");

			var response = storageService.downloadFile(key);
			String downloadedContent = new String(readAllBytes(response), StandardCharsets.UTF_8);

			assertThat(downloadedContent, equalTo(content));
		}
		finally
		{
			Files.deleteIfExists(tempFile);
		}
	}

	@Test
	void shouldDeleteFile()
	{
		String key = "test/delete-" + System.currentTimeMillis() + ".txt";
		storageService.uploadFile(key, "to be deleted".getBytes(), "text/plain");

		assertThat(storageService.fileExists(key), is(true));

		storageService.deleteFile(key);

		assertThat(storageService.fileExists(key), is(false));
	}

	@Test
	void shouldReturnFalseForNonExistentFile()
	{
		String key = "test/non-existent-" + System.currentTimeMillis() + ".txt";

		assertThat(storageService.fileExists(key), is(false));
	}

	@Test
	void shouldReturnTrueForExistingFile()
	{
		String key = "test/exists-" + System.currentTimeMillis() + ".txt";
		storageService.uploadFile(key, "exists".getBytes(), "text/plain");

		assertThat(storageService.fileExists(key), is(true));
	}

	@Test
	void shouldHandleBinaryContent()
	{
		String key = "test/binary-" + System.currentTimeMillis() + ".bin";
		byte[] binaryContent = new byte[] { 0x00, 0x01, 0x02, (byte)0xFF, (byte)0xFE };

		storageService.uploadFile(key, binaryContent, "application/octet-stream");

		var response = storageService.downloadFile(key);
		byte[] downloaded = readAllBytes(response);

		assertThat(downloaded, equalTo(binaryContent));
	}

	private byte[] readAllBytes(java.io.InputStream inputStream)
	{
		try
		{
			return inputStream.readAllBytes();
		}
		catch (IOException e)
		{
			throw new RuntimeException(e);
		}
	}
}
