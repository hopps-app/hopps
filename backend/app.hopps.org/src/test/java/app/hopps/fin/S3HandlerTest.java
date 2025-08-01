package app.hopps.fin;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsRequest;

import java.io.IOException;
import java.net.URISyntaxException;
import java.net.URL;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@QuarkusTest
class S3HandlerTest {

    @Inject
    S3Handler s3Handler;

    @Inject
    S3Client lowLevels3Client;

    @ConfigProperty(name = "app.hopps.fin.bucket.name")
    String bucketName;

    @BeforeEach
    public void reset() {
        deleteAllObjects();
    }

    @Test
    void shouldBeUpAndRunning() {
        assertDoesNotThrow(() -> s3Handler.setup(null));
    }

    @Test
    void saveFileTest() throws URISyntaxException, IOException {
        // given
        FileUpload file = getMockedFileUpload();

        // when
        s3Handler.saveFile("019676cf-46cf-71be-803d-1011e05e0840", file);

        // then
        var resp = lowLevels3Client.listObjects(
                ListObjectsRequest.builder()
                        .bucket(bucketName)
                        .build());

        assertEquals(1, resp.contents().size());
        assertDoesNotThrow(() -> s3Handler.getFile("019676cf-46cf-71be-803d-1011e05e0840"));
    }

    @Test
    void documentsAreCachedTest() throws IOException, URISyntaxException {
        // given
        // save a file and then delete it from the s3,
        // this way getFile throws an error if it tries accessing the s3 again.
        FileUpload file = getMockedFileUpload();
        String documentKey = "019676d0-19ec-704d-b746-b77353e2209f";
        s3Handler.saveFile(documentKey, file);

        lowLevels3Client.deleteObject(
                DeleteObjectRequest.builder()
                        .bucket(bucketName)
                        .key(documentKey)
                        .build());

        // when + then
        assertDoesNotThrow(() -> s3Handler.getFile(documentKey));
    }

    private FileUpload getMockedFileUpload() throws URISyntaxException {
        URL fileUrl = getClass().getClassLoader().getResource("ZUGFeRD.pdf");
        Path filePath = Paths.get(fileUrl.toURI());

        FileUpload fileUpload = Mockito.mock(FileUpload.class);
        when(fileUpload.uploadedFile()).thenReturn(filePath);
        when(fileUpload.fileName()).thenReturn("ZUGFeRD.pdf");
        when(fileUpload.contentType()).thenReturn("application/pdf");

        return fileUpload;
    }

    private void deleteAllObjects() {
        var objects = lowLevels3Client.listObjects(
                ListObjectsRequest.builder().bucket(bucketName).build());
        for (var object : objects.contents()) {
            lowLevels3Client.deleteObject(
                    DeleteObjectRequest.builder()
                            .bucket(bucketName)
                            .key(object.key())
                            .build());
        }
    }
}
