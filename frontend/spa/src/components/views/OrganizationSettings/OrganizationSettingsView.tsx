import { Network, Grid3x3, Edit, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';

import { BommelDetailsPanel, EditModeBanner, OrganizationStats } from './components';
import { useOrganizationTree, useTreeCalculations, useStatistics } from './hooks';

import { BommelTreeComponent } from '@/components/BommelTreeView';
import OrganizationTree from '@/components/OrganizationStructureTree/OrganizationTree';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import Switch from '@/components/ui/Switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

function OrganizationSettingsView() {
    const { t } = useTranslation();
    const { bommelId } = useParams<{ bommelId: string }>();
    const navigate = useNavigate();
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedBommel, setSelectedBommel] = useState<OrganizationTreeNodeModel | null>(null);
    const [bommelNotFound, setBommelNotFound] = useState(false);
    const initialSelectionDone = useRef(false);

    const { isLoading: isStatsLoading, organizationStats, bommelStats, options: statisticsOptions, setIncludeDrafts, setAggregate } = useStatistics();

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
                navigate(`/structure/${node.id}`, { replace: true });
            } else {
                navigate('/structure', { replace: true });
            }
        },
        [navigate]
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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

            <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    {/* Left Side - Structure Views */}
                    <div className="xl:col-span-3 space-y-6">
                        <OrganizationStats
                            totalBommels={organizationStats?.totalBommels ?? 0}
                            total={organizationStats?.total ?? 0}
                            income={organizationStats?.income ?? 0}
                            expenses={organizationStats?.expenses ?? 0}
                            totalTransactions={organizationStats?.transactionsCount ?? 0}
                        />

                        <Tabs defaultValue="tree" className="w-full">
                            <div className="flex items-center justify-between mb-4">
                                <TabsList className="grid grid-cols-2 w-auto">
                                    <TabsTrigger value="tree" className="flex items-center gap-2">
                                        <Network className="w-4 h-4" />
                                        {t('organization.structure.treeView')}
                                    </TabsTrigger>
                                    <TabsTrigger value="table" className="flex items-center gap-2">
                                        <Grid3x3 className="w-4 h-4" />
                                        {t('organization.structure.tableView')}
                                    </TabsTrigger>
                                </TabsList>

                                <div className="flex items-center gap-4">
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
                                    <Button variant={isEditMode ? 'default' : 'outline'} onClick={() => setIsEditMode(!isEditMode)}>
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
                                </div>
                            </div>

                            <TabsContent value="tree" className="mt-0">
                                {isEditMode && <EditModeBanner />}
                                <BommelTreeComponent
                                    key={`tree-${statisticsOptions.includeDrafts}-${statisticsOptions.aggregate}`}
                                    tree={tree}
                                    rootBommel={rootBommel}
                                    editable={isEditMode}
                                    width={1200}
                                    height={600}
                                    onNodeClick={handleTreeNodeClick}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onAddChild={handleAddChild}
                                    onMove={handleMove}
                                />
                            </TabsContent>

                            <TabsContent value="table" className="mt-0">
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
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Right Side - Selected Bommel Details */}
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
                                    <Button variant="outline" onClick={() => navigate('/structure', { replace: true })}>
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
                </div>
            </div>
        </>
    );
}

export default OrganizationSettingsView;
