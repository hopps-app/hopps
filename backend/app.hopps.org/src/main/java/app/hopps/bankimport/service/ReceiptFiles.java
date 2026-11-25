package app.hopps.bankimport.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Receipt files of an import: unpacks ZIP archives, keeps what is a PDF, PNG or JPEG (checked by content, not by name)
 * and merges several files of one expense into a single PDF.
 */
public final class ReceiptFiles {

    public static final String PDF = "application/pdf";
    public static final String PNG = "image/png";
    public static final String JPEG = "image/jpeg";

    /** Guards against oversized or malicious archives ("zip bombs"). */
    static final int MAX_ZIP_ENTRIES = 1000;
    static final long MAX_FILE_BYTES = 20L * 1024 * 1024;
    static final long MAX_TOTAL_BYTES = 200L * 1024 * 1024;

    private static final byte[] PDF_MAGIC = { '%', 'P', 'D', 'F' };
    private static final byte[] PNG_MAGIC = { (byte) 0x89, 'P', 'N', 'G' };
    private static final byte[] JPEG_MAGIC = { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF };
    private static final byte[] ZIP_MAGIC = { 'P', 'K', 3, 4 };

    /** A receipt file, named by its own name without folders. */
    public record ReceiptFile(String name, String contentType, byte[] content) {
    }

    /** A file that is not used, with the reason (see the REASON_ constants). */
    public record Rejected(String name, String reason) {
    }

    public static final String REASON_UNSUPPORTED = "UNSUPPORTED_TYPE";
    public static final String REASON_TOO_LARGE = "TOO_LARGE";
    public static final String REASON_UNREADABLE = "UNREADABLE";

    public record Collected(List<ReceiptFile> files, List<Rejected> rejected) {
    }

    /** An uploaded file before it is looked at: a receipt or a ZIP of receipts. */
    public record Upload(String name, byte[] content) {
    }

    private ReceiptFiles() {
    }

    public static Collected collect(List<Upload> uploads) {
        List<ReceiptFile> files = new ArrayList<>();
        List<Rejected> rejected = new ArrayList<>();
        long[] total = { 0 };
        for (Upload upload : uploads) {
            if (startsWith(upload.content(), ZIP_MAGIC)) {
                unzip(upload, files, rejected, total);
            } else {
                add(baseName(upload.name()), upload.content(), files, rejected);
            }
        }
        return new Collected(files, rejected);
    }

    private static void unzip(Upload upload, List<ReceiptFile> files, List<Rejected> rejected, long[] total) {
        int entries = 0;
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(upload.content()))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (entry.isDirectory()) {
                    continue;
                }
                String name = baseName(entry.getName());
                // macOS resource forks and hidden files are no receipts.
                if (entry.getName().startsWith("__MACOSX/") || name.startsWith(".")) {
                    continue;
                }
                if (++entries > MAX_ZIP_ENTRIES) {
                    rejected.add(new Rejected(upload.name(), REASON_TOO_LARGE));
                    return;
                }
                byte[] content = readBounded(zip, MAX_FILE_BYTES);
                if (content == null) {
                    rejected.add(new Rejected(name, REASON_TOO_LARGE));
                    continue;
                }
                total[0] += content.length;
                if (total[0] > MAX_TOTAL_BYTES) {
                    rejected.add(new Rejected(upload.name(), REASON_TOO_LARGE));
                    return;
                }
                add(name, content, files, rejected);
            }
        } catch (IOException | IllegalArgumentException e) {
            rejected.add(new Rejected(upload.name(), REASON_UNREADABLE));
        }
    }

    private static void add(String name, byte[] content, List<ReceiptFile> files, List<Rejected> rejected) {
        String type = contentType(content);
        if (type == null) {
            rejected.add(new Rejected(name, REASON_UNSUPPORTED));
        } else if (content.length > MAX_FILE_BYTES) {
            rejected.add(new Rejected(name, REASON_TOO_LARGE));
        } else {
            files.add(new ReceiptFile(name, type, content));
        }
    }

    /** Reads at most {@code limit} bytes; null if there are more. */
    private static byte[] readBounded(InputStream in, long limit) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        long read = 0;
        int n;
        while ((n = in.read(buffer)) > 0) {
            read += n;
            if (read > limit) {
                return null;
            }
            out.write(buffer, 0, n);
        }
        return out.toByteArray();
    }

    /** PDF, PNG or JPEG by the file's first bytes; null for anything else. */
    public static String contentType(byte[] content) {
        if (startsWith(content, PDF_MAGIC)) {
            return PDF;
        }
        if (startsWith(content, PNG_MAGIC)) {
            return PNG;
        }
        if (startsWith(content, JPEG_MAGIC)) {
            return JPEG;
        }
        return null;
    }

    private static boolean startsWith(byte[] content, byte[] magic) {
        return content != null && content.length >= magic.length
                && Arrays.equals(Arrays.copyOf(content, magic.length), magic);
    }

    /** The file name without folders ("belege/2600009a.pdf" → "2600009a.pdf"). */
    public static String baseName(String path) {
        if (path == null) {
            return "";
        }
        String name = path.replace('\\', '/');
        return name.substring(name.lastIndexOf('/') + 1).trim();
    }

    /** The name without its extension ("2600009a.pdf" → "2600009a"). */
    public static String stem(String name) {
        int dot = name.lastIndexOf('.');
        return (dot > 0 ? name.substring(0, dot) : name).trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Merges the files, in the given order, into one PDF: PDF pages are taken over as they are, each image becomes an
     * A4 page.
     *
     * @throws IOException
     *             if a file cannot be read as what its content says it is
     */
    public static byte[] mergeToPdf(List<ReceiptFile> files) throws IOException {
        List<PDDocument> sources = new ArrayList<>();
        try (PDDocument merged = new PDDocument()) {
            PDFMergerUtility merger = new PDFMergerUtility();
            for (ReceiptFile file : files) {
                if (PDF.equals(file.contentType())) {
                    PDDocument source = Loader.loadPDF(file.content());
                    // Kept open until saved: the merged pages still read their content from it.
                    sources.add(source);
                    merger.appendDocument(merged, source);
                } else {
                    addImagePage(merged, file);
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            merged.save(out);
            return out.toByteArray();
        } finally {
            for (PDDocument source : sources) {
                source.close();
            }
        }
    }

    private static void addImagePage(PDDocument document, ReceiptFile file) throws IOException {
        PDImageXObject image = PDImageXObject.createFromByteArray(document, file.content(), file.name());
        PDRectangle box = PDRectangle.A4;
        float margin = 24;
        float scale = Math.min((box.getWidth() - 2 * margin) / image.getWidth(),
                (box.getHeight() - 2 * margin) / image.getHeight());
        float width = image.getWidth() * scale;
        float height = image.getHeight() * scale;
        PDPage page = new PDPage(box);
        document.addPage(page);
        try (PDPageContentStream content = new PDPageContentStream(document, page)) {
            content.drawImage(image, (box.getWidth() - width) / 2, (box.getHeight() - height) / 2, width, height);
        }
    }
}
