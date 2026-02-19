import { ArrowRight, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel';
import Button from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import Emoji from '@/components/ui/Emoji';

export interface MoveBommelDialogProps {
    open: boolean;
    bommelId: number;
    bommelName: string;
    currentParentId: number | string;
    allBommels: OrganizationTreeNodeModel[];
    onConfirm: (newParentId: number) => void;
    onCancel: () => void;
}

export function MoveBommelDialog({ open, bommelId, bommelName, currentParentId, allBommels, onConfirm, onCancel }: MoveBommelDialogProps) {
    const { t } = useTranslation();
    const [selectedParentId, setSelectedParentId] = useState<number | null>(null);

    // Filter out invalid targets: the bommel itself, its current parent, and its descendants
    const availableParents = useMemo(() => {
        // Get all descendants of the bommel being moved (to prevent cycles)
        const getDescendantIds = (parentId: number | string): Set<number | string> => {
            const ids = new Set<number | string>();
            const children = allBommels.filter((b) => b.parent === parentId);
            children.forEach((child) => {
                ids.add(child.id);
                const childDescendants = getDescendantIds(child.id);
                childDescendants.forEach((id) => ids.add(id));
            });
            return ids;
        };

        const descendantIds = getDescendantIds(bommelId);

        return allBommels.filter((b) => {
            // Cannot move to itself
            if (b.id === bommelId) return false;
            // Cannot move to a descendant (would create cycle)
            if (descendantIds.has(b.id)) return false;
            // Cannot move to current parent (no change)
            if (b.id === currentParentId) return false;
            // If currentParentId is 0 (virtual root), the bommel is a direct child of root
            // In that case, also filter out the root bommel since it's the actual parent
            if (currentParentId === 0 && b.data?.isRoot) return false;
            return true;
        });
    }, [allBommels, bommelId, currentParentId]);

    // Build a hierarchical display with indentation
    const sortedParents = useMemo(() => {
        // Build depth map for indentation
        const depthMap = new Map<number | string, number>();

        const calculateDepth = (nodeId: number | string): number => {
            if (depthMap.has(nodeId)) return depthMap.get(nodeId)!;
            const node = allBommels.find((b) => b.id === nodeId);
            if (!node || node.parent === 0) {
                depthMap.set(nodeId, 0);
                return 0;
            }
            const depth = calculateDepth(node.parent) + 1;
            depthMap.set(nodeId, depth);
            return depth;
        };

        allBommels.forEach((b) => calculateDepth(b.id));

        return availableParents
            .map((b) => ({
                ...b,
                depth: depthMap.get(b.id) ?? 0,
            }))
            .sort((a, b) => {
                // Sort by tree order (parent first, then children)
                if (a.depth !== b.depth) return a.depth - b.depth;
                return a.text.localeCompare(b.text);
            });
    }, [availableParents, allBommels]);

    const handleConfirm = () => {
        if (selectedParentId !== null) {
            onConfirm(selectedParentId);
            setSelectedParentId(null);
        }
    };

    const handleCancel = () => {
        setSelectedParentId(null);
        onCancel();
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRight className="w-5 h-5 text-blue-500" />
                        {t('organization.structure.moveDialog.title')}
                    </DialogTitle>
                    <DialogDescription>{t('organization.structure.moveDialog.description', { name: bommelName })}</DialogDescription>
                </DialogHeader>

                <div className="py-2 max-h-[300px] overflow-y-auto">
                    {sortedParents.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">{t('organization.structure.moveDialog.noTargets')}</p>
                    ) : (
                        <div className="space-y-1">
                            {sortedParents.map((parent) => (
                                <button
                                    key={parent.id as number}
                                    type="button"
                                    onClick={() => setSelectedParentId(parent.id as number)}
                                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                                        selectedParentId === parent.id
                                            ? 'border-purple-500 bg-purple-50 text-purple-900'
                                            : 'border-[#A7A7A7] hover:bg-gray-50 text-gray-700'
                                    }`}
                                    style={{ paddingLeft: `${12 + (parent.depth ?? 0) * 20}px` }}
                                >
                                    {(parent.depth ?? 0) > 0 && <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                                    {parent.data?.emoji && (
                                        <span className="flex-shrink-0 text-base">
                                            <Emoji emoji={parent.data.emoji} />
                                        </span>
                                    )}
                                    <span className="text-sm font-medium truncate">{parent.text}</span>
                                    {parent.data?.isRoot && <span className="text-xs text-gray-400 ml-auto flex-shrink-0">(Root)</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="default" onClick={handleConfirm} disabled={selectedParentId === null}>
                        {t('organization.structure.moveDialog.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
