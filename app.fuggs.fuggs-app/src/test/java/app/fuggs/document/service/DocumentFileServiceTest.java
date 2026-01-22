package app.fuggs.document.service;

import app.fuggs.document.domain.Document;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentFileServiceTest
{
	@Mock
	StorageService storageService;

	@Mock
	FileUpload fileUpload;

	@InjectMocks
	DocumentFileService documentFileService;

	private Document document;

	@BeforeEach
	void setUp()
	{
		document = new Document();
	}

	@Test
	void shouldHandleFileUploadSuccessfully()
	{
		// Given
		Path filePath = Paths.get("/tmp/test.pdf");
		when(fileUpload.fileName()).thenReturn("test.pdf");
		when(fileUpload.uploadedFile()).thenReturn(filePath);
		when(fileUpload.contentType()).thenReturn("application/pdf");
		when(fileUpload.size()).thenReturn(1024L);

		// When
		documentFileService.handleFileUpload(document, fileUpload);

		// Then
		verify(storageService).uploadFile(any(String.class), eq(filePath), eq("application/pdf"));
		assertEquals("test.pdf", document.getFileName());
		assertEquals("application/pdf", document.getFileContentType());
		assertEquals(1024L, document.getFileSize());
		assertTrue(document.getFileKey().startsWith("documents/"));
		assertTrue(document.getFileKey().endsWith("/test.pdf"));
	}

	@Test
	void shouldThrowExceptionWhenUploadFails()
	{
		// Given
		Path filePath = Paths.get("/tmp/test.pdf");
		when(fileUpload.fileName()).thenReturn("test.pdf");
		when(fileUpload.uploadedFile()).thenReturn(filePath);
		when(fileUpload.contentType()).thenReturn("application/pdf");
		doThrow(new RuntimeException("S3 error")).when(storageService)
			.uploadFile(any(String.class), eq(filePath), any(String.class));

		// When/Then
		assertThrows(RuntimeException.class, () -> {
			documentFileService.handleFileUpload(document, fileUpload);
		});
	}

	@Test
	void shouldDeleteFileSuccessfully()
	{
		// Given
		String fileKey = "documents/test-uuid/test.pdf";

		// When
		documentFileService.deleteFile(fileKey);

		// Then
		verify(storageService).deleteFile(fileKey);
	}

	@Test
	void shouldNotDeleteFileWhenKeyIsNull()
	{
		// When
		documentFileService.deleteFile(null);

		// Then
		verify(storageService, never()).deleteFile(any());
	}

	@Test
	void shouldNotDeleteFileWhenKeyIsBlank()
	{
		// When
		documentFileService.deleteFile("");

		// Then
		verify(storageService, never()).deleteFile(any());
	}

	@Test
	void shouldNotThrowExceptionWhenDeleteFails()
	{
		// Given
		String fileKey = "documents/test-uuid/test.pdf";
		doThrow(new RuntimeException("S3 error")).when(storageService).deleteFile(fileKey);

		// When/Then - should not throw
		documentFileService.deleteFile(fileKey);
		verify(storageService).deleteFile(fileKey);
	}

	@Test
	void shouldDownloadFileSuccessfully()
	{
		// Given
		String fileKey = "documents/test-uuid/test.pdf";
		@SuppressWarnings("unchecked")
		ResponseInputStream<GetObjectResponse> mockInputStream = org.mockito.Mockito
			.mock(ResponseInputStream.class);
		when(storageService.downloadFile(fileKey)).thenReturn(mockInputStream);

		// When
		ResponseInputStream<GetObjectResponse> result = documentFileService.downloadFile(fileKey);

		// Then
		assertEquals(mockInputStream, result);
		verify(storageService).downloadFile(fileKey);
	}

	@Test
	void shouldHandleSpecialCharactersInFileName()
	{
		// Given
		Path filePath = Paths.get("/tmp/test (1) [draft].pdf");
		when(fileUpload.fileName()).thenReturn("test (1) [draft].pdf");
		when(fileUpload.uploadedFile()).thenReturn(filePath);
		when(fileUpload.contentType()).thenReturn("application/pdf");
		when(fileUpload.size()).thenReturn(2048L);

		// When
		documentFileService.handleFileUpload(document, fileUpload);

		// Then
		verify(storageService).uploadFile(any(String.class), eq(filePath), eq("application/pdf"));
		assertEquals("test (1) [draft].pdf", document.getFileName());
		assertTrue(document.getFileKey().endsWith("/test (1) [draft].pdf"));
	}

	@Test
	void shouldGenerateUniqueFileKeysForMultipleUploads()
	{
		// Given
		Document document2 = new Document();
		Path filePath = Paths.get("/tmp/same-file.pdf");
		when(fileUpload.fileName()).thenReturn("same-file.pdf");
		when(fileUpload.uploadedFile()).thenReturn(filePath);
		when(fileUpload.contentType()).thenReturn("application/pdf");
		when(fileUpload.size()).thenReturn(1024L);

		// When
		documentFileService.handleFileUpload(document, fileUpload);
		documentFileService.handleFileUpload(document2, fileUpload);

		// Then - file keys should be different due to UUID
		assertTrue(document.getFileKey().startsWith("documents/"));
		assertTrue(document2.getFileKey().startsWith("documents/"));
		assertNotEquals(document.getFileKey(), document2.getFileKey(), "File keys should be unique");
	}

	@Test
	void shouldHandleDifferentContentTypes()
	{
		// Given - test JPEG
		Path jpegPath = Paths.get("/tmp/image.jpg");
		when(fileUpload.fileName()).thenReturn("image.jpg");
		when(fileUpload.uploadedFile()).thenReturn(jpegPath);
		when(fileUpload.contentType()).thenReturn("image/jpeg");
		when(fileUpload.size()).thenReturn(512L);

		// When
		documentFileService.handleFileUpload(document, fileUpload);

		// Then
		assertEquals("image/jpeg", document.getFileContentType());
		assertEquals("image.jpg", document.getFileName());

		// Given - test PNG
		Document pngDoc = new Document();
		Path pngPath = Paths.get("/tmp/image.png");
		when(fileUpload.fileName()).thenReturn("image.png");
		when(fileUpload.uploadedFile()).thenReturn(pngPath);
		when(fileUpload.contentType()).thenReturn("image/png");

		// When
		documentFileService.handleFileUpload(pngDoc, fileUpload);

		// Then
		assertEquals("image/png", pngDoc.getFileContentType());
		assertEquals("image.png", pngDoc.getFileName());
	}

	@Test
	void shouldHandleVeryLongFileNames()
	{
		// Given - filename with 200 characters
		String longName = "a".repeat(190) + "-test.pdf";
		Path filePath = Paths.get("/tmp/" + longName);
		when(fileUpload.fileName()).thenReturn(longName);
		when(fileUpload.uploadedFile()).thenReturn(filePath);
		when(fileUpload.contentType()).thenReturn("application/pdf");
		when(fileUpload.size()).thenReturn(1024L);

		// When
		documentFileService.handleFileUpload(document, fileUpload);

		// Then
		verify(storageService).uploadFile(any(String.class), eq(filePath), eq("application/pdf"));
		assertEquals(longName, document.getFileName());
		assertTrue(document.getFileKey().endsWith("/" + longName));
	}

	@Test
	void shouldPreserveFileExtension()
	{
		// Given - test various extensions
		String[] fileNames = { "document.pdf", "spreadsheet.xlsx", "presentation.pptx", "archive.zip" };

		for (String fileName : fileNames)
		{
			Document doc = new Document();
			Path filePath = Paths.get("/tmp/" + fileName);
			when(fileUpload.fileName()).thenReturn(fileName);
			when(fileUpload.uploadedFile()).thenReturn(filePath);
			when(fileUpload.contentType()).thenReturn("application/octet-stream");
			when(fileUpload.size()).thenReturn(1024L);

			// When
			documentFileService.handleFileUpload(doc, fileUpload);

			// Then
			assertEquals(fileName, doc.getFileName());
			assertTrue(doc.getFileKey().endsWith("/" + fileName),
				"File key should preserve extension for " + fileName);
		}
	}
}
