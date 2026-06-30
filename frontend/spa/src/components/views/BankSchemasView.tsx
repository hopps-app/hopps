import { BankCsvSchemaResponse } from '@hopps/api-client';
import { Archive, Edit, Plus, RotateCcw, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { SchemaForm } from '@/components/BankAccounts/SchemaForm';
import Button from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { usePageTitle } from '@/hooks/use-page-title';
import {
    useBankSchemas,
    useDeleteBankSchema,
    useArchiveBankSchema,
    useRestoreBankSchema,
} from '@/hooks/queries/useBankAccounts';
import { cn } from '@/lib/utils';

function SchemaRow({
    schema,
    onEdit,
    onRefresh,
}: {
    schema: BankCsvSchemaResponse;
    onEdit: () => void;
    onRefresh: () => void;
}) {
    const { t } = useTranslation();
    const deleteMutation = useDeleteBankSchema();
    const archiveMutation = useArchiveBankSchema();
    const restoreMutation = useRestoreBankSchema();
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    const handleDelete = async () => {
        if (!schema.id) return;
        await deleteMutation.mutateAsync(schema.id);
        setConfirmDeleteOpen(false);
        onRefresh();
    };

    const handleArchive = async () => {
        if (!schema.id) return;
        await archiveMutation.mutateAsync(schema.id);
        onRefresh();
    };

    const handleRestore = async () => {
        if (!schema.id) return;
        await restoreMutation.mutateAsync(schema.id);
        onRefresh();
    };

    const isLoading = deleteMutation.isPending || archiveMutation.isPending || restoreMutation.isPending;

    return (
        <div
            className={cn(
                'flex items-center justify-between p-4 border rounded-xl bg-white dark:bg-gray-800 transition-all',
                schema.archived ? 'opacity-60 border-dashed' : 'border-gray-200 dark:border-gray-700'
            )}
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{schema.name}</span>
                    {schema.archived && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {t('bankSchema.archived')}
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    {schema.bankIdentifier && <span>{schema.bankIdentifier}</span>}
                    {schema.delimiter && (
                        <span>{t('bankSchema.card.delimiter')}: <code>{schema.delimiter}</code></span>
                    )}
                    {schema.encoding && <span>{schema.encoding}</span>}
                    {schema.amountStrategy && (
                        <span>{t(`bankSchema.amountStrategy.${schema.amountStrategy}`)}</span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {(
                    <>
                        {schema.archived ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRestore}
                                disabled={isLoading}
                                title={t('bankSchema.restore')}
                            >
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onEdit}
                                    disabled={isLoading}
                                    title={t('common.edit')}
                                >
                                    <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleArchive}
                                    disabled={isLoading}
                                    title={t('bankSchema.archive')}
                                >
                                    <Archive className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setConfirmDeleteOpen(true)}
                                    disabled={isLoading}
                                    title={t('common.delete')}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </>
                        )}
                    </>
                )}
            </div>

            <ConfirmDialog
                open={confirmDeleteOpen}
                onOpenChange={setConfirmDeleteOpen}
                title={t('bankSchema.deleteTitle')}
                description={t('bankSchema.deleteConfirm', { name: schema.name })}
                confirmLabel={t('common.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={handleDelete}
                destructive
                loading={deleteMutation.isPending}
            />
        </div>
    );
}

export function BankSchemasView() {
    const { t } = useTranslation();
    usePageTitle(t('bankSchema.title'), 'Gear');
    const [showArchived, setShowArchived] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [editSchema, setEditSchema] = useState<BankCsvSchemaResponse | null>(null);

    const { data: schemas = [], isLoading, refetch } = useBankSchemas(showArchived);

    // All schemas returned here are user schemas (system templates come from useBankSchemaTemplates separately)
    const userSchemas = schemas;

    return (
        <div className="flex flex-col gap-6 max-w-screen-lg">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <p className="text-muted-foreground text-sm">{t('bankSchema.subtitle')}</p>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowArchived((p) => !p)}
                        className={cn(
                            'text-sm px-3 py-1.5 rounded-lg border transition-colors',
                            showArchived
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-gray-300 text-gray-600 hover:border-gray-400'
                        )}
                    >
                        {showArchived ? t('bankSchema.hideArchived') : t('bankSchema.showArchived')}
                    </button>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-1" />
                        {t('bankSchema.newSchema')}
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="py-12"><LoadingState size="lg" /></div>
            ) : (
                <div className="space-y-6">
                    {/* User schemas */}
                    {userSchemas.length === 0 && !isLoading ? (
                        <EmptyState
                            title={t('bankSchema.emptyState.title')}
                            description={t('bankSchema.emptyState.description')}
                            icon={Settings}
                            action={{ label: t('bankSchema.newSchema'), onClick: () => setCreateOpen(true) }}
                        />
                    ) : (
                        <div className="space-y-3">
                            {userSchemas.map((schema) => (
                                <SchemaRow
                                    key={schema.id}
                                    schema={schema}
                                    onEdit={() => setEditSchema(schema)}
                                    onRefresh={refetch}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Create dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('bankSchema.form.createTitle')}</DialogTitle>
                    </DialogHeader>
                    <SchemaForm
                        onSuccess={() => {
                            refetch();
                            setCreateOpen(false);
                        }}
                        onCancel={() => setCreateOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Edit dialog */}
            <Dialog open={!!editSchema} onOpenChange={(o) => !o && setEditSchema(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('bankSchema.form.editTitle')}</DialogTitle>
                    </DialogHeader>
                    {editSchema && (
                        <SchemaForm
                            schema={editSchema}
                            onSuccess={() => {
                                refetch();
                                setEditSchema(null);
                            }}
                            onCancel={() => setEditSchema(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default BankSchemasView;
