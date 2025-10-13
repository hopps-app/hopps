import NewCategoryDialog from '@/components/Categories/CategoryDialog';
function CategoriesSettingsView() {
    return (
        <>
            <div className="flex flex-col gap-4">
                <div className="flex flex-row justify-between items-center">
                    <h2 className="text-2xl font-semibold">Admin Einstellungen: Kategorien</h2>
                    <NewCategoryDialog />
                </div>
                <div
                    className="min-w-0 min-h-0 border border-grey-700 p-4
                                rounded-[30px]"
                ></div>
            </div>
        </>
    );
}

export default CategoriesSettingsView;
