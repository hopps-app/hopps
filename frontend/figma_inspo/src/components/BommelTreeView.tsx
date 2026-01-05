import { useState } from 'react';
import { ChevronRight, ChevronDown, FileText } from 'lucide-react';
import { Bommel } from '../types/bommel';
import { Button } from './ui/button';

interface BommelTreeViewProps {
  bommels: Bommel[];
  isEditMode: boolean;
  onBommelClick: (bommel: Bommel) => void;
}

export function BommelTreeView({ bommels, isEditMode, onBommelClick }: BommelTreeViewProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="space-y-3">
        {bommels.map((bommel) => (
          <TreeNode
            key={bommel.id}
            bommel={bommel}
            isEditMode={isEditMode}
            onBommelClick={onBommelClick}
            level={0}
          />
        ))}
      </div>
    </div>
  );
}

interface TreeNodeProps {
  bommel: Bommel;
  isEditMode: boolean;
  onBommelClick: (bommel: Bommel) => void;
  level: number;
}

function TreeNode({ bommel, isEditMode, onBommelClick, level }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = bommel.children && bommel.children.length > 0;
  const umsatz = bommel.einnahmen - bommel.ausgaben;
  const totalSubBommels = countSubBommels(bommel);

  return (
    <div className="select-none">
      {/* Node Card */}
      <div 
        className="flex items-center gap-3 group"
        style={{ paddingLeft: `${level * 32}px` }}
      >
        {/* Expand/Collapse Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) {
              setIsExpanded(!isExpanded);
            }
          }}
          className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-purple-100 transition-colors ${
            !hasChildren ? 'invisible' : ''
          }`}
        >
          {hasChildren && (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-purple-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-purple-600" />
            )
          )}
        </button>

        {/* Card */}
        <div
          onClick={() => onBommelClick(bommel)}
          className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] p-4"
        >
          <div className="flex items-center justify-between gap-4">
            {/* Left: Name and basic info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-white truncate mb-1">{bommel.name}</h4>
              {!isEditMode && (
                <div className="flex items-center gap-3 text-xs text-purple-100">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {bommel.anzahlBelege} Belege
                  </span>
                  {bommel.unpaidInvoices > 0 && (
                    <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full">
                      {bommel.unpaidInvoices} offen
                    </span>
                  )}
                  {hasChildren && (
                    <span className="text-purple-200">
                      {totalSubBommels} Unterbommel
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right: Financial info */}
            {!isEditMode && (
              <div className="flex items-center gap-6 flex-shrink-0">
                <div className="text-right">
                  <div className="text-xs text-purple-200 mb-0.5">Einnahmen</div>
                  <div className="text-sm text-green-200">
                    +{(bommel.einnahmen / 1000).toFixed(1)}k€
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-xs text-purple-200 mb-0.5">Ausgaben</div>
                  <div className="text-sm text-red-200">
                    -{(bommel.ausgaben / 1000).toFixed(1)}k€
                  </div>
                </div>

                <div className="text-right bg-white/10 rounded-lg px-3 py-2">
                  <div className="text-xs text-purple-200 mb-0.5">Umsatz</div>
                  <div className={`text-base ${umsatz >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                    {umsatz >= 0 ? '+' : ''}{(umsatz / 1000).toFixed(1)}k€
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Navigate to Belege screen
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 text-white"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Zu Belege
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="mt-3 space-y-3">
          {bommel.children!.map((child) => (
            <TreeNode
              key={child.id}
              bommel={child}
              isEditMode={isEditMode}
              onBommelClick={onBommelClick}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
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
