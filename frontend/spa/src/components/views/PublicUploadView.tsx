import { ApiException } from '@hopps/api-client';
import { useQuery } from '@tanstack/react-query';
import { Camera, CheckCircle2, FileText, Image as ImageIcon, Loader2, Upload, X, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import LegalFooter from '@/components/common/LegalFooter/LegalFooter';
import { LoadingState } from '@/components/common/LoadingState';
import Button from '@/components/ui/Button';
import Emoji from '@/components/ui/Emoji';
import { Label } from '@/components/ui/Label';
import Switch from '@/components/ui/Switch';
import TextField from '@/components/ui/TextField';
import apiService from '@/services/ApiService';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
// Remembered on the device, so someone submitting regularly does not type their name every time.
const NAME_STORAGE_KEY = 'hopps.publicUpload.name';

type FileStatus = 'pending' | 'uploading' | 'done' | 'error';

interface QueuedFile {
    id: string;
    file: File;
    status: FileStatus;
    errorKey?: string;
}

function storedName(): string {
    try {
        return localStorage.getItem(NAME_STORAGE_KEY) ?? '';
    } catch {
        return '';
    }
}

function rememberName(name: string) {
    try {
        localStorage.setItem(NAME_STORAGE_KEY, name);
    } catch {
        // private mode: nothing to remember
    }
}

/** HTTP status of a failed api-client call, 0 for anything else (isApiException itself throws on null). */
function apiStatus(error: unknown): number {
    return error != null && ApiException.isApiException(error) ? error.status : 0;
}

function errorKeyFor(error: unknown): string {
    switch (apiStatus(error)) {
        case 409:
            return 'publicUpload.errors.duplicate';
        case 413:
            return 'publicUpload.errors.tooLarge';
        case 415:
            return 'publicUpload.errors.fileType';
        case 429:
            return 'publicUpload.errors.rateLimit';
        case 404:
        case 410:
            return 'publicUpload.errors.linkInvalid';
        default:
            return 'publicUpload.errors.generic';
    }
}

/**
 * Public page behind a bommel's upload link: anyone with the link submits receipts for the bommel without an
 * account. Mobile first: take a photo or pick files, enter a name, send.
 */
export function PublicUploadView() {
    const { t } = useTranslation();
    const { token = '' } = useParams<{ token: string }>();
    const cameraInput = useRef<HTMLInputElement>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    const [name, setName] = useState(storedName);
    const [comment, setComment] = useState('');
    const [privatelyPaid, setPrivatelyPaid] = useState(false);
    const [files, setFiles] = useState<QueuedFile[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [nameError, setNameError] = useState(false);

    const info = useQuery({
        queryKey: ['public-upload-link', token],
        queryFn: () => apiService.orgService.getPublicUploadLink(token),
        retry: false,
    });
    const bommelName = info.data?.bommelName;
    useEffect(() => {
        document.title = bommelName ? t('publicUpload.pageTitle', { name: bommelName }) : t('publicUpload.title');
    }, [bommelName, t]);

    const addFiles = (list: FileList | null) => {
        if (!list) return;
        const added = Array.from(list).map((file) => ({
            id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
            file,
            status: ACCEPTED_TYPES.includes(file.type) ? ('pending' as const) : ('error' as const),
            errorKey: ACCEPTED_TYPES.includes(file.type) ? undefined : 'publicUpload.errors.fileType',
        }));
        setFiles((prev) => [...prev, ...added]);
    };

    const setStatus = (id: string, status: FileStatus, errorKey?: string) =>
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status, errorKey } : f)));

    const submit = async () => {
        const submitter = name.trim();
        if (!submitter) {
            setNameError(true);
            return;
        }
        rememberName(submitter);
        setSubmitting(true);
        let allDone = true;
        // One request per file, so a duplicate or a wrong type only fails that file.
        for (const queued of files.filter((f) => f.status === 'pending' || f.status === 'error')) {
            if (!ACCEPTED_TYPES.includes(queued.file.type)) {
                allDone = false;
                continue;
            }
            setStatus(queued.id, 'uploading');
            try {
                await apiService.orgService.submitPublicReceipt(
                    token,
                    { data: queued.file, fileName: queued.file.name },
                    submitter,
                    comment.trim() || undefined,
                    privatelyPaid
                );
                setStatus(queued.id, 'done');
            } catch (error) {
                allDone = false;
                setStatus(queued.id, 'error', errorKeyFor(error));
            }
        }
        setSubmitting(false);
        if (allDone) setSubmitted(true);
    };

    const startOver = () => {
        setFiles([]);
        setComment('');
        setPrivatelyPaid(false);
        setSubmitted(false);
    };

    const sendable = files.some((f) => f.status === 'pending' || (f.status === 'error' && ACCEPTED_TYPES.includes(f.file.type)));
    const doneCount = files.filter((f) => f.status === 'done').length;
    const linkStatus = apiStatus(info.error);

    return (
        <div className="flex min-h-screen flex-col bg-[var(--background-primary)]">
            <div className="mx-auto w-full max-w-lg flex-1 px-4 py-6 sm:py-10">
                <img src="/logo3.svg" alt="hopps" className="mb-6 h-8 w-auto" />

                {info.isLoading && <LoadingState className="py-12" />}

                {info.isError && (
                    <div className="rounded-2xl bg-[var(--background-secondary)] p-6 text-center shadow-card">
                        <XCircle className="mx-auto mb-3 text-[var(--negative)]" size={40} />
                        <h1 className="mb-2 text-xl font-semibold">{linkStatus === 410 ? t('publicUpload.expired.title') : t('publicUpload.invalid.title')}</h1>
                        <p className="text-sm text-muted-foreground">{linkStatus === 410 ? t('publicUpload.expired.text') : t('publicUpload.invalid.text')}</p>
                    </div>
                )}

                {info.data && submitted && (
                    <div className="rounded-2xl bg-[var(--background-secondary)] p-6 text-center shadow-card">
                        <CheckCircle2 className="mx-auto mb-3 text-[var(--positive)]" size={44} />
                        <h1 className="mb-2 text-xl font-semibold">{t('publicUpload.success.title')}</h1>
                        <p className="mb-6 text-sm text-muted-foreground">
                            {t('publicUpload.success.text', { count: doneCount, bommel: info.data.bommelName })}
                        </p>
                        <Button className="w-full" onClick={startOver}>
                            {t('publicUpload.success.more')}
                        </Button>
                    </div>
                )}

                {info.data && !submitted && (
                    <div className="space-y-5">
                        <div className="rounded-2xl bg-[var(--background-secondary)] p-5 shadow-card">
                            <p className="text-sm text-muted-foreground">{info.data.organizationName}</p>
                            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
                                {info.data.bommelEmoji && <Emoji emoji={info.data.bommelEmoji} className="text-2xl" />}
                                {info.data.bommelName}
                            </h1>
                            <p className="mt-2 text-sm text-muted-foreground">{t('publicUpload.intro')}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => cameraInput.current?.click()}
                                className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[var(--purple-300,#c4b5fd)] bg-[var(--background-secondary)] px-3 py-5 text-sm font-semibold text-foreground active:scale-[0.98]"
                            >
                                <Camera size={28} className="text-purple-700 dark:text-purple-300" />
                                {t('publicUpload.takePhoto')}
                            </button>
                            <button
                                type="button"
                                onClick={() => fileInput.current?.click()}
                                className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[var(--purple-300,#c4b5fd)] bg-[var(--background-secondary)] px-3 py-5 text-sm font-semibold text-foreground active:scale-[0.98]"
                            >
                                <Upload size={28} className="text-purple-700 dark:text-purple-300" />
                                {t('publicUpload.chooseFiles')}
                            </button>
                        </div>
                        <input
                            ref={cameraInput}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                                addFiles(e.target.files);
                                e.target.value = '';
                            }}
                        />
                        <input
                            ref={fileInput}
                            type="file"
                            accept={ACCEPTED_TYPES.join(',')}
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                addFiles(e.target.files);
                                e.target.value = '';
                            }}
                        />
                        <p className="-mt-2 text-center text-xs text-muted-foreground">{t('publicUpload.allowedTypes')}</p>

                        {files.length > 0 && (
                            <ul className="space-y-2">
                                {files.map((f) => (
                                    <li key={f.id} className="flex items-center gap-3 rounded-xl bg-[var(--background-secondary)] px-3 py-2.5 shadow-card">
                                        {f.file.type === 'application/pdf' ? (
                                            <FileText size={20} className="shrink-0 text-muted-foreground" />
                                        ) : (
                                            <ImageIcon size={20} className="shrink-0 text-muted-foreground" />
                                        )}
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm">{f.file.name}</span>
                                            {f.status === 'error' && f.errorKey && (
                                                <span className="block text-xs text-[var(--negative)]">{t(f.errorKey)}</span>
                                            )}
                                        </span>
                                        {f.status === 'uploading' && <Loader2 size={18} className="shrink-0 animate-spin text-muted-foreground" />}
                                        {f.status === 'done' && <CheckCircle2 size={18} className="shrink-0 text-[var(--positive)]" />}
                                        {(f.status === 'pending' || f.status === 'error') && !submitting && (
                                            <button
                                                type="button"
                                                onClick={() => setFiles((prev) => prev.filter((p) => p.id !== f.id))}
                                                aria-label={t('publicUpload.removeFile')}
                                                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-[var(--surface-track)]"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="space-y-4 rounded-2xl bg-[var(--background-secondary)] p-5 shadow-card">
                            <TextField
                                label={t('publicUpload.name')}
                                required
                                value={name}
                                maxLength={255}
                                autoComplete="name"
                                error={nameError ? t('publicUpload.nameRequired') : undefined}
                                onValueChange={(value) => {
                                    setName(value);
                                    if (value.trim()) setNameError(false);
                                }}
                            />
                            <div className="grid gap-1.5">
                                <Label htmlFor="public-upload-comment">{t('publicUpload.comment')}</Label>
                                <textarea
                                    id="public-upload-comment"
                                    value={comment}
                                    maxLength={2000}
                                    rows={3}
                                    placeholder={t('publicUpload.commentPlaceholder')}
                                    onChange={(e) => setComment(e.target.value)}
                                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <Switch label={t('publicUpload.privatelyPaid')} checked={privatelyPaid} onCheckedChange={setPrivatelyPaid} />
                        </div>

                        <Button className="w-full" onClick={submit} disabled={!sendable || submitting}>
                            {submitting && <Loader2 size={16} className="animate-spin" />}
                            {t('publicUpload.submit', { count: Math.max(1, files.filter((f) => f.status !== 'done').length) })}
                        </Button>
                    </div>
                )}
            </div>
            <LegalFooter />
        </div>
    );
}

export default PublicUploadView;
