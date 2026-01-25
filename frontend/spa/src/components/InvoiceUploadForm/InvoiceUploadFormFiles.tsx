import { memo } from 'react';
import { FileWithPath } from 'react-dropzone';

import InvoiceUploadFormDropzone from './InvoiceUploadFormDropzone';

import List from '@/components/ui/List/List';

type Props = {
    selectedFiles: FileWithPath[];
    fileProgress: Record<string, number>;
    onFilesChanged: (files: FileWithPath[]) => void;
    onClickRemoveSelected: (index: number) => void;
};

const InvoiceUploadFormFiles = ({ selectedFiles, fileProgress, onFilesChanged, onClickRemoveSelected }: Props) => (
    <>
        <InvoiceUploadFormDropzone onFilesChanged={onFilesChanged} />
        <List
            items={selectedFiles.map((file, index) => ({
                title: file.name,
                id: file.name + index,
                progress: fileProgress[file.name] || 0,
                icon: 'File',
                iconSize: 'md',
            }))}
            isRemovableListItem={true}
            className="gap-2"
            onClickRemove={onClickRemoveSelected}
        />
    </>
);

export default memo(InvoiceUploadFormFiles);
