import CategoryDialog from '@/components/Categories/CategoryDialog';
import CategoryTable from '../Categories/CategoryTable';
import TextField from '../ui/TextField';

const categories = [
    {
        id: 'b5d29e1a-97a8-4c5b-8e41-120fe2b7f6c9',
        name: 'Eigene Kategorie',
        number: '00',
        description: 'Alle Geldspenden, welche an die Organisation gegeben wurden',
    },
    {
        id: 'db0b8e7b-4144-4f40-9e1a-d9f611edc872',
        name: 'Sachspenden',
        number: '01',
        description: 'Sachleistungen und Materialspenden, die an Mitglieder oder Partner verteilt werden',
    },
    {
        id: 'ffbe5b1f-3df3-4b13-b47f-789ef8274a4a',
        name: 'Mitgliedsbeiträge',
        number: '02',
        description: 'Regelmäßige Beiträge von Vereinsmitgliedern',
    },
    {
        id: '1a6a9ef3-7274-4b5e-b8c4-54b8c6b3ad00',
        name: 'Veranstaltungseinnahmen',
        number: '03',
        description: 'Einnahmen aus Veranstaltungen, Konzerten oder Workshops',
    },
    {
        id: 'b6c45a3b-1b7e-41fa-88c8-3e0a75e75fd1',
        name: 'Verwaltungskosten',
        number: '04',
        description: 'Kosten für Verwaltung, Kommunikation und Infrastruktur',
    },
    {
        id: 'bd3c21f9-6e0d-4a22-9b7e-cf9ed1a9c13a',
        name: 'Fördergelder',
        number: '05',
        description: 'Öffentliche Zuschüsse oder finanzielle Förderungen für Projekte',
    },
    {
        id: 'c74b43f3-65a1-4eb8-80c5-f9af8f13236f',
        name: 'Ohne Nummer Kategorie',
        description: 'Eine Kategorie ohne definierte Nummer, wird standardmäßig als 00 angezeigt',
    },
];

function CategoriesSettingsView() {
    return (
        <>
            <div className="flex flex-col gap-4">
                <div className="flex flex-row justify-between items-center">
                    <h2 className="text-2xl font-semibold">Kategorien</h2>
                    <CategoryDialog />
                </div>
                <div
                    className="min-w-0 min-h-0 border border-grey-500 p-4
                                rounded-[30px] bg-[#ECE0F6]"
                >
                    <div className="space-y-10">
                        <TextField className="max-w-sm" placeholder="Kategorie suchen"></TextField>
                        <CategoryTable categories={categories} />
                    </div>
                </div>
            </div>
        </>
    );
}

export default CategoriesSettingsView;
