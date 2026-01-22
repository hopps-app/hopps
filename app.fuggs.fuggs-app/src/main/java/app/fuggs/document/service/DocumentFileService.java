package app.fuggs.document.service;

import app.fuggs.document.domain.Document;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.slf4j.Logger;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.util.UUID;

import static org.slf4j.LoggerFactory.getLogger;

@ApplicationScoped
public class DocumentFileService
{
	private static final Logger LOG = getLogger(DocumentFileService.class);

	@Inject
	StorageService storageService;

	/**
	 * Handles file upload for a document: stores file in S3 and updates
	 * document metadata.
	 *
	 * @param document
	 *            the document to attach the file to
	 * @param file
	 *            the uploaded file
	 */
	public void handleFileUpload(Document document, FileUpload file)
	{
		String fileKey = "documents/" + UUID.randomUUID() + "/" + file.fileName();

		try
		{
			storageService.uploadFile(fileKey, file.uploadedFile(), file.contentType());
			LOG.info("File uploaded to storage: key={}, size={}", fileKey, file.size());

			document.setFileKey(fileKey);
			document.setFileName(file.fileName());
			document.setFileContentType(file.contentType());
			document.setFileSize(file.size());
		}
		catch (Exception e)
		{
			LOG.error("Failed to upload file", e);
			throw new RuntimeException("Fehler beim Hochladen der Datei", e);
		}
	}

	/**
	 * Deletes a file from storage.
	 *
	 * @param fileKey
	 *            the S3 key of the file to delete
	 */
	public void deleteFile(String fileKey)
	{
		if (fileKey == null || fileKey.isBlank())
		{
			return;
		}

		try
		{
			storageService.deleteFile(fileKey);
			LOG.info("File deleted from storage: key={}", fileKey);
		}
		catch (Exception e)
		{
			LOG.warn("Failed to delete file from storage: key={}", fileKey, e);
			// Don't fail the operation if file deletion fails
		}
	}

	/**
	 * Downloads a file from storage.
	 *
	 * @param fileKey
	 *            the S3 key of the file
	 * @return ResponseInputStream of the file content
	 */
	public ResponseInputStream<GetObjectResponse> downloadFile(String fileKey)
	{
		return storageService.downloadFile(fileKey);
	}
}
