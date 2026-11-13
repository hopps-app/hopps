import type { DocumentResponse } from '@hopps/api-client';
import { RefreshCw, AlertCircle, Info, Lightbulb, Play, X } from 'lucide-react';
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { BommelDetailsPanel, DragHint, EditModeBanner, SumFlowHint, GuideCard, HintBanner, PeriodField, ToggleField, type GuideStep } from './components';
import { BommelSkeleton } from './components/BommelSkeleton';
import { DEMO_DRAG_HINT, useBommelTree, useStatistics, useDemoTree } from './hooks';
import { currentYearPeriod, parsePeriod, periodLabel, type Period } from './period';

import { BommelTreeComponent } from '@/components/BommelTreeView';
import { BommelTreeNodeModel } from '@/components/BommelTreeView/BommelTreeNodeModel';
import Button from '@/components/ui/Button';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { ReviewDrawer } from '@/components/views/BelegeView';
import { useMediaQuery } from '@/hooks/use-media-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { usePersistedState } from '@/hooks/usePersistedState';
import type { TransactionDisplayStatus } from '@/lib/transactionStatus';
import { cn } from '@/lib/utils';

/** Width of the detail panel plus the gap to the tree, see the grid below */
const PANEL_SPACE = 340 + 16;

/** A calm fade for parts that appear or swap, e.g. between the guide steps */
const SOFT_ENTER = 'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500';

/** Whether `id` is `ancestorId` or lies below it. Top-level Bommel hang under 0 in the flat model, not under the root. */
function isSameOrBelow(tree: BommelTreeNodeModel[], id: number | string, ancestorId: number | string): boolean {
    const rootId = tree.find((n) => n.data?.isRoot)?.id;
    let current: number | string | undefined = id;
    while (current !== undefined && current !== 0) {
        if (current === ancestorId) return true;
        if (current === rootId) return false;
        current = tree.find((n) => n.id === current)?.parent;
    }
    // Reached the top level: the root is above everything
    return ancestorId === rootId;
}

function BommelView() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    usePageTitle(t('bommel.title'));
    const [searchParams, setSearchParams] = useSearchParams();
    // ?bommelId= as the page was opened with (a link from elsewhere). Captured once: later URL changes come from this page
    // itself (selecting, deleting) and must never be treated as a link to check.
    const [linkedBommelId] = useState(() => searchParams.get('bommelId'));
    // ?edit=1 (e.g. from the dashboard setup step) opens the structure straight in edit mode.
    const [isEditMode, setIsEditMode] = useState(() => searchParams.get('edit') === '1');
    const [isDragDropMode, setIsDragDropMode] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    // The guided walk through the page; null while it is closed. Done or skipped once, it does not start by itself again.
    const [guideStep, setGuideStep] = useState<GuideStep | null>(null);
    const [guideDone, setGuideDone] = usePersistedState<boolean>('hopps.bommel.guideDone', false);
    const guideAutoStarted = useRef(false);
    // Each time "Verschiebbar" is switched on, a drag-and-drop animation shows how moving works, until the user has
    // moved a Bommel themselves
    const [movedSinceDragOn, setMovedSinceDragOn] = useState(false);
    const treeAreaRef = useRef<HTMLDivElement>(null);
    const verticalTree = useMediaQuery('(max-width: 767px)');
    const [selectedBommel, setSelectedBommel] = useState<BommelTreeNodeModel | null>(null);
    const [bommelNotFound, setBommelNotFound] = useState(false);
    // Receipt drawer opened from the detail panel (transactions navigate to their page instead)
    const [openReceipt, setOpenReceipt] = useState<DocumentResponse | null>(null);
    // From here the panel sits next to the tree; below it is a bottom sheet
    const panelBeside = useMediaQuery('(min-width: 1024px)');
    const initialSelectionDone = useRef(false);

    // Drop ?edit=1 from the URL once it has been applied, so a reload does not force edit mode again.
    useEffect(() => {
        if (searchParams.has('edit')) {
            searchParams.delete('edit');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    // The amounts cover one period, by default the current year; the choice is remembered like the status filters.
    const [storedPeriod, setPeriod] = usePersistedState<Period>('hopps.bommel.period', currentYearPeriod());
    const period = parsePeriod(storedPeriod);
    // The note at the top of the details panel is shown until it was dismissed once.
    const [panelHintSeen, setPanelHintSeen] = usePersistedState<boolean>('hopps.bommel.panelHintSeen', false);
    const { isLoading: isStatsLoading, bommelStats, options: statisticsOptions, setIncludeDrafts, setAggregate } = useStatistics(period);
    const isStatsLoaded = bommelStats !== null || !isStatsLoading;

    const realTreeData = useBommelTree({ bommelStats });
    const demoTreeData = useDemoTree(statisticsOptions.aggregate);

    // Select data source based on demo mode
    const activeData = isDemoMode ? demoTreeData : realTreeData;
    const { isOrganizationError, isLoading, rootBommel, tree, createChildBommel, updateTreeNode, moveTreeNode, deleteTreeNode } = activeData;

    // Only the organisation itself (the root) exists yet
    const structureIsEmpty = !isLoading && !tree.some((node) => !node.data?.isRoot);

    // The guide looks at the real structure, whatever the page shows right now (the example in the first steps).
    const realStructureLoaded = !realTreeData.isLoading;
    const hasFirstBommel = realStructureLoaded && realTreeData.tree.some((node) => !node.data?.isRoot);

    // First visit with nothing below the root yet: start the guide once.
    useEffect(() => {
        if (guideAutoStarted.current || guideDone || !realStructureLoaded || hasFirstBommel) return;
        guideAutoStarted.current = true;
        setGuideStep('example');
    }, [guideDone, realStructureLoaded, hasFirstBommel]);

    // The guide decides what the page shows: the example in the first steps, the own structure in the last one. Editing
    // and moving are shown on the example, with the same controls as on the own structure. The adding step leaves edit
    // mode off, so the user finds the button themselves; deleting and moving need it, so those steps turn it on.
    const resetDemo = demoTreeData.reset;
    useEffect(() => {
        if (!guideStep) return;
        const onExample = guideStep !== 'own';
        setIsDemoMode(onExample);
        setSelectedBommel(null);
        setIsEditMode(guideStep === 'delete' || guideStep === 'move');
        setIsDragDropMode(guideStep === 'move');
        if (guideStep === 'example') resetDemo();
        if (guideStep === 'sums') setAggregate(true);
        if (guideStep === 'own') setAggregate(false);
    }, [guideStep, resetDemo, setAggregate]);

    const closeGuide = useCallback(() => {
        // Leaving from the example: its edit mode must not carry over to the own structure
        if (guideStep !== 'own') setIsEditMode(false);
        setGuideStep(null);
        setGuideDone(true);
        setIsDemoMode(false);
        setIsDragDropMode(false);
        setSelectedBommel(null);
    }, [guideStep, setGuideDone]);

    // Opening the example starts it fresh. Switching either way ends edit mode and clears the selection, so changes
    // to the example never mix with the own structure.
    const handleDemoModeChange = useCallback(
        (enabled: boolean) => {
            if (enabled) resetDemo();
            setIsDemoMode(enabled);
            setSelectedBommel(null);
            setBommelNotFound(false);
            setIsEditMode(false);
            setIsDragDropMode(false);
        },
        [resetDemo]
    );

    useEffect(() => {
        if (isDragDropMode) setMovedSinceDragOn(false);
    }, [isDragDropMode]);

    // What the guide points at in the current step; the matching elements carry `data-guide` (see styles/index.css)
    let guideHighlight: string | undefined;
    if (guideStep === 'example') guideHighlight = 'card';
    else if (guideStep === 'add') guideHighlight = isEditMode ? 'add-child' : 'edit-button';
    else if (guideStep === 'delete') guideHighlight = 'delete';
    else if (guideStep === 'move') guideHighlight = 'drag-toggle drag-handle';
    else if (guideStep === 'sums') guideHighlight = 'aggregate-toggle card-stats';
    else if (guideStep === 'own' && !hasFirstBommel) guideHighlight = isEditMode ? 'add-first add-child-root' : 'edit-button';

    // The guide explains the aggregate switch in the sums step, so it only appears from there on;
    // the bar itself goes away while nothing would be in it
    const showAggregateToggle = !guideStep || guideStep === 'sums' || guideStep === 'own';
    const showFilterBar = !isDemoMode || showAggregateToggle || isEditMode;

    // Deep link: select the linked Bommel once the tree has loaded, or report that it does not exist
    useEffect(() => {
        if (!linkedBommelId || tree.length === 0 || isLoading || initialSelectionDone.current) return;
        initialSelectionDone.current = true;

        const targetId = parseInt(linkedBommelId, 10);
        if (isNaN(targetId)) {
            setBommelNotFound(true);
            return;
        }

        const node = tree.find((n) => n.id === targetId);
        if (node) {
            setSelectedBommel(node);
            setBommelNotFound(false);
        } else {
            setBommelNotFound(true);
            setSelectedBommel(null);
        }
    }, [linkedBommelId, tree, isLoading]);

    // Update selectedBommel when tree changes (e.g., when statistics options change)
    // Using selectedBommel?.id instead of selectedBommel to avoid infinite loops
    // and close the panel when the selected Bommel is gone after a reload (e.g. it was just deleted)
    useEffect(() => {
        if (selectedBommel) {
            const updatedBommel = tree.find((n) => n.id === selectedBommel.id);
            if (updatedBommel) {
                setSelectedBommel(updatedBommel);
            } else if (!isLoading && tree.length > 0) {
                setSelectedBommel(null);
                if (!isDemoMode) setSearchParams({}, { replace: true });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tree, selectedBommel?.id]);

    // Update URL when Bommel is selected (by user click, not initial URL load)
    const selectBommelAndUpdateUrl = useCallback(
        (node: BommelTreeNodeModel | null) => {
            setSelectedBommel(node);
            setBommelNotFound(false);
            if (node && !isDemoMode) {
                setSearchParams({ bommelId: String(node.id) }, { replace: true });
            } else if (!isDemoMode) {
                setSearchParams({}, { replace: true });
            }
        },
        [setSearchParams, isDemoMode]
    );

    // What the panel covers: the selected Bommel, plus all Bommel below it when amounts include sub-Bommel
    const panelScopeIds = useMemo(() => {
        if (!selectedBommel) return [];
        const selectedId = Number(selectedBommel.id);
        if (!statisticsOptions.aggregate) return [selectedId];
        // In the flat model top-level Bommel hang under 0, not under the root's id
        const childrenOf = (id: number | string) => tree.filter((n) => !n.data?.isRoot && n.parent === id);
        const ids = [selectedId];
        const queue = childrenOf(selectedBommel.data?.isRoot ? 0 : selectedBommel.id);
        while (queue.length > 0) {
            const next = queue.shift()!;
            ids.push(Number(next.id));
            queue.push(...childrenOf(next.id));
        }
        return ids;
    }, [selectedBommel, statisticsOptions.aggregate, tree]);

    const bommelNames = useMemo(() => new Map(tree.map((n) => [Number(n.id), n.text])), [tree]);

    const showTransactions = useCallback(
        (statuses: TransactionDisplayStatus[]) => {
            navigate(`/transactions?bommelId=${panelScopeIds.join(',')}&status=${statuses.join(',')}`);
        },
        [navigate, panelScopeIds]
    );

    const showAllReceipts = useCallback(() => {
        navigate(`/receipts?bommelId=${panelScopeIds.join(',')}&status=unreviewed`);
    }, [navigate, panelScopeIds]);

    // Esc closes the panel, unless the receipt drawer is open on top of it
    useEffect(() => {
        if (!selectedBommel) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && openReceipt === null) selectBommelAndUpdateUrl(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedBommel, openReceipt, selectBommelAndUpdateUrl]);

    const handleTreeNodeClick = useCallback(
        (nodeData: { attributes?: { id?: number } }) => {
            const node = tree.find((n) => n.id === nodeData.attributes?.id);
            selectBommelAndUpdateUrl(node || null);
        },
        [tree, selectBommelAndUpdateUrl]
    );

    const handleEdit = useCallback(
        async (nodeId: number, newName: string, newEmoji?: string) => {
            const node = tree.find((n) => n.id === nodeId);
            if (node) {
                const updatedNode = {
                    ...node,
                    text: newName,
                    data: {
                        ...node.data,
                        emoji: newEmoji || node.data?.emoji || '',
                    },
                };
                return await updateTreeNode(updatedNode);
            }
            return false;
        },
        [tree, updateTreeNode]
    );

    const handleDelete = useCallback(
        async (nodeId: number) => {
            // Deleting the selected Bommel, or one above it: close the panel and drop ?bommelId= first, so nothing can
            // look the deleted Bommel up afterwards
            if (selectedBommel && isSameOrBelow(tree, selectedBommel.id, nodeId)) selectBommelAndUpdateUrl(null);
            return await deleteTreeNode(nodeId);
        },
        [deleteTreeNode, selectedBommel, tree, selectBommelAndUpdateUrl]
    );

    const handleAddChild = useCallback(
        async (nodeId: number) => {
            return await createChildBommel(nodeId);
        },
        [createChildBommel]
    );

    const handleMove = useCallback(
        async (nodeId: number, newParentId: number) => {
            const node = tree.find((n) => n.id === nodeId);
            if (node) {
                const movedNode = {
                    ...node,
                    parent: newParentId,
                };
                setMovedSinceDragOn(true);
                return await moveTreeNode(movedNode);
            }
            return false;
        },
        [tree, moveTreeNode]
    );

    if (isOrganizationError && !isDemoMode) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="rounded-full bg-destructive/10 p-3">
                    <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>
                <p className="text-destructive font-medium">{t('bommel.loadError')}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted"
                    data-testid="structure-retry-button"
                >
                    <RefreshCw className="h-4 w-4" />
                    {t('errors.api.retry')}
                </button>
            </div>
        );
    }

    // First load only: wait for the Bommel and their amounts, so cards do not show 0 € first. Later reloads (a switch
    // flipped, a Bommel saved) keep the page in place and update the numbers.
    if (!isDemoMode && ((isLoading && tree.length === 0) || !isStatsLoaded)) {
        return <BommelSkeleton />;
    }

    return (
        <>
            <div className="h-full flex flex-col font-hanken" data-guide-highlight={guideHighlight}>
                {/* Title with the edit action, like the actions in the Transaktionen header */}
                <div className="mb-4 flex items-center justify-between gap-4">
                    <h1 className="flex items-center gap-2 text-[27px] font-extrabold leading-tight tracking-[-0.02em] text-foreground">
                        {t('bommel.title')}
                        <InfoTooltip content={t('bommel.titleInfo')} label={t('bommel.titleInfoLabel')} size={17} />
                    </h1>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {/* A help, not a mode of the own data: set apart by its dashed outline. Hidden while the guide runs (it
                            decides what is shown) and while the own structure is being edited (switching would end that). */}
                        {!guideStep && (isDemoMode || !isEditMode) && (
                            <Button
                                size="sm"
                                variant="tonal"
                                className="border border-dashed border-purple-400"
                                title={isDemoMode ? undefined : t('bommel.demoModeInfo')}
                                aria-pressed={isDemoMode}
                                onClick={() => handleDemoModeChange(!isDemoMode)}
                            >
                                {isDemoMode ? <X aria-hidden="true" /> : <Lightbulb aria-hidden="true" />}
                                {isDemoMode ? t('bommel.demoModeClose') : t('bommel.demoMode')}
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant={isEditMode ? 'default' : 'outline'}
                            icon={isEditMode ? 'Check' : 'Pencil2'}
                            data-guide="edit-button"
                            onClick={() => {
                                const newEditMode = !isEditMode;
                                setIsEditMode(newEditMode);
                                if (!newEditMode) setIsDragDropMode(false);
                            }}
                        >
                            {isEditMode ? t('bommel.done') : t('bommel.edit')}
                        </Button>
                    </div>
                </div>

                <div className="mb-4 flex flex-col gap-4 flex-shrink-0">
                    {guideStep && (
                        <GuideCard
                            step={guideStep}
                            isEditMode={isEditMode}
                            hasFirstBommel={hasFirstBommel}
                            onStep={setGuideStep}
                            onStartEditing={() => setIsEditMode(true)}
                            onClose={closeGuide}
                        />
                    )}
                    {!guideStep && isDemoMode && (
                        <HintBanner
                            icon={Info}
                            action={
                                <Button size="sm" variant="default" onClick={() => setGuideStep('example')}>
                                    <Play size={14} aria-hidden="true" />
                                    {t('bommel.guide.start')}
                                </Button>
                            }
                        >
                            {t('bommel.demoBanner')}
                        </HintBanner>
                    )}
                    {!guideStep && !isDemoMode && structureIsEmpty && <HintBanner icon={Lightbulb}>{t('bommel.emptyHint')}</HintBanner>}

                    {/* Folds open and shut instead of popping in; the negative margin takes back the gap of the column while it is shut */}
                    <div
                        inert={!showFilterBar}
                        className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none ${
                            showFilterBar ? 'grid-rows-[1fr] opacity-100' : '-mt-4 grid-rows-[0fr] opacity-0'
                        }`}
                    >
                        {/* The padding keeps the shadow of the bar from being cut off by the overflow */}
                        <div className="-m-1 min-h-0 overflow-hidden p-1">
                            <div className="flex flex-wrap items-center gap-x-[30px] gap-y-3 rounded-[18px] border border-border-soft bg-background-secondary px-[18px] py-3 shadow-[var(--shadow-sm)]">
                                {/* Filters from broad to narrow: which period, which Bommel, which transactions */}
                                {/* Each field fades in when it appears, e.g. when the guide moves from the example to the own structure */}
                                {!isDemoMode && (
                                    <div className={cn('w-full sm:w-auto', SOFT_ENTER)}>
                                        <PeriodField period={period} onChange={setPeriod} />
                                    </div>
                                )}
                                {showAggregateToggle && (
                                    <div className={SOFT_ENTER}>
                                        <ToggleField
                                            label={t('bommel.aggregate')}
                                            info={t('bommel.aggregateInfo')}
                                            checked={statisticsOptions.aggregate}
                                            onCheckedChange={setAggregate}
                                            guideTarget="aggregate-toggle"
                                        />
                                    </div>
                                )}
                                {!isDemoMode && (
                                    <div className={SOFT_ENTER}>
                                        <ToggleField
                                            label={t('bommel.includeDrafts')}
                                            info={t('bommel.includeDraftsInfo')}
                                            checked={statisticsOptions.includeDrafts}
                                            onCheckedChange={setIncludeDrafts}
                                        />
                                    </div>
                                )}

                                {/* The switch of the edit mode on the right, apart from the filters; on small screens a row under them */}
                                {isEditMode && (
                                    <div className="flex items-center gap-[30px] sm:ml-auto">
                                        <ToggleField
                                            label={t('bommel.dragDrop')}
                                            info={t('bommel.dragDropInfo')}
                                            checked={isDragDropMode}
                                            onCheckedChange={setIsDragDropMode}
                                            guideTarget="drag-toggle"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* One notice at a time: the example banner and the empty-structure hint (which already says what to do) win over it */}
                    {isEditMode && !isDemoMode && !structureIsEmpty && !guideStep && <EditModeBanner />}

                    {/* Only while the broken link is still in the URL: selecting or deleting a Bommel replaces it */}
                    {bommelNotFound && searchParams.has('bommelId') && (
                        <HintBanner icon={AlertCircle}>
                            {t('bommel.details.bommelNotFound')}. {t('bommel.details.bommelNotFoundDescription')}
                        </HintBanner>
                    )}
                </div>

                <div className={`grid flex-1 min-h-0 grid-cols-1 gap-4 ${selectedBommel ? 'lg:grid-cols-[minmax(0,1fr)_340px]' : ''}`}>
                    <div ref={treeAreaRef} className="relative flex flex-col min-h-0">
                        <BommelTreeComponent
                            // Remounted when switching between example and own structure, and fades in each time
                            className={cn('flex-1', SOFT_ENTER)}
                            key={`tree-${isDemoMode}`}
                            tree={tree}
                            rootBommel={rootBommel}
                            editable={isEditMode}
                            dragDropEnabled={isDragDropMode}
                            selectedId={selectedBommel ? Number(selectedBommel.id) : null}
                            // Fit as if the panel were not there, so opening it crops the tree instead of rescaling it
                            fitExtraWidth={selectedBommel && panelBeside ? PANEL_SPACE : 0}
                            onNodeClick={handleTreeNodeClick}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onAddChild={handleAddChild}
                            onMove={handleMove}
                            onRequestEdit={() => setIsEditMode(true)}
                            // The example works out the delete dialog's counts itself instead of asking the server
                            deleteImpact={isDemoMode ? demoTreeData.deleteImpact : undefined}
                        />
                        {isDragDropMode && !movedSinceDragOn && (
                            <DragHint containerRef={treeAreaRef} tree={tree} preferred={isDemoMode ? DEMO_DRAG_HINT : undefined} />
                        )}
                        {/* While amounts include the Bommel below: arrows flowing up the connectors, from every Bommel into the one
                            above. Not while editing, where the add buttons sit on those connectors. */}
                        {statisticsOptions.aggregate && !isEditMode && (
                            <SumFlowHint containerRef={treeAreaRef} tree={tree} vertical={verticalTree} tone={guideStep === 'sums' ? 'guide' : 'default'} />
                        )}
                    </div>

                    {selectedBommel && (
                        <div className="min-h-0">
                            <BommelDetailsPanel
                                node={selectedBommel}
                                scopeIds={panelScopeIds}
                                includesSubBommel={panelScopeIds.length > 1}
                                bommelNames={bommelNames}
                                demo={isDemoMode}
                                periodLabel={periodLabel(period, t, i18n.language)}
                                showHint={!panelHintSeen}
                                onDismissHint={() => setPanelHintSeen(true)}
                                onClose={() => selectBommelAndUpdateUrl(null)}
                                onOpenTransaction={(id) => navigate(`/transactions?id=${id}`)}
                                onOpenReceipt={setOpenReceipt}
                                onShowTransactions={showTransactions}
                                onShowAllReceipts={showAllReceipts}
                            />
                        </div>
                    )}
                </div>

                <ReviewDrawer doc={openReceipt} onClose={() => setOpenReceipt(null)} onDeleted={() => setOpenReceipt(null)} />
            </div>
        </>
    );
}

export default BommelView;
