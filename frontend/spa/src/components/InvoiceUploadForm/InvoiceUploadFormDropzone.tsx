import React, { useCallback, useEffect, useState } from 'react';
import { FileWithPath, useDropzone } from 'react-dropzone';

import { cn } from '@/lib/utils.ts';

interface Props {
    onFilesChanged: (file: FileWithPath[]) => void;
}

const InvoiceUploadFormDropzone: React.FC<Props> = (props: Props) => {
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
    const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
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
    });
    const isAnyFileSelected = acceptedFiles.length > 0;

    useEffect(() => {
        props.onFilesChanged(acceptedFiles);
    }, [acceptedFiles]);

    function getDropzoneText() {
        if (isDragActive) {
            return <p>Drop the files here...</p>;
        }

        if (isAnyFileSelected) {
            return <p>{acceptedFiles[0].name}</p>;
        }

        return <p>Drag 'n' drop some files here, or click to select files</p>;
    }

    const DropzoneText = getDropzoneText();

    return (
        <div
            {...getRootProps()}
            className={cn('flex flex-col justify-center border-4 border-dashed border-gray-400 p-6 rounded-md text-center min-h-72', {
                'border-primary': isHighlightDrop,
            })}
        >
            <input {...getInputProps()} />
            {DropzoneText}
        </div>
    );
};

export default InvoiceUploadFormDropzone;
