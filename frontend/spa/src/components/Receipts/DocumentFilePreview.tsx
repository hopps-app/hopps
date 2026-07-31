import { DocumentResponse } from '@hopps/api-client';
import { AlertCircle, Download, ExternalLink, FileText, Loader2, Upload, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

import { useReuploadDocumentFile } from '@/hooks/queries/useDocuments';
import { cn } from '@/lib/utils';
import apiService from '@/services/ApiService';

/**
 * Large preview of a document's file (PDF or image) for the receipt detail view. The file is fetched as a blob through
 * the authenticated API client and shown via an object URL — PDFs use the browser's native viewer (scroll / zoom /
 * pages), images can be toggled between fit-to-view and actual size.
 */
export function DocumentFilePreview({ doc, onClose }: { doc: DocumentResponse; onClose?: () => void }) {
    const { t } = useTranslation();
    const [url, setUrl] = useState<string | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading');
    const [zoomed, setZoomed] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const isImage = doc.fileContentType?.startsWith('image/') ?? false;
    const isPdf = doc.fileContentType === 'application/pdf';

    // Re-upload (restore) the file directly at the preview when it is no longer available in storage.
    const reupload = useReuploadDocumentFile();
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: async (acceptedFiles) => {
            const file = acceptedFiles[0];
            if (!file || !doc.id) return;
            await reupload.mutateAsync({ id: doc.id, file });
            setReloadKey((k) => k + 1); // re-fetch the freshly uploaded file
        },
        multiple: false,
        accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
        disabled: reupload.isPending,
    });

    useEffect(() => {
        let objectUrl: string | null = null;
        let cancelled = false;
        setState('loading');
        setZoomed(false);

        if (!doc.id) {
            setState('error');
            return;
        }

        apiService.orgService
            .fileGET(doc.id)
            .then((res) => {
                if (cancelled) return;
                objectUrl = URL.createObjectURL(res.data);
                setUrl(objectUrl);
                setState('ready');
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                const status = (err as { status?: number } | undefined)?.status;
                // 404 = the DB record exists but the stored file is gone (e.g. local storage was reset).
                setState(status === 404 ? 'missing' : 'error');
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            setUrl(null);
        };
    }, [doc.id, reloadKey]);

    const iconBtn = 'w-8 h-8 flex items-center justify-center rounded-lg text-[#6B6B76] hover:text-[#1B1B1F] hover:bg-[#EDEDF0] transition-colors';

    return (
        <div className="flex-1 flex flex-col rounded-2xl overflow-hidden bg-white shadow-2xl border border-[#E9E9EE] pointer-events-auto">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#E9E9EE] bg-[#F8F8FA] flex-shrink-0">
                <span className="flex items-center gap-2 min-w-0">
                    <FileText size={16} className="text-[#7E3FB4] flex-shrink-0" />
                    <span className="text-[13px] font-semibold text-[#1B1B1F] truncate">{doc.fileName}</span>
                </span>
                <span className="flex items-center gap-0.5 flex-shrink-0">
                    {state === 'ready' && url && (
                        <>
                            <button
                                type="button"
                                onClick={() => window.open(url, '_blank', 'noopener')}
                                title={t('receipts.preview.openNewTab')}
                                className={iconBtn}
                            >
                                <ExternalLink size={15} />
                            </button>
                            <a href={url} download={doc.fileName} title={t('receipts.preview.download')} className={iconBtn}>
                                <Download size={15} />
                            </a>
                        </>
                    )}
                    {onClose && (
                        <button type="button" onClick={onClose} title={t('common.close')} aria-label={t('common.close')} className={iconBtn}>
                            <X size={15} />
                        </button>
                    )}
                </span>
            </div>

            {/* Viewer */}
            <div className="flex-1 min-h-0 bg-[#EDEDF0]">
                {state === 'loading' && (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-[#9A9AA3]">
                        <Loader2 size={24} className="animate-spin" />
                        <span className="text-sm">{t('receipts.preview.loading')}</span>
                    </div>
                )}
                {state === 'error' && (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-[#B12C4C]">
                        <AlertCircle size={24} />
                        <span className="text-sm">{t('receipts.preview.error')}</span>
                    </div>
                )}
                {state === 'missing' && (
                    <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center text-[#6B6B76]">
                        <AlertCircle size={24} className="text-[#B47C18]" />
                        <span className="text-sm font-semibold text-[#1B1B1F]">{t('receipts.preview.missingTitle')}</span>
                        <span className="text-[13px] max-w-xs">{t('receipts.preview.missingHint')}</span>
                        <div
                            {...getRootProps()}
                            className={cn(
                                'mt-1 w-full max-w-sm flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-6 cursor-pointer transition-colors select-none',
                                isDragActive ? 'border-[#9955CC] bg-[#F3EAFB]' : 'border-[#D8C4EC] hover:border-[#9955CC] hover:bg-[#FAF6FE]',
                                reupload.isPending && 'opacity-60 pointer-events-none cursor-not-allowed'
                            )}
                        >
                            <input {...getInputProps()} />
                            <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: '#F3EAFB' }}>
                                {reupload.isPending ? (
                                    <Loader2 size={20} className="text-[#7E3FB4] animate-spin" />
                                ) : (
                                    <Upload size={20} className="text-[#7E3FB4]" />
                                )}
                            </span>
                            <span className="text-[13px] font-semibold text-[#7E3FB4]">
                                {reupload.isPending
                                    ? t('receipts.preview.reuploading')
                                    : isDragActive
                                      ? t('receipts.preview.reuploadDrop')
                                      : t('receipts.preview.reupload')}
                            </span>
                        </div>
                    </div>
                )}
                {state === 'ready' && url && isPdf && <iframe src={url} title={doc.fileName} className="w-full h-full border-0" />}
                {state === 'ready' && url && isImage && (
                    <div className="h-full overflow-auto flex items-center justify-center p-4">
                        <img
                            src={url}
                            alt={doc.fileName}
                            onClick={() => setZoomed((z) => !z)}
                            className={cn(zoomed ? 'max-w-none cursor-zoom-out' : 'max-w-full max-h-full object-contain cursor-zoom-in')}
                        />
                    </div>
                )}
                {state === 'ready' && url && !isPdf && !isImage && (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-[#6B6B76]">
                        <FileText size={28} />
                        <span className="text-sm">{t('receipts.preview.unsupported')}</span>
                        <a href={url} download={doc.fileName} className="flex items-center gap-1.5 text-[13px] font-semibold text-[#7E3FB4] hover:underline">
                            <Download size={14} />
                            {t('receipts.preview.download')}
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DocumentFilePreview;
