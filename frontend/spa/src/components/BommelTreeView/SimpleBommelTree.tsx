import React from 'react';
import { Bommel } from '@hopps/api-client';

import Emoji from '@/components/ui/Emoji';
import { OrganizationTreeNodeModel } from '@/components/OrganizationStructureTree/OrganizationTreeNodeModel';

interface SimpleBommelTreeProps {
    tree: OrganizationTreeNodeModel[];
    rootBommel?: Bommel | null;
    onNodeClick?: (nodeId: number) => void;
}

interface TreeNodeProps {
    node: OrganizationTreeNodeModel;
    children: OrganizationTreeNodeModel[];
    level: number;
    tree: OrganizationTreeNodeModel[];
    onNodeClick?: (nodeId: number) => void;
}

function TreeNode({ node, children, level, tree, onNodeClick }: TreeNodeProps) {
    const hasChildren = children.length > 0;
    const [isExpanded, setIsExpanded] = React.useState(true);

    const handleToggle = () => {
        if (hasChildren) {
            setIsExpanded(!isExpanded);
        }
    };

    const handleNodeClick = () => {
        onNodeClick?.(node.id as number);
    };

    return (
        <div className="tree-node">
            <div
                className="flex items-center p-2 hover:bg-gray-50 cursor-pointer rounded-md"
                style={{ marginLeft: `${level * 20}px` }}
                onClick={handleNodeClick}
            >
                {hasChildren && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleToggle();
                        }}
                        className="mr-2 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
                    >
                        {isExpanded ? '▼' : '▶'}
                    </button>
                )}
                {!hasChildren && <div className="w-4 h-4 mr-2"></div>}

                {node.data?.emoji && (
                    <span className="mr-2">
                        <Emoji emoji={node.data.emoji} className="text-lg" />
                    </span>
                )}

                <span className="text-gray-800 font-medium">{node.text || 'Unnamed'}</span>
            </div>

            {hasChildren && isExpanded && (
                <div className="tree-children">
                    {children.map((childNode) => {
                        const grandChildren = tree.filter((n: OrganizationTreeNodeModel) => n.parent === childNode.id);
                        return (
                            <TreeNode key={childNode.id} node={childNode} children={grandChildren} level={level + 1} tree={tree} onNodeClick={onNodeClick} />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function SimpleBommelTree({ tree, rootBommel, onNodeClick }: SimpleBommelTreeProps) {
    if (!tree.length && !rootBommel) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                    <div className="text-lg font-medium">No data available</div>
                    <div className="text-sm">Please add items to your organization structure</div>
                </div>
            </div>
        );
    }

    // Build tree structure
    const rootNodes = tree.filter((node) => node.parent === 0 || node.parent === rootBommel?.id);

    return (
        <div className="simple-tree-view border rounded-lg bg-white p-4 min-h-64">
            <div className="mb-4">
                <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                    <span className="mr-3">
                        <Emoji emoji="building" className="text-2xl" />
                    </span>
                    <div>
                        <h4 className="font-semibold text-gray-800">{rootBommel?.name || 'Organization'}</h4>
                        <p className="text-sm text-gray-600">Root Level</p>
                    </div>
                </div>
            </div>

            <div className="tree-container">
                {rootNodes.map((node) => {
                    const children = tree.filter((n: OrganizationTreeNodeModel) => n.parent === node.id);
                    return <TreeNode key={node.id} node={node} children={children} level={0} tree={tree} onNodeClick={onNodeClick} />;
                })}
            </div>

            <style>{`
                .simple-tree-view .tree-container {
                    font-family: system-ui, -apple-system, sans-serif;
                }
                .simple-tree-view .tree-node {
                    position: relative;
                }
                .simple-tree-view .tree-node:not(:last-child)::before {
                    content: '';
                    position: absolute;
                    left: 8px;
                    top: 100%;
                    bottom: -10px;
                    width: 1px;
                    background-color: #e5e7eb;
                }
                .simple-tree-view .tree-children .tree-node::before {
                    left: 28px;
                }
            `}</style>
        </div>
    );
}

export default SimpleBommelTree;
