package app.hopps.document.service;

import java.util.UUID;

import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.multipart.FileUpload;

import app.hopps.document.domain.Document;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

@ApplicationScoped
public class DocumentFileService
{
	private static final Logger LOG = Logger.getLogger(DocumentFileService.class);

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
			LOG.infof("File uploaded to storage: key=%s, size=%d", fileKey, file.size());

			document.setFileKey(fileKey);
			document.setFileName(file.fileName());
			document.setFileContentType(file.contentType());
			document.setFileSize(file.size());
		}
		catch (Exception e)
		{
			LOG.errorf(e, "Failed to upload file: %s", e.getMessage());
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
			LOG.infof("File deleted from storage: key=%s", fileKey);
		}
		catch (Exception e)
		{
			LOG.warnf(e, "Failed to delete file from storage: key=%s", fileKey);
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
