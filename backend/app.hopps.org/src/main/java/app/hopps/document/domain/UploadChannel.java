package app.hopps.document.domain;

/**
 * How a document's file got into hopps.
 */
public enum UploadChannel {
    /**
     * Uploaded by a signed-in member in the app.
     */
    APP,

    /**
     * Submitted without an account through a bommel's public upload link; uploadedBy is the name the submitter typed.
     */
    UPLOAD_LINK
}
