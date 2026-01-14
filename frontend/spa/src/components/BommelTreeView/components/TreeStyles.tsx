export function TreeStyles() {
    return (
        <style>{`
            .tree-link {
                stroke: #a78bfa;
                stroke-width: 2.5;
                fill: none;
                transition: stroke 0.2s ease;
            }
            .tree-link:hover {
                stroke: #7c3aed;
                stroke-width: 3.5;
            }
            .rd3t-node circle {
                display: none;
            }
            .rd3t-node text {
                display: none;
            }
            .rd3t-tree-container {
                width: 100% !important;
                height: 100% !important;
            }
            .bommel-card:hover {
                transform: scale(1.05);
                box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15) !important;
            }
            .collapse-button:hover {
                transform: translateX(-50%) scale(1.1);
            }
        `}</style>
    );
}

export default TreeStyles;
