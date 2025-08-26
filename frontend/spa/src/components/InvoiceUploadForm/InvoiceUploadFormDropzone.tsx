import './styles/InvoiceuploadFormDropzone.scss';

import { FC, memo, useCallback, useEffect, useState } from 'react';
import { FileWithPath, useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

import save from '@/assets/save.svg';
import Button from '@/components/ui/Button.tsx';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils.ts';

type InvoiceUploadFormDropzoneProps = {
    onFilesChanged: (file: FileWithPath[]) => void;
};

const InvoiceUploadFormDropzone: FC<InvoiceUploadFormDropzoneProps> = ({ onFilesChanged }) => {
    const { t } = useTranslation();
    const { showError } = useToast();

    const [isHighlightDrop, setIsHighlightDrop] = useState(false);

    const onDrop = useCallback(() => {
        setIsHighlightDrop(false);
    }, []);

    const onDragEnter = useCallback(() => {
        setIsHighlightDrop(true);
    }, []);

    const onDragLeave = useCallback(() => {
        setIsHighlightDrop(false);
    }, []);

    const onDragOver = useCallback(() => {}, []);

    const { getRootProps, getInputProps, isDragActive, acceptedFiles, fileRejections } = useDropzone({
        accept: {
            'image/png': ['.png'],
            'image/jpeg': ['.jpeg', '.jpg'],
            'application/pdf': ['.pdf'],
        },
        multiple: false,
        onDragEnter,
        onDragLeave,
        onDragOver,
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

    function getDropzoneText() {
        if (isDragActive) {
            return <p>{t('invoiceUpload.dragFile')}</p>;
        }

        return (
            <div className="flex flex-col gap-2 items-center">
                <img src={save} alt="save" width="83" height="83" />
                <p className="text-[var(--border)]">
                    <b className="font-bold text-xl">{t('invoiceUpload.dragDrop')}</b> <br />{' '}
                    <span className="text-xs font-medium">{t('invoiceUpload.fileType')}</span>
                </p>
                <Button className="min-w-28 px-5 py-2 flex rounded-[0.625rem] items-center h-8 text-md" type='button'>{t('invoiceUpload.chooseFile')}</Button>
            </div>
        );
    }

    const DropzoneText = getDropzoneText();

    return (
        <div
            {...getRootProps()}
            className={cn(
                'border-2 border-dashed border-gray-400 rounded-lg flex flex-col justify-center items-center dropzone text-center w-full flex-1 h-[650px]',
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
