interface Props {
    mainText: string;
    subText?: string;
    actionText?: string;
    onAction?: () => void;
    icon?: React.ReactNode;
}

function EmptyTable({ mainText, subText, actionText, onAction, icon }: Props) {
    return (
        <div className="flex flex-1 items-center justify-center py-24">
            <div className="flex flex-col items-center gap-6 rounded-[30px] bg-white px-16 py-20 shadow-sm border border-gray-100 max-w-2xl w-full mx-2 text-center">
                {icon && <div className="flex h-20 w-20 items-center justify-center">{icon}</div>}

                <h2 className="text-xl font-semibold text-gray-900 ">{mainText}</h2>

                {subText && <p className="text-lg text-gray-600">{subText}</p>}

                {actionText && onAction && (
                    <button
                        onClick={onAction}
                        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition"
                    >
                        {actionText}
                    </button>
                )}
            </div>
        </div>
    );
}

export default EmptyTable;
