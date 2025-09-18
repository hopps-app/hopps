import './styles/InvoiceuploadFormDropzone.scss';

import { FC, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, PDFDocumentProxy } from 'pdfjs-dist';
// @ts-expect-error pdfjs-dist types don't export this path string
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker&url';
import { FileWithPath, useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

import save from '@/assets/save.svg';
import Button from '@/components/ui/Button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils.ts';

type InvoiceUploadFormDropzoneProps = {
    onFilesChanged: (file: FileWithPath[]) => void;
    previewFile?: File | null;
};

const InvoiceUploadFormDropzone: FC<InvoiceUploadFormDropzoneProps> = ({ onFilesChanged, previewFile }) => {
    const { t } = useTranslation();
    const { showError } = useToast();

    const [isHighlightDrop, setIsHighlightDrop] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    useEffect(() => {
        onFilesChanged([...acceptedFiles]);
    }, [acceptedFiles]);

    useEffect(() => {
        if (fileRejections.length > 0) {
            fileRejections.forEach(({ errors }) => {
                errors.forEach(() => showError(t('invoiceUpload.fileTooLarge')));
            });
        }
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

    useEffect(() => {
        const renderPdf = async () => {
            if (!previewFile) return;
            const isPdf = previewFile.type === 'application/pdf' || previewFile.name.toLowerCase().endsWith('.pdf');
            if (!isPdf) return;
            try {
                GlobalWorkerOptions.workerSrc = pdfjsWorker as string;
                const arrayBuffer = await previewFile.arrayBuffer();
                const pdf: PDFDocumentProxy = await getDocument({ data: arrayBuffer }).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = canvasRef.current;
                if (!canvas) return;
                const context = canvas.getContext('2d');
                if (!context) return;
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                await page.render({ canvasContext: context, viewport }).promise;
            } catch (e) {
                // ignore rendering errors
            }
        };
        renderPdf();
    }, [previewFile]);

    function getDropzoneText() {
        if (isDragActive) {
            return <p>{t('invoiceUpload.dragFile')}</p>;
        }

        if (previewFile && previewUrl) {
            const isPdf = previewFile.type === 'application/pdf' || previewFile.name.toLowerCase().endsWith('.pdf');
            if (isPdf) {
                return (
                    <div className="w-full h-full flex items-center justify-center bg-white rounded-2xl">
                        <canvas ref={canvasRef} className="max-h-[700px] w-auto h-auto" />
                    </div>
                );
            }
            return <img src={previewUrl} alt={previewFile.name} className="w-full h-[700px] object-contain rounded-2xl bg-white" />;
        }

        return (
            <div className="flex flex-col gap-2 items-center justify-center h-full">
                <img src={save} alt="save" width="83" height="83" />
                <p className="text-[var(--border)]">
                    <b className="font-bold text-xl">{t('invoiceUpload.dragDrop')}</b> <br />{' '}
                    <span className="text-xs font-medium">{t('invoiceUpload.fileType')}</span>
                </p>
                <Button className="min-w-28 px-5 py-2 flex rounded-[0.625rem] items-center h-8 text-md" type="button">
                    {t('invoiceUpload.chooseFile')}
                </Button>
            </div>
        );
    }

    const DropzoneText = getDropzoneText();

    return (
        <div
            {...getRootProps()}
            className={cn(
                'border-2 border-dashed border-gray-400 rounded-lg flex flex-col justify-center items-center dropzone text-center w-full flex-1 min-h-full overflow-hidden bg-background-secondary',
                {
                    'border-gray-400': isHighlightDrop,
                }
            )}
        >
            <input {...getInputProps()} type="file" />
            {DropzoneText}
        </div>
    );
};

export default memo(InvoiceUploadFormDropzone);
