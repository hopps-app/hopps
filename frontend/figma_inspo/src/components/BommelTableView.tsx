import { FileText } from 'lucide-react';
import { Bommel } from '../types/bommel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Button } from './ui/button';

interface BommelTableViewProps {
  bommels: Bommel[];
  isEditMode: boolean;
  onBommelClick: (bommel: Bommel) => void;
}

export function BommelTableView({ bommels, isEditMode, onBommelClick }: BommelTableViewProps) {
  const flatBommels = flattenBommels(bommels);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Übergeordnet</TableHead>
            {!isEditMode && (
              <>
                <TableHead className="text-right">Einnahmen</TableHead>
                <TableHead className="text-right">Ausgaben</TableHead>
                <TableHead className="text-right">Umsatz</TableHead>
                <TableHead className="text-right">Belege</TableHead>
                <TableHead className="text-right">Offene Rechnungen</TableHead>
                <TableHead className="text-right">Entwürfe</TableHead>
                <TableHead className="text-right">Subbommel</TableHead>
                <TableHead></TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {flatBommels.map((item) => {
            const umsatz = item.bommel.einnahmen - item.bommel.ausgaben;
            const subBommels = countSubBommels(item.bommel);
            
            return (
              <TableRow
                key={item.bommel.id}
                className="cursor-pointer hover:bg-purple-50"
                onClick={() => onBommelClick(item.bommel)}
              >
                <TableCell>
                  <span style={{ marginLeft: `${item.level * 24}px` }}>
                    {item.bommel.name}
                  </span>
                </TableCell>
                <TableCell>{item.parentName || '-'}</TableCell>
                {!isEditMode && (
                  <>
                    <TableCell className="text-right">
                      {item.bommel.einnahmen.toLocaleString('de-DE')}€
                    </TableCell>
                    <TableCell className="text-right">
                      {item.bommel.ausgaben.toLocaleString('de-DE')}€
                    </TableCell>
                    <TableCell className={`text-right ${umsatz >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {umsatz >= 0 ? '+' : ''}{umsatz.toLocaleString('de-DE')}€
                    </TableCell>
                    <TableCell className="text-right">{item.bommel.anzahlBelege}</TableCell>
                    <TableCell className="text-right">{item.bommel.unpaidInvoices}</TableCell>
                    <TableCell className="text-right">{item.bommel.anzahlEntwuerfe}</TableCell>
                    <TableCell className="text-right">{subBommels}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to Belege screen
                        }}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

interface FlatBommel {
  bommel: Bommel;
  level: number;
  parentName: string | null;
}

function flattenBommels(bommels: Bommel[], level = 0, parentName: string | null = null): FlatBommel[] {
  const result: FlatBommel[] = [];
  
  bommels.forEach((bommel) => {
    result.push({ bommel, level, parentName });
    
    if (bommel.children && bommel.children.length > 0) {
      result.push(...flattenBommels(bommel.children, level + 1, bommel.name));
    }
  });
  
  return result;
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
