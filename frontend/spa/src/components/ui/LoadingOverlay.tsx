import OrbitProgress from 'react-loading-indicators/OrbitProgress';

export function LoadingOverlay({ isEnabled }: { isEnabled?: boolean }) {
    return (
        isEnabled !== false && (
            <div className="select-none absolute w-full h-full left-0 right-0 top-0 bottom-0 flex justify-center items-center z-40 bg-[rgba(0,0,0,0.2)]">
                <OrbitProgress color="var(--primary)" size="medium" text="" />
            </div>
        )
    );
}
