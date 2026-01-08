
import { useState, useCallback } from 'react';
import { Board, CanvasItem } from '../types';

interface UseCanvasInteractionProps {
  board: Board;
  user: { name: string };
  onUpdateBoard: (board: Board, saveToCloud?: boolean) => void;
  latestItemsRef: React.MutableRefObject<CanvasItem[]>;
}

export const useCanvasInteraction = ({
  board,
  user,
  onUpdateBoard,
  latestItemsRef
}: UseCanvasInteractionProps) => {
  // Interaction States
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [resizingItemId, setResizingItemId] = useState<string | null>(null);
  const [rotatingItemId, setRotatingItemId] = useState<string | null>(null);
  
  // Group Mode States
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const [isDraggingGroup, setIsDraggingGroup] = useState(false);
  const [isResizingGroup, setIsResizingGroup] = useState(false);

  // Calculation States
  const [interactionStart, setInteractionStart] = useState({ x: 0, y: 0, rotation: 0 });
  const [itemInitialState, setItemInitialState] = useState<any>(null); 
  const [groupInitialState, setGroupInitialState] = useState<any>(null);

  // Helpers
  const getSelectedItems = useCallback(() => {
    return board.items.filter(i => selectedIds.includes(i.id));
  }, [board.items, selectedIds]);

  const getGroupBounds = useCallback(() => {
    const items = getSelectedItems();
    if (items.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach(item => {
        const w = item.width || 50;
        const h = item.height || 50;
        minX = Math.min(minX, item.x);
        minY = Math.min(minY, item.y);
        maxX = Math.max(maxX, item.x + w);
        maxY = Math.max(maxY, item.y + h);
    });
    return { x: minX - 10, y: minY - 10, width: (maxX - minX) + 20, height: (maxY - minY) + 20 };
  }, [getSelectedItems]);

  // Handlers
  const handlePointerDown = useCallback((e: React.PointerEvent, id?: string) => {
    // Group Mode Logic
    if (isGroupMode) {
        if (id) {
            e.stopPropagation();
            if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(pid => pid !== id));
            else setSelectedIds(prev => [...prev, id]);
        } else {
            // Start Rubber Band
            setSelectionBox({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
            setInteractionStart({ x: e.clientX, y: e.clientY, rotation: 0 });
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            setSelectedIds([]);
        }
        return; 
    }

    // Normal Mode
    if (id) {
      setActiveItemId(id);
      const item = board.items.find(i => i.id === id);
      if (item) {
        setDraggedItemId(id);
        setInteractionStart({ x: e.clientX, y: e.clientY, rotation: 0 });
        setItemInitialState({ ...item });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    } else {
      setActiveItemId(null); // Clicked background
    }
  }, [board, isGroupMode, selectedIds]);

  const handleResizeStart = useCallback((e: React.PointerEvent, id: string) => {
    const item = board.items.find(i => i.id === id);
    if (item) {
      setResizingItemId(id);
      setActiveItemId(id);
      setInteractionStart({ x: e.clientX, y: e.clientY, rotation: 0 });
      const isText = item.type === 'TEXT';
      const isEmoji = item.type === 'EMOJI';
      const defaultWidth = isText ? 250 : (isEmoji ? 100 : 200);
      const defaultHeight = isText ? undefined : (isEmoji ? 100 : 200);
      setItemInitialState({ ...item, width: item.width ?? defaultWidth, height: item.height ?? defaultHeight });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [board]);

  const handleRotateStart = useCallback((e: React.PointerEvent, id: string) => {
    const item = board.items.find(i => i.id === id);
    if (item) {
      setRotatingItemId(id);
      setActiveItemId(id);
      const centerX = item.x + (item.width || 0) / 2;
      const centerY = item.y + (item.height || 0) / 2;
      setInteractionStart({ x: e.clientX, y: e.clientY, rotation: Math.atan2(e.clientY - centerY, e.clientX - centerX) });
      setItemInitialState({ ...item });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [board]);

  const handleGroupPointerDown = (e: React.PointerEvent) => {
     e.stopPropagation();
     setIsDraggingGroup(true);
     setInteractionStart({ x: e.clientX, y: e.clientY, rotation: 0 });
     setGroupInitialState({ items: JSON.parse(JSON.stringify(getSelectedItems())) });
     (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleGroupResizeDown = (e: React.PointerEvent) => {
     e.stopPropagation();
     setIsResizingGroup(true);
     setInteractionStart({ x: e.clientX, y: e.clientY, rotation: 0 });
     setGroupInitialState({ items: JSON.parse(JSON.stringify(getSelectedItems())), bounds: getGroupBounds() });
     (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Rubber Band
    if (isGroupMode && selectionBox) {
        const currentX = e.clientX;
        const currentY = e.clientY;
        setSelectionBox({
            x: Math.min(currentX, interactionStart.x),
            y: Math.min(currentY, interactionStart.y),
            w: Math.abs(currentX - interactionStart.x),
            h: Math.abs(currentY - interactionStart.y)
        });
        return;
    }

    let updatedItems = [...board.items];
    let hasChanges = false;
    const deltaX = e.clientX - interactionStart.x;
    const deltaY = e.clientY - interactionStart.y;

    if (isGroupMode && (isDraggingGroup || isResizingGroup) && groupInitialState) {
        e.preventDefault();
        hasChanges = true;
        if (isDraggingGroup) {
            const selectedItemIds = groupInitialState.items.map((i: any) => i.id);
            updatedItems = updatedItems.map(item => {
                if (selectedItemIds.includes(item.id)) {
                    const initial = groupInitialState.items.find((i: any) => i.id === item.id);
                    return { ...item, x: initial.x + deltaX, y: initial.y + deltaY };
                }
                return item;
            });
        } else if (isResizingGroup && groupInitialState.bounds) {
             const ib = groupInitialState.bounds;
             const scaleX = Math.max(50, ib.width + deltaX) / ib.width;
             const scaleY = Math.max(50, ib.height + deltaY) / ib.height;
             const selectedItemIds = groupInitialState.items.map((i: any) => i.id);
             updatedItems = updatedItems.map(item => {
                if (selectedItemIds.includes(item.id)) {
                    const initial = groupInitialState.items.find((i: any) => i.id === item.id);
                    const relX = initial.x - ib.x;
                    const relY = initial.y - ib.y;
                    return { 
                        ...item, 
                        x: ib.x + (relX * scaleX),
                        y: ib.y + (relY * scaleY),
                        width: (initial.width || 50) * scaleX,
                        height: initial.height ? (initial.height * scaleY) : undefined,
                        fontSize: initial.fontSize ? initial.fontSize * scaleX : undefined
                    };
                }
                return item;
             });
        }
    } else if ((draggedItemId || resizingItemId || rotatingItemId) && itemInitialState) {
        e.preventDefault();
        hasChanges = true;
        if (draggedItemId) {
          updatedItems = board.items.map(i => i.id === draggedItemId ? { ...i, x: itemInitialState.x + deltaX, y: itemInitialState.y + deltaY } : i);
        } else if (resizingItemId) {
          updatedItems = board.items.map(i => i.id === resizingItemId ? { 
            ...i, 
            width: Math.max(50, (itemInitialState.width || 0) + deltaX),
            height: itemInitialState.height ? Math.max(50, itemInitialState.height + deltaY) : undefined 
          } : i);
        } else if (rotatingItemId) {
          const centerX = itemInitialState.x + (itemInitialState.width || 0) / 2;
          const centerY = itemInitialState.y + (itemInitialState.height || 0) / 2;
          const currentRotation = Math.atan2(e.clientY - centerY, e.clientX - centerX);
          const deg = (currentRotation - interactionStart.rotation) * (180 / Math.PI);
          updatedItems = board.items.map(i => i.id === rotatingItemId ? { ...i, rotation: (itemInitialState.rotation || 0) + deg } : i);
        }
    }

    if (hasChanges) {
        latestItemsRef.current = updatedItems;
        onUpdateBoard({ ...board, items: updatedItems }, false);
    }
  }, [draggedItemId, resizingItemId, rotatingItemId, interactionStart, itemInitialState, board, onUpdateBoard, isGroupMode, isDraggingGroup, isResizingGroup, groupInitialState, selectionBox]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isGroupMode && selectionBox) {
        const r1 = { left: selectionBox.x, right: selectionBox.x + selectionBox.w, top: selectionBox.y, bottom: selectionBox.y + selectionBox.h };
        const newSelectedIds: string[] = [];
        board.items.forEach(item => {
            const itemW = item.width || 50;
            const itemH = item.height || 50;
            const r2 = { left: item.x, right: item.x + itemW, top: item.y, bottom: item.y + itemH };
            if (r1.left < r2.right && r1.right > r2.left && r1.top < r2.bottom && r1.bottom > r2.top) {
                if (item.author === user.name || user.name === board.host) newSelectedIds.push(item.id);
            }
        });
        setSelectedIds(newSelectedIds);
        setSelectionBox(null);
        return;
    }

    if (draggedItemId || resizingItemId || rotatingItemId || isDraggingGroup || isResizingGroup) {
      setDraggedItemId(null);
      setResizingItemId(null);
      setRotatingItemId(null);
      setIsDraggingGroup(false);
      setIsResizingGroup(false);
      setItemInitialState(null);
      setGroupInitialState(null);
      onUpdateBoard({ ...board, items: latestItemsRef.current }, true); 
    }
  }, [draggedItemId, resizingItemId, rotatingItemId, isDraggingGroup, isResizingGroup, board, onUpdateBoard, selectionBox, isGroupMode, user.name]);

  return {
    activeItemId,
    setActiveItemId,
    draggedItemId,
    resizingItemId,
    rotatingItemId,
    isGroupMode,
    setIsGroupMode,
    selectedIds,
    setSelectedIds,
    selectionBox,
    isDraggingGroup,
    isResizingGroup,
    getGroupBounds,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleResizeStart,
    handleRotateStart,
    handleGroupPointerDown,
    handleGroupResizeDown
  };
};
