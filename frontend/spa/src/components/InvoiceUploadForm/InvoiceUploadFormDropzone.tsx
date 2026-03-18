import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getDocument, GlobalWorkerOptions, PDFDocumentProxy } from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker&url';
import { type FC, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileWithPath, useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

import BunnyIcon from '@/components/Receipts/BunnyIcon';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils.ts';

type InvoiceUploadFormDropzoneProps = {
    onFilesChanged: (file: FileWithPath[]) => void;
    previewFile?: File | null;
    previewUrl?: string | null;
    previewContentType?: string;
};

type PdfPageNavigationProps = {
    currentPage: number;
    totalPages: number;
    onPrevious: (e: React.MouseEvent) => void;
    onNext: (e: React.MouseEvent) => void;
    t: (key: string, options?: Record<string, unknown>) => string;
};

const PdfPageNavigation: FC<PdfPageNavigationProps> = ({ currentPage, totalPages, onPrevious, onNext, t }) => (
    <>
        {/* Left arrow */}
        <button
            type="button"
            onClick={onPrevious}
            disabled={currentPage <= 1}
            aria-label={t('invoiceUpload.pdfNavigation.previousPage')}
            className={cn(
                'absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-md border border-gray-200 dark:border-gray-700 transition-all duration-150',
                currentPage <= 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg hover:scale-105 cursor-pointer'
            )}
        >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>

        {/* Right arrow */}
        <button
            type="button"
            onClick={onNext}
            disabled={currentPage >= totalPages}
            aria-label={t('invoiceUpload.pdfNavigation.nextPage')}
            className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-md border border-gray-200 dark:border-gray-700 transition-all duration-150',
                currentPage >= totalPages
                    ? 'opacity-30 cursor-not-allowed'
                    : 'hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg hover:scale-105 cursor-pointer'
            )}
        >
            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>

        {/* Page indicator */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-gray-800/90 shadow-md border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200">
            <span>{t('invoiceUpload.pdfNavigation.pageIndicator', { current: currentPage, total: totalPages })}</span>
        </div>
    </>
);

const InvoiceUploadFormDropzone: FC<InvoiceUploadFormDropzoneProps> = ({ onFilesChanged, previewFile, previewUrl: externalPreviewUrl, previewContentType }) => {
    const { t } = useTranslation();
    const { showError } = useToast();

    const [isHighlightDrop, setIsHighlightDrop] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);

    const onDrop = useCallback(() => {
        setIsHighlightDrop(false);
    }, []);

    const onDragEnter = useCallback(() => {
        setIsHighlightDrop(true);
    }, []);

    const onDragLeave = useCallback(() => {
        setIsHighlightDrop(false);
    }, []);

    const { getRootProps, getInputProps, isDragActive, acceptedFiles, fileRejections } = useDropzone({
        accept: {
            'image/png': ['.png'],
            'image/jpeg': ['.jpeg', '.jpg'],
            'application/pdf': ['.pdf'],
        },
        multiple: false,
        onDragEnter,
        onDragLeave,
        onDrop,
        maxSize: 5000000,
    });

    // Track previous acceptedFiles to detect actual changes
    const prevAcceptedFilesRef = useRef<readonly FileWithPath[]>([]);
    // Track previous fileRejections to prevent infinite re-render loop
    const prevFileRejectionsRef = useRef<typeof fileRejections>([]);

    useEffect(() => {
        // Only call onFilesChanged when acceptedFiles actually changes (new file selection)
        // Comparing by reference since react-dropzone creates new array on each file drop
        if (acceptedFiles !== prevAcceptedFilesRef.current && acceptedFiles.length > 0) {
            prevAcceptedFilesRef.current = acceptedFiles;
            onFilesChanged([...acceptedFiles]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally excluding onFilesChanged to prevent re-uploads on callback changes
    }, [acceptedFiles]);

    useEffect(() => {
        // Only process new file rejections (compare by reference to avoid infinite loop)
        if (fileRejections !== prevFileRejectionsRef.current && fileRejections.length > 0) {
            prevFileRejectionsRef.current = fileRejections;
            fileRejections.forEach(({ errors }) => {
                errors.forEach((error) => {
                    if (error.code === 'file-too-large') {
                        showError(t('invoiceUpload.fileTooLarge'));
                    } else if (error.code === 'file-invalid-type') {
                        showError(t('invoiceUpload.invalidFileType', 'Unsupported file type. Please upload PDF, JPEG, or PNG files.'));
                    } else {
                        showError(error.message);
                    }
                });
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- using ref comparison to prevent infinite loop
    }, [fileRejections]);

    const previewUrl = useMemo(() => {
        if (!previewFile) return '';
        try {
            return URL.createObjectURL(previewFile);
        } catch {
            return '';
        }
    }, [previewFile]);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    // Render a specific page of the current PDF document
    const renderPdfPage = useCallback(async (pdf: PDFDocumentProxy, pageNumber: number) => {
        try {
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = canvasRef.current;
            if (!canvas) return;
            const context = canvas.getContext('2d');
            if (!context) return;
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: context, viewport }).promise;
        } catch (e) {
            console.error(e);
        }
    }, []);

    // Load PDF document and render first page
    useEffect(() => {
        const loadPdf = async () => {
            // Reset page state when source changes
            pdfDocRef.current = null;
            setCurrentPage(1);
            setTotalPages(0);

            // Load PDF from previewFile
            if (previewFile) {
                const isPdf = previewFile.type === 'application/pdf' || previewFile.name.toLowerCase().endsWith('.pdf');
                if (!isPdf) return;
                try {
                    GlobalWorkerOptions.workerSrc = pdfjsWorker as string;
                    const arrayBuffer = await previewFile.arrayBuffer();
                    const pdf: PDFDocumentProxy = await getDocument({ data: arrayBuffer }).promise;
                    pdfDocRef.current = pdf;
                    setTotalPages(pdf.numPages);
                    setCurrentPage(1);
                    await renderPdfPage(pdf, 1);
                } catch (e) {
                    console.error(e);
                }
                return;
            }

            // Load PDF from external URL
            if (externalPreviewUrl && previewContentType === 'application/pdf') {
                try {
                    GlobalWorkerOptions.workerSrc = pdfjsWorker as string;
                    const response = await fetch(externalPreviewUrl);
                    const arrayBuffer = await response.arrayBuffer();
                    const pdf: PDFDocumentProxy = await getDocument({ data: arrayBuffer }).promise;
                    pdfDocRef.current = pdf;
                    setTotalPages(pdf.numPages);
                    setCurrentPage(1);
                    await renderPdfPage(pdf, 1);
                } catch (e) {
                    console.error(e);
                }
            }
        };
        loadPdf();
    }, [previewFile, externalPreviewUrl, previewContentType, renderPdfPage]);

    // Re-render when currentPage changes (for navigation)
    useEffect(() => {
        if (pdfDocRef.current && currentPage >= 1 && currentPage <= totalPages) {
            renderPdfPage(pdfDocRef.current, currentPage);
        }
    }, [currentPage, totalPages, renderPdfPage]);

    const goToPreviousPage = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentPage((prev) => Math.max(1, prev - 1));
    }, []);

    const goToNextPage = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            setCurrentPage((prev) => Math.min(totalPages, prev + 1));
        },
        [totalPages]
    );

    const hasPreview = (previewFile && previewUrl) || externalPreviewUrl;

    function getDropzoneContent() {
        if (isDragActive) {
            return (
                <div className="flex flex-col items-center justify-center gap-3 p-6">
                    <div className="rounded-full bg-primary/10 p-4">
                        <svg
                            className="h-8 w-8 text-primary"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-primary">{t('invoiceUpload.dragFile')}</p>
                </div>
            );
        }

        // Handle previewFile (newly uploaded file)
        if (previewFile && previewUrl) {
            const isPdf = previewFile.type === 'application/pdf' || previewFile.name.toLowerCase().endsWith('.pdf');
            if (isPdf) {
                return (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden relative">
                        <canvas ref={canvasRef} className="max-h-full w-auto h-auto object-contain" />
                        {totalPages > 1 && (
                            <PdfPageNavigation currentPage={currentPage} totalPages={totalPages} onPrevious={goToPreviousPage} onNext={goToNextPage} t={t} />
                        )}
                    </div>
                );
            }
            return <img src={previewUrl} alt={previewFile.name} className="max-w-full max-h-full object-contain" />;
        }

        // Handle externalPreviewUrl (loaded from existing document)
        if (externalPreviewUrl) {
            const isPdf = previewContentType === 'application/pdf';
            if (isPdf) {
                return (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden relative">
                        <canvas ref={canvasRef} className="max-h-full w-auto h-auto object-contain" />
                        {totalPages > 1 && (
                            <PdfPageNavigation currentPage={currentPage} totalPages={totalPages} onPrevious={goToPreviousPage} onNext={goToNextPage} t={t} />
                        )}
                    </div>
                );
            }
            return <img src={externalPreviewUrl} alt="document" className="max-w-full max-h-full object-contain" />;
        }

        return (
            <div className="flex flex-col items-center justify-center gap-4 p-6">
                <BunnyIcon />
                <div className="text-center space-y-1.5">
                    <p className="text-base font-semibold text-foreground">{t('invoiceUpload.dragDrop')}</p>
                    <p className="text-xs text-muted-foreground">{t('invoiceUpload.fileType')}</p>
                </div>
                <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-active transition-colors"
                >
                    {t('invoiceUpload.chooseFile')}
                </button>
            </div>
        );
    }

    return (
        <div
            {...getRootProps()}
            className={cn(
                'relative rounded-xl border-2 border-dashed flex flex-col justify-center items-center text-center w-full h-full overflow-hidden cursor-pointer transition-all duration-200',
                hasPreview ? 'bg-white dark:bg-gray-950 border-[#A7A7A7] p-2' : 'bg-white dark:bg-gray-950 border-[#A7A7A7] hover:border-primary/50',
                isHighlightDrop && 'border-primary bg-primary/5 ring-2 ring-primary/20',
                isDragActive && 'border-primary bg-primary/5 scale-[0.99]'
            )}
        >
            <input {...getInputProps()} type="file" />
            {getDropzoneContent()}
        </div>
    );
};

export default memo(InvoiceUploadFormDropzone);
