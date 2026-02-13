import React, { useState } from 'react';

/**
 * Debug component for testing Error Boundary behavior.
 * Only used in development mode to verify error handling.
 */
function BrokenComponent(): React.ReactNode {
    // This will throw a render error
    throw new Error('Intentional test error: Component crash simulation');
}

function DebugErrorView() {
    const [shouldCrash, setShouldCrash] = useState(false);

    if (shouldCrash) {
        return <BrokenComponent />;
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Error Boundary Test</h1>
            <p className="text-muted-foreground mb-6">
                Click the button below to simulate a component crash. The Error Boundary should catch it and display a fallback UI.
            </p>
            <button
                onClick={() => setShouldCrash(true)}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
                data-testid="trigger-error-button"
            >
                Trigger Component Error
            </button>
        </div>
    );
}

export default DebugErrorView;
