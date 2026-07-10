/** Shimmer placeholder rows shown while the Vereine list loads. Mirrors the real table's card + row rhythm. */
export default function OrganizationsTableSkeleton() {
    return (
        <div className="card overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center gap-4 px-5 py-4"
                    style={{ borderBottom: i < 4 ? '1px solid var(--line)' : 'none' }}
                >
                    <div className="flex-1 min-w-0">
                        <div className="skel h-3.5 w-40 mb-2" />
                        <div className="skel h-2.5 w-24" />
                    </div>
                    <div className="skel h-3 w-32" />
                    <div className="skel h-3 w-10" />
                    <div className="skel h-3 w-20" />
                    <div className="skel h-3 w-16" />
                    <div className="skel h-5 w-16 rounded-full" />
                </div>
            ))}
        </div>
    );
}
