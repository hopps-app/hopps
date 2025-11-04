import { useMemo } from 'react';
import Tree, { RawNodeDatum, CustomNodeElementProps } from 'react-d3-tree';
import { Bommel } from '@hopps/api-client';

import Emoji from '@/components/ui/Emoji';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel';

// Interface for react-d3-tree data structure that extends RawNodeDatum
interface TreeNodeData extends RawNodeDatum {
    name: string;
    attributes?: {
        id: number;
        emoji?: string;
        nodeId?: number;
    };
    children?: TreeNodeData[];
}

interface BommelTreeComponentProps {
    tree: OrganizationTreeNodeModel[];
    rootBommel?: Bommel | null;
    onNodeClick?: (nodeData: TreeNodeData) => void;
    width?: number;
    height?: number;
}

function BommelTreeComponent({ tree, rootBommel, onNodeClick, width = 800, height = 600 }: BommelTreeComponentProps) {
    // Convert OrganizationTreeNodeModel[] to react-d3-tree format
    const treeData = useMemo(() => {
        if (!tree.length && !rootBommel) {
            return null;
        }

        // Helper function to recursively build tree structure
        const buildTreeNode = (nodes: OrganizationTreeNodeModel[], parentId: string | number = 0): TreeNodeData[] => {
            const filteredNodes = nodes.filter((node) => node.parent === parentId);

            return filteredNodes.map((node) => {
                const children = buildTreeNode(nodes, node.id);
                return {
                    name: node.text || 'Unnamed',
                    attributes: {
                        id: node.id as number,
                        emoji: node.data?.emoji || '',
                        nodeId: node.id as number,
                    },
                    children: children.length > 0 ? children : undefined,
                };
            });
        };

        // Build the tree starting from nodes with parent === 0
        // These are the top-level nodes (direct children of the root bommel)
        const topLevelNodes = buildTreeNode(tree, 0);

        // If we have no top-level nodes but have a root bommel, create a single root node
        if (topLevelNodes.length === 0 && rootBommel) {
            return {
                name: rootBommel.name || 'Organization',
                attributes: {
                    id: rootBommel.id || 0,
                    emoji: 'building',
                    nodeId: rootBommel.id || 0,
                },
            };
        }

        // If we have multiple top-level nodes, we need to create an artificial root
        // to hold them all (react-d3-tree requires a single root)
        if (topLevelNodes.length > 1) {
            return {
                name: rootBommel?.name || 'Organization',
                attributes: {
                    id: rootBommel?.id || 0,
                    emoji: 'building',
                    nodeId: rootBommel?.id || 0,
                },
                children: topLevelNodes,
            };
        }

        // If we have exactly one top-level node, return it as the root
        return topLevelNodes[0] || null;
    }, [tree, rootBommel]);

    // Custom node rendering with emoji support
    const renderCustomNodeElement = ({ nodeDatum, toggleNode }: CustomNodeElementProps) => (
        <g>
            {/* Node circle background */}
            <circle
                r={25}
                fill="#ffffff"
                stroke="#e5e7eb"
                strokeWidth={2}
                onClick={() => {
                    toggleNode();
                    if (onNodeClick && nodeDatum.attributes) {
                        const nodeData: TreeNodeData = {
                            name: nodeDatum.name,
                            attributes: {
                                id: nodeDatum.attributes.id as number,
                                emoji: nodeDatum.attributes.emoji as string,
                                nodeId: nodeDatum.attributes.nodeId as number,
                            },
                        };
                        onNodeClick(nodeData);
                    }
                }}
                style={{ cursor: 'pointer' }}
                className="hover:fill-blue-50 hover:stroke-blue-300 transition-colors"
            />

            {/* Emoji in center of node */}
            {nodeDatum.attributes?.emoji && (
                <foreignObject x={-12} y={-12} width={24} height={24}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            height: '100%',
                            fontSize: '18px',
                        }}
                    >
                        <Emoji emoji={nodeDatum.attributes.emoji as string} />
                    </div>
                </foreignObject>
            )}

            {/* Node label */}
            <text fill="#374151" strokeWidth="0" x={0} y={40} textAnchor="middle" fontSize="12" fontFamily="system-ui, sans-serif" fontWeight="500">
                {nodeDatum.name}
            </text>

            {/* Optional: Add a smaller subtitle if needed */}
            {nodeDatum.attributes?.id && (
                <text fill="#9ca3af" strokeWidth="0" x={0} y={52} textAnchor="middle" fontSize="10" fontFamily="system-ui, sans-serif">
                    ID: {nodeDatum.attributes.id}
                </text>
            )}
        </g>
    );

    if (!treeData) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                    <div className="text-lg font-medium">No data available</div>
                    <div className="text-sm">Please add items to your organization structure</div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full border rounded-lg bg-white relative" style={{ height: height }}>
            {/* Tree container */}
            <div className="w-full h-full overflow-hidden">
                <Tree
                    data={treeData}
                    orientation="vertical"
                    translate={{ x: width / 2, y: 60 }}
                    pathFunc="step"
                    nodeSize={{ x: 180, y: 120 }}
                    renderCustomNodeElement={renderCustomNodeElement}
                    separation={{ siblings: 1.2, nonSiblings: 1.5 }}
                    zoom={0.8}
                    scaleExtent={{ min: 0.3, max: 2 }}
                    enableLegacyTransitions={true}
                    collapsible={true}
                    initialDepth={3}
                    depthFactor={120}
                    pathClassFunc={() => 'tree-link'}
                />
            </div>

            {/* Custom styles for the tree */}
            <style>{`
                .tree-link {
                    stroke: #6b7280;
                    stroke-width: 2;
                    fill: none;
                    transition: stroke 0.2s ease;
                }
                .tree-link:hover {
                    stroke: #3b82f6;
                    stroke-width: 3;
                }

                /* Hide the default node elements since we're using custom rendering */
                .rd3t-node circle {
                    display: none;
                }
                .rd3t-node text {
                    display: none;
                }

                /* Ensure the SVG takes full space */
                .rd3t-tree-container {
                    width: 100% !important;
                    height: 100% !important;
                }
            `}</style>
        </div>
    );
}

export default BommelTreeComponent;
