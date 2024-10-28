import { Button } from '@/components/ui/Button.tsx';

function HomePage() {
    return (
        <div>
            <div className="flex flex-row">
                <div className="flex-shrink-0 w-1/2 pr-32 flex flex-col gap-6 justify-center">
                    <h1 className="font-normal text-5xl">Finanzen, Belege und Ausgaben einfach verwalten</h1>
                    <div className="text-base">
                        “Hopps” ist eine kostenlose, Open-Source-Buchhaltungssoftware speziell für Vereine, entwickelt von Open Project e.V. mit Förderung der
                        Deutschen Stiftung für Engagement und Ehrenamt. Die Software vereinfacht das Management von Finanzen und Ausgaben. Die Alpha-Version
                        erscheint im Dezember 2024.
                    </div>
                    <div className="flex flex-row gap-4">
                        <Button>Jetzt testen</Button>
                        <Button variant="outline">Kontakt aufnehmen</Button>
                    </div>
                </div>
                <div className="flex-shrink-0 w-1/2 relative overflow-hidden">
                    <img src="/images/img1.png" alt="image" className="w-full" />
                </div>
            </div>
        </div>
    );
}

export default HomePage;
