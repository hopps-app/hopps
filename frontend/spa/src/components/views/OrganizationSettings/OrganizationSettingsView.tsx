import { Network, Grid3x3, Edit, Check } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { BommelDetailsPanel, EditModeBanner, OrganizationStats } from './components';
import { useOrganizationTree, useTreeCalculations } from './hooks';

import { BommelTreeComponent } from '@/components/BommelTreeView';
import OrganizationTree from '@/components/OrganizationStructureTree/OrganizationTree';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel';
import Button from '@/components/ui/Button';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

function OrganizationSettingsView() {
    const { t } = useTranslation();
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedBommel, setSelectedBommel] = useState<OrganizationTreeNodeModel | null>(null);

    const { isOrganizationError, isLoading, rootBommel, tree, createTreeNode, createChildBommel, updateTreeNode, moveTreeNode, deleteTreeNode } =
        useOrganizationTree();

    const { countTotalBommels, calculateTotalIncome, calculateTotalExpenses, calculateTotalReceipts, countSubBommels } = useTreeCalculations(tree);

    const handleBommelSelect = useCallback(
        (nodeId: number) => {
            const node = tree.find((n) => n.id === nodeId);
            setSelectedBommel(node || null);
        },
        [tree]
    );

    const handleNavigateToReceipts = useCallback(() => {
        // TODO: Navigate to receipts page with selected bommel filter
        console.log('Navigate to receipts with bommel:', selectedBommel);
    }, [selectedBommel]);

    const handleTreeNodeClick = useCallback(
        (nodeData: { attributes?: { id?: number } }) => {
            const node = tree.find((n) => n.id === nodeData.attributes?.id);
            setSelectedBommel(node || null);
        },
        [tree]
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

    if (isOrganizationError) {
        return <div className="p-6">{t('organization.settings.error')}</div>;
    }

    return (
        <>
            {isLoading && <LoadingOverlay />}

            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Side - Structure Views */}
                    <div className="lg:col-span-3 space-y-6">
                        <OrganizationStats
                            totalBommels={countTotalBommels}
                            totalIncome={calculateTotalIncome}
                            totalExpenses={calculateTotalExpenses}
                            totalReceipts={calculateTotalReceipts}
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

                            <TabsContent value="tree" className="mt-0">
                                {isEditMode && <EditModeBanner />}
                                <BommelTreeComponent
                                    tree={tree}
                                    rootBommel={rootBommel}
                                    editable={isEditMode}
                                    width={1200}
                                    height={600}
                                    onNodeClick={handleTreeNodeClick}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onAddChild={handleAddChild}
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
                    <div className="lg:col-span-1">
                        <BommelDetailsPanel
                            selectedBommel={selectedBommel}
                            subBommelsCount={selectedBommel ? countSubBommels(selectedBommel) : 0}
                            onNavigateToReceipts={handleNavigateToReceipts}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

export default OrganizationSettingsView;
