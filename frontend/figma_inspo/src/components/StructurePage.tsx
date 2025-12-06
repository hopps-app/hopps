import { useState } from 'react';
import { Search, Edit, Check, Grid3x3, Network } from 'lucide-react';
import { BommelTreeView } from './BommelTreeView';
import { BommelTableView } from './BommelTableView';
import { mockBommels } from '../data/mockBommels';
import { Bommel } from '../types/bommel';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export function StructurePage() {
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBommel, setSelectedBommel] = useState<Bommel | null>(null);

  const totalBommels = countTotalBommels(mockBommels);

  const handleBommelClick = (bommel: Bommel) => {
    setSelectedBommel(bommel);
  };

  const handleNavigateToBelege = () => {
    // This would navigate to the Belege screen with the selected Bommel
    console.log('Navigate to Belege screen with:', selectedBommel);
  };

  return (
    <div className="min-h-screen bg-purple-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1>Struktur</h1>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Schnellsuche"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>

              <Button
                variant={isEditMode ? "default" : "outline"}
                onClick={() => setIsEditMode(!isEditMode)}
                className={isEditMode ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                {isEditMode ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Fertig
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Bearbeiten
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Side - Structure Views */}
          <div className="lg:col-span-3 space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Gesamt Bommels</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl text-gray-900">{totalBommels}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Gesamt Einnahmen</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl text-green-600">
                    {mockBommels[0].einnahmen.toLocaleString('de-DE')}€
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Gesamt Ausgaben</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl text-red-600">
                    {mockBommels[0].ausgaben.toLocaleString('de-DE')}€
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Gesamt Belege</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl text-gray-900">
                    {mockBommels[0].anzahlBelege}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for different views */}
            <Tabs defaultValue="tree" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="tree" className="flex items-center gap-2">
                  <Network className="w-4 h-4" />
                  Baumstruktur
                </TabsTrigger>
                <TabsTrigger value="table" className="flex items-center gap-2">
                  <Grid3x3 className="w-4 h-4" />
                  Tabelle
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tree" className="mt-6">
                <BommelTreeView
                  bommels={mockBommels}
                  isEditMode={isEditMode}
                  onBommelClick={handleBommelClick}
                />
              </TabsContent>

              <TabsContent value="table" className="mt-6">
                <BommelTableView
                  bommels={mockBommels}
                  isEditMode={isEditMode}
                  onBommelClick={handleBommelClick}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Side - Selected Bommel Details */}
          <div className="lg:col-span-1">
            {selectedBommel ? (
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>{selectedBommel.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Einnahmen</p>
                    <p className="text-lg text-green-600">
                      +{selectedBommel.einnahmen.toLocaleString('de-DE')}€
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Ausgaben</p>
                    <p className="text-lg text-red-600">
                      -{selectedBommel.ausgaben.toLocaleString('de-DE')}€
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-600">Umsatz</p>
                    <p className={`text-xl ${(selectedBommel.einnahmen - selectedBommel.ausgaben) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(selectedBommel.einnahmen - selectedBommel.ausgaben) >= 0 ? '+' : ''}
                      {(selectedBommel.einnahmen - selectedBommel.ausgaben).toLocaleString('de-DE')}€
                    </p>
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Belege</span>
                      <span className="text-sm text-gray-900">{selectedBommel.anzahlBelege}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Offene Rechnungen</span>
                      <span className="text-sm text-gray-900">{selectedBommel.unpaidInvoices}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Entwürfe</span>
                      <span className="text-sm text-gray-900">{selectedBommel.anzahlEntwuerfe}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Subbommel</span>
                      <span className="text-sm text-gray-900">
                        {countSubBommels(selectedBommel)}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handleNavigateToBelege}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    Zu Belege
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="sticky top-6">
                <CardContent className="py-12 text-center text-gray-500">
                  Wählen Sie einen Bommel aus, um Details anzuzeigen
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function countTotalBommels(bommels: Bommel[]): number {
  let count = bommels.length;
  
  bommels.forEach((bommel) => {
    if (bommel.children && bommel.children.length > 0) {
      count += countTotalBommels(bommel.children);
    }
  });
  
  return count;
}

function countSubBommels(bommel: Bommel): number {
  if (!bommel.children || bommel.children.length === 0) {
    return 0;
  }
  
  let count = bommel.children.length;
  bommel.children.forEach((child) => {
    count += countSubBommels(child);
  });
  
  return count;
}
