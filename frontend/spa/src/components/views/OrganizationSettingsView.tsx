import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bommel } from '@hopps/api-client';
import { Network, Grid3x3, Edit, Check } from 'lucide-react';

import OrganizationTree from '@/components/OrganizationStructureTree/OrganizationTree.tsx';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel.ts';
import { BommelTreeComponent } from '@/components/BommelTreeView';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay.tsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Emoji from '@/components/ui/Emoji.tsx';
import { useToast } from '@/hooks/use-toast.ts';
import apiService from '@/services/ApiService.ts';
import organizationTreeService from '@/services/OrganisationTreeService.ts';
import { useStore } from '@/store/store.ts';

function OrganizationSettingsView() {
    const { t } = useTranslation();
    const { showError } = useToast();
    const store = useStore();
    const [isOrganizationError, setIsOrganizationError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [rootBommel, setRootBommel] = useState<Bommel | null>(null);
    const [tree, setTree] = useState<OrganizationTreeNodeModel[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedBommel, setSelectedBommel] = useState<OrganizationTreeNodeModel | null>(null);

    const loadTree = async () => {
        const bommels = await organizationTreeService.getOrganizationBommels(rootBommel!.id!);
        const nodes = organizationTreeService.bommelsToTreeNodes(bommels, rootBommel!.id);

        // Add mock data for demonstration
        const nodesWithMockData = nodes
            .map((node) => {
                // Generate different mock data based on depth/position
                const depth = getNodeDepth(node, nodes);
                const baseMultiplier = Math.max(1, 5 - depth);

                return {
                    ...node,
                    data: {
                        ...node.data,
                        emoji: node.data?.emoji || '',
                        receiptsCount: Math.floor(Math.random() * 50 + 10) * baseMultiplier,
                        receiptsOpen: Math.floor(Math.random() * 10),
                        subBommelsCount: nodes.filter((n) => n.parent === node.id).length,
                        income: Math.floor(Math.random() * 3000 + 1000) * baseMultiplier,
                        expenses: -Math.floor(Math.random() * 200 + 50) * baseMultiplier,
                        revenue: 0, // Will be calculated
                    },
                };
            })
            .map((node) => ({
                ...node,
                data: {
                    ...node.data!,
                    revenue: (node.data!.income || 0) + (node.data!.expenses || 0),
                },
            }));

        setTree(nodesWithMockData);
    };

    const getNodeDepth = (node: OrganizationTreeNodeModel, allNodes: OrganizationTreeNodeModel[]): number => {
        let depth = 0;
        let currentNode = node;
        while (currentNode.parent && currentNode.parent !== 0) {
            depth++;
            const parentNode = allNodes.find((n) => n.id === currentNode.parent);
            if (!parentNode) break;
            currentNode = parentNode;
        }
        return depth;
    };

    const countTotalBommels = (nodes: OrganizationTreeNodeModel[]): number => {
        return nodes.length;
    };

    const calculateTotalIncome = (nodes: OrganizationTreeNodeModel[]): number => {
        return nodes.reduce((sum, node) => sum + (node.data?.income || 0), 0);
    };

    const calculateTotalExpenses = (nodes: OrganizationTreeNodeModel[]): number => {
        return nodes.reduce((sum, node) => sum + Math.abs(node.data?.expenses || 0), 0);
    };

    const calculateTotalReceipts = (nodes: OrganizationTreeNodeModel[]): number => {
        return nodes.reduce((sum, node) => sum + (node.data?.receiptsCount || 0), 0);
    };

    const countSubBommels = (node: OrganizationTreeNodeModel): number => {
        const children = tree.filter((n) => n.parent === node.id);
        if (children.length === 0) return 0;

        let count = children.length;
        children.forEach((child) => {
            count += countSubBommels(child);
        });

        return count;
    };

    const handleBommelSelect = (nodeId: number) => {
        const node = tree.find((n) => n.id === nodeId);
        setSelectedBommel(node || null);
    };

    const handleNavigateToReceipts = () => {
        // TODO: Navigate to receipts page with selected bommel filter
        console.log('Navigate to receipts with bommel:', selectedBommel);
    };

    const createTreeNode = async () => {
        try {
            const node = await apiService.orgService.bommelPOST(
                new Bommel({
                    name: 'New item',
                    emoji: 'grey_question',
                    children: [],
                    parent: new Bommel({ id: rootBommel!.id }),
                })
            );

            return organizationTreeService.bommelsToTreeNodes([node], rootBommel!.id)[0];
        } catch (e) {
            console.error(e);
            showError('Failed to create.');
        }
    };
    const updateTreeNode = async (node: OrganizationTreeNodeModel) => {
        let isSuccess = false;

        try {
            await apiService.orgService.bommelPUT(
                node.id as number,
                new Bommel({
                    name: node.text,
                    emoji: node.data?.emoji,
                    parent: new Bommel({ id: node.parent as number }),
                })
            );
            isSuccess = true;
        } catch (e) {
            console.error(e);
            showError('Failed to update.');
        }

        return isSuccess;
    };

    const moveTreeNode = async (node: OrganizationTreeNodeModel) => {
        let isSuccess = false;
        setIsLoading(true);
        try {
            const parent = node.parent ? node.parent : rootBommel!.id;
            await apiService.orgService.to(node.id as number, parent as number);
            isSuccess = true;
        } catch (e) {
            console.error(e);
            showError('Failed to move bommel.');
        } finally {
            setIsLoading(false);
        }

        return isSuccess;
    };

    const deleteTreeNode = async (id: string | number) => {
        setIsLoading(true);
        try {
            await apiService.orgService.bommelDELETE(id as number, false);
            await loadTree();
            return true;
        } catch (e) {
            console.error(e);
            showError('Failed to delete.');
        } finally {
            setIsLoading(false);
        }
        return false;
    };

    useEffect(() => {
        if (!rootBommel) {
            setTree([]);
            return;
        }

        loadTree().then(() => {
            setIsLoading(false);
        });
    }, [rootBommel]);

    useEffect(() => {
        const organization = store.organization;

        if (!organization?.id) {
            setIsOrganizationError(true);
            return;
        }

        organizationTreeService.ensureRootBommelCreated(organization.id).then((bommel) => {
            if (bommel) {
                setRootBommel(bommel);
            } else {
                setIsOrganizationError(true);
            }
        });
    }, []);

    return (
        <>
            {isLoading && <LoadingOverlay />}

            {isOrganizationError ? (
                <div className="p-6">{t('organization.settings.error')}</div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Left Side - Structure Views */}
                        <div className="lg:col-span-3 space-y-6">
                            {/* Statistics Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="bg-white">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-gray-600">{t('organization.stats.totalBommels')}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl text-gray-900">{countTotalBommels(tree)}</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-gray-600">{t('organization.stats.totalIncome')}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl text-green-600">{calculateTotalIncome(tree).toLocaleString('de-DE')}€</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-gray-600">{t('organization.stats.totalExpenses')}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl text-red-600">{calculateTotalExpenses(tree).toLocaleString('de-DE')}€</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-white">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm text-gray-600">{t('organization.stats.totalReceipts')}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-2xl text-gray-900">{calculateTotalReceipts(tree)}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Tabs for different views */}
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
                                    <BommelTreeComponent
                                        tree={tree}
                                        rootBommel={rootBommel}
                                        width={800}
                                        height={500}
                                        onNodeClick={(nodeData) => {
                                            const node = tree.find((n) => n.id === nodeData.attributes?.id);
                                            setSelectedBommel(node || null);
                                        }}
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
                            {selectedBommel ? (
                                <Card className="sticky top-6 bg-white">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            {selectedBommel.data?.emoji && <Emoji emoji={selectedBommel.data.emoji} className="text-2xl" />}
                                            {selectedBommel.text}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <p className="text-sm text-gray-600">{t('organization.structure.details.income')}</p>
                                            <p className="text-lg text-green-600">+{(selectedBommel.data?.income || 0).toLocaleString('de-DE')}€</p>
                                        </div>

                                        <div>
                                            <p className="text-sm text-gray-600">{t('organization.structure.details.expenses')}</p>
                                            <p className="text-lg text-red-600">{(selectedBommel.data?.expenses || 0).toLocaleString('de-DE')}€</p>
                                        </div>

                                        <div className="border-t pt-4">
                                            <p className="text-sm text-gray-600">{t('organization.structure.details.revenue')}</p>
                                            <p className={`text-xl ${(selectedBommel.data?.revenue || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {(selectedBommel.data?.revenue || 0) >= 0 ? '+' : ''}
                                                {(selectedBommel.data?.revenue || 0).toLocaleString('de-DE')}€
                                            </p>
                                        </div>

                                        <div className="space-y-2 border-t pt-4">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">{t('organization.structure.details.receipts')}</span>
                                                <span className="text-sm text-gray-900">{selectedBommel.data?.receiptsCount || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">{t('organization.structure.details.openInvoices')}</span>
                                                <span className="text-sm text-gray-900">{selectedBommel.data?.receiptsOpen || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600">{t('organization.structure.details.subBommels')}</span>
                                                <span className="text-sm text-gray-900">{countSubBommels(selectedBommel)}</span>
                                            </div>
                                        </div>

                                        <Button onClick={handleNavigateToReceipts} className="w-full" variant="default">
                                            {t('organization.structure.details.toReceipts')}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="sticky top-6 bg-white">
                                    <CardContent className="py-12 text-center text-gray-500">{t('organization.structure.details.selectBommel')}</CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default OrganizationSettingsView;
