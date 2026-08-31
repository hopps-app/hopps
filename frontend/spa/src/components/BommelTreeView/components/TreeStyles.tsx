export function TreeStyles() {
    return (
        <style>{`
            .tree-link {
                stroke: #cfcfcf;
                stroke-width: 2;
                fill: none;
                transition: stroke 0.2s ease;
            }
            .tree-link:hover {
                stroke: #a7a7a7;
                stroke-width: 3;
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
                /* keep in step with the shadow-card-hover token in tailwind.config.js */
                box-shadow: 0 2px 4px rgba(60, 20, 90, 0.06), 0 8px 24px rgba(60, 20, 90, 0.1) !important;
            }
            .bommel-card.is-being-dragged {
                opacity: 0.4;
                border: 2px dashed #a78bfa !important;
            }
            .bommel-card.is-being-dragged:hover {
                transform: none;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
            }
            .bommel-card.is-valid-drop-target {
                box-shadow: 0 0 0 3px #22c55e, 0 4px 12px rgba(34, 197, 94, 0.3) !important;
                transform: scale(1.05);
            }
            .bommel-card.is-invalid-drop-target {
                box-shadow: 0 0 0 3px #ef4444, 0 4px 12px rgba(239, 68, 68, 0.3) !important;
            }
            .collapse-button:hover {
                transform: translateX(-50%) scale(1.1);
            }
        `}</style>
    );
}

export default TreeStyles;
