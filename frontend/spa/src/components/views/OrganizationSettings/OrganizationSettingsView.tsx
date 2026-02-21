import { Edit, Check, RefreshCw, AlertCircle, Info, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { BommelDetailsPanel } from './components';
import { useOrganizationTree, useTreeCalculations, useStatistics } from './hooks';

import { BommelTreeComponent } from '@/components/BommelTreeView';
import OrganizationTree from '@/components/OrganizationStructureTree/OrganizationTree';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import Switch from '@/components/ui/Switch';
import { useMediaQuery } from '@/hooks/use-media-query';
import { usePageTitle } from '@/hooks/use-page-title';

function OrganizationSettingsView() {
    const { t } = useTranslation();
    usePageTitle(t('menu.structure'));
    const [searchParams, setSearchParams] = useSearchParams();
    const bommelId = searchParams.get('bommelId');
    const [isEditMode, setIsEditMode] = useState(false);
    const [isDragDropMode, setIsDragDropMode] = useState(false);
    const [selectedBommel, setSelectedBommel] = useState<OrganizationTreeNodeModel | null>(null);
    const [bommelNotFound, setBommelNotFound] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const initialSelectionDone = useRef(false);

    const isLargeScreen = useMediaQuery('(min-width: 1024px)');

    const { isLoading: isStatsLoading, bommelStats, options: statisticsOptions, setIncludeDrafts, setAggregate } = useStatistics();

    const { isOrganizationError, isLoading, rootBommel, tree, createTreeNode, createChildBommel, updateTreeNode, moveTreeNode, deleteTreeNode } =
        useOrganizationTree({ bommelStats });

    const { countSubBommels } = useTreeCalculations(tree);

    // Deep link: select Bommel from URL parameter when tree is loaded
    useEffect(() => {
        if (!bommelId || tree.length === 0 || isLoading) return;

        const targetId = parseInt(bommelId, 10);
        if (isNaN(targetId)) {
            setBommelNotFound(true);
            return;
        }

        const node = tree.find((n) => n.id === targetId);
        if (node) {
            setSelectedBommel(node);
            setBommelNotFound(false);
            initialSelectionDone.current = true;
        } else {
            setBommelNotFound(true);
            setSelectedBommel(null);
        }
    }, [bommelId, tree, isLoading]);

    // Update selectedBommel when tree changes (e.g., when statistics options change)
    // Using selectedBommel?.id instead of selectedBommel to avoid infinite loops
    useEffect(() => {
        if (selectedBommel) {
            const updatedBommel = tree.find((n) => n.id === selectedBommel.id);
            if (updatedBommel) {
                setSelectedBommel(updatedBommel);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tree, selectedBommel?.id]);

    // Update URL when Bommel is selected (by user click, not initial URL load)
    const selectBommelAndUpdateUrl = useCallback(
        (node: OrganizationTreeNodeModel | null) => {
            setSelectedBommel(node);
            setBommelNotFound(false);
            if (node) {
                setSearchParams({ bommelId: String(node.id) }, { replace: true });
            } else {
                setSearchParams({}, { replace: true });
            }
        },
        [setSearchParams]
    );

    const handleBommelSelect = useCallback(
        (nodeId: number) => {
            const node = tree.find((n) => n.id === nodeId);
            selectBommelAndUpdateUrl(node || null);
        },
        [tree, selectBommelAndUpdateUrl]
    );

    const handleNavigateToReceipts = useCallback(() => {
        // TODO: Navigate to receipts page with selected bommel filter
        console.log('Navigate to receipts with bommel:', selectedBommel);
    }, [selectedBommel]);

    const handleTreeNodeClick = useCallback(
        (nodeData: { attributes?: { id?: number } }) => {
            const node = tree.find((n) => n.id === nodeData.attributes?.id);
            selectBommelAndUpdateUrl(node || null);
        },
        [tree, selectBommelAndUpdateUrl]
    );

    const handleEdit = useCallback(
        async (nodeId: number, newName: string, newEmoji?: string) => {
            const node = tree.find((n) => n.id === nodeId);
            if (node) {
                const updatedNode = {
                    ...node,
                    text: newName,
                    data: {
                        ...node.data,
                        emoji: newEmoji || node.data?.emoji || '',
                    },
                };
                return await updateTreeNode(updatedNode);
            }
            return false;
        },
        [tree, updateTreeNode]
    );

    const handleDelete = useCallback(
        async (nodeId: number) => {
            return await deleteTreeNode(nodeId);
        },
        [deleteTreeNode]
    );

    const handleAddChild = useCallback(
        async (nodeId: number) => {
            return await createChildBommel(nodeId);
        },
        [createChildBommel]
    );

    const handleMove = useCallback(
        async (nodeId: number, newParentId: number) => {
            const node = tree.find((n) => n.id === nodeId);
            if (node) {
                const movedNode = {
                    ...node,
                    parent: newParentId,
                };
                return await moveTreeNode(movedNode);
            }
            return false;
        },
        [tree, moveTreeNode]
    );

    if (isOrganizationError) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="rounded-full bg-destructive/10 p-3">
                    <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>
                <p className="text-destructive font-medium">{t('organization.settings.error')}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted"
                    data-testid="structure-retry-button"
                >
                    <RefreshCw className="h-4 w-4" />
                    {t('errors.api.retry')}
                </button>
            </div>
        );
    }

    return (
        <>
            {(isLoading || isStatsLoading) && <LoadingOverlay />}

            <div className="h-full flex flex-col">
                <div className={`grid grid-cols-1 ${isSidebarOpen ? 'xl:grid-cols-4' : 'xl:grid-cols-1'} gap-6 flex-1 min-h-0`}>
                    {/* Left Side - Structure Views */}
                    <div className={`${isSidebarOpen ? 'xl:col-span-3' : 'xl:col-span-1'} flex flex-col min-h-0`}>
                        <div className="flex items-center justify-end mb-4 flex-shrink-0">
                            <div className="flex items-center gap-4">
                                {!isEditMode && (
                                    <>
                                        <Switch
                                            label={t('organization.structure.includeDrafts')}
                                            checked={statisticsOptions.includeDrafts}
                                            onCheckedChange={setIncludeDrafts}
                                        />
                                        <Switch
                                            label={t('organization.structure.aggregate')}
                                            checked={statisticsOptions.aggregate}
                                            onCheckedChange={setAggregate}
                                        />
                                    </>
                                )}
                                {isEditMode && (
                                    <>
                                        {isDragDropMode && (
                                            <span className="text-sm text-blue-600 flex items-center gap-1.5">
                                                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                                                {t('organization.structure.dragDropHint')}
                                            </span>
                                        )}
                                        <Switch label={t('organization.structure.dragDrop')} checked={isDragDropMode} onCheckedChange={setIsDragDropMode} />
                                    </>
                                )}
                                <Button
                                    variant={isEditMode ? 'default' : 'outline'}
                                    onClick={() => {
                                        const newEditMode = !isEditMode;
                                        setIsEditMode(newEditMode);
                                        if (!newEditMode) setIsDragDropMode(false);
                                    }}
                                >
                                    {isEditMode ? (
                                        <>
                                            <Check className="w-4 h-4 mr-2" />
                                            {t('organization.structure.done')}
                                        </>
                                    ) : (
                                        <>
                                            <Edit className="w-4 h-4 mr-2" />
                                            {t('organization.structure.edit')}
                                        </>
                                    )}
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                    className="hidden xl:flex items-center justify-center p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    title={isSidebarOpen ? t('organization.structure.details.hideDetails') : t('organization.structure.details.showDetails')}
                                    aria-label={
                                        isSidebarOpen ? t('organization.structure.details.hideDetails') : t('organization.structure.details.showDetails')
                                    }
                                >
                                    {isSidebarOpen ? (
                                        <PanelRightClose className="w-4 h-4 text-gray-600" />
                                    ) : (
                                        <PanelRightOpen className="w-4 h-4 text-gray-600" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {isLargeScreen ? (
                            <div className="flex-1 min-h-0">
                                <BommelTreeComponent
                                    key={`tree-${statisticsOptions.includeDrafts}-${statisticsOptions.aggregate}`}
                                    tree={tree}
                                    rootBommel={rootBommel}
                                    editable={isEditMode}
                                    dragDropEnabled={isDragDropMode}
                                    onNodeClick={handleTreeNodeClick}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onAddChild={handleAddChild}
                                    onMove={handleMove}
                                />
                            </div>
                        ) : (
                            <OrganizationTree
                                tree={tree}
                                editable={isEditMode}
                                selectable={true}
                                createNode={createTreeNode}
                                updateNode={updateTreeNode}
                                deleteNode={deleteTreeNode}
                                moveNode={moveTreeNode}
                                onSelect={handleBommelSelect}
                            />
                        )}
                    </div>

                    {/* Right Side - Selected Bommel Details */}
                    {isSidebarOpen && (
                        <div className="xl:col-span-1">
                            {bommelNotFound ? (
                                <Card className="sticky top-6 bg-white">
                                    <CardContent className="py-8 text-center space-y-4">
                                        <div className="rounded-full bg-destructive/10 p-3 mx-auto w-fit">
                                            <AlertCircle className="h-6 w-6 text-destructive" />
                                        </div>
                                        <div>
                                            <p className="text-destructive font-medium">{t('organization.structure.details.bommelNotFound')}</p>
                                            <p className="text-sm text-gray-500 mt-1">{t('organization.structure.details.bommelNotFoundDescription')}</p>
                                        </div>
                                        <Button variant="outline" onClick={() => setSearchParams({}, { replace: true })}>
                                            {t('organization.structure.details.backToStructure')}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <BommelDetailsPanel
                                    selectedBommel={selectedBommel}
                                    subBommelsCount={selectedBommel ? countSubBommels(selectedBommel) : 0}
                                    onNavigateToReceipts={handleNavigateToReceipts}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default OrganizationSettingsView;
