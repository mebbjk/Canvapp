
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Board, CanvasItem, ItemType, User } from '../types';
import DraggableItem from './DraggableItem';
import Toolbar from './Toolbar';
import DrawingPad from './DrawingPad';
import { translations } from '../translations';
import { generateId } from '../utils/helpers';
import { Link as LinkIcon, Trash2, Globe, Save, Loader2, ArrowLeft } from 'lucide-react';

interface CanvasBoardProps {
  board: Board;
  user: User;
  isOnline: boolean;
  isSaving: boolean;
  language: string;
  onUpdateBoard: (board: Board, saveToCloud?: boolean) => void;
  onBack: () => void;
  onShare: () => void;
  setToast: (toast: any) => void;
}

const CanvasBoard: React.FC<CanvasBoardProps> = ({ 
  board, user, isOnline, isSaving, language, onUpdateBoard, onBack, onShare, setToast 
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Refs to track latest state for pointer events
  const latestItemsRef = useRef<CanvasItem[]>(board.items);

  // Dragging / Resizing / Rotating State
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [resizingItemId, setResizingItemId] = useState<string | null>(null);
  const [rotatingItemId, setRotatingItemId] = useState<string | null>(null);
  
  // Group Mode State
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [isDraggingGroup, setIsDraggingGroup] = useState(false);
  const [isResizingGroup, setIsResizingGroup] = useState(false);

  // Update refs when board changes
  useEffect(() => {
    // Only update ref if we are NOT currently interacting to avoid jitter
    if (!draggedItemId && !resizingItemId && !rotatingItemId && !isDraggingGroup && !isResizingGroup) {
      latestItemsRef.current = board.items;
    }
  }, [board.items, draggedItemId, resizingItemId, rotatingItemId, isDraggingGroup, isResizingGroup]);

  // Interaction tracking
  const [interactionStart, setInteractionStart] = useState({ x: 0, y: 0, rotation: 0 });
  const [itemInitialState, setItemInitialState] = useState<any>(null); 
  const [groupInitialState, setGroupInitialState] = useState<any>(null); 

  // Drawing Pad Modal State
  const [isDrawingPadOpen, setIsDrawingPadOpen] = useState(false);

  // @ts-ignore
  const t = translations[language];

  // Helper: Get user's items
  const getUserItems = useCallback(() => {
    return board.items.filter(i => i.author === user.name);
  }, [board.items, user.name]);

  // Helper: Calculate Group Bounds
  const getGroupBounds = useCallback(() => {
    const items = getUserItems();
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
  }, [getUserItems]);

  // --- Actions ---

  const handleManualSave = () => {
      const finalBoardState = { ...board, items: latestItemsRef.current };
      onUpdateBoard(finalBoardState, true);
      setToast({ message: t.save_indicator, type: 'success' });
  };

  const addItem = useCallback((type: ItemType, content: string, color?: string, textColor?: string) => {
    const myItems = getUserItems();
    if (board.maxItemsPerUser && board.maxItemsPerUser > 0 && myItems.length >= board.maxItemsPerUser) {
        setToast({ message: t.limitReached, type: 'error' });
        return;
    }

    // Add relative to center of current view (approximate)
    const viewportX = window.innerWidth / 2;
    const viewportY = window.innerHeight / 2;
    const randX = (Math.random() - 0.5) * 100;
    const randY = (Math.random() - 0.5) * 100;

    let width = 200;
    let height = 200;
    if (type === ItemType.TEXT) { width = 250; height = undefined as any; }
    else if (type === ItemType.EMOJI) { width = 100; height = 100; }

    const newItem: CanvasItem = {
      id: generateId(),
      type, content, x: viewportX + randX - 100, y: viewportY + randY - 100,
      rotation: (Math.random() - 0.5) * 10,
      author: user.name, createdAt: Date.now(), color, textColor, width, height,
      fontSize: 20
    };

    const updatedBoard = { ...board, items: [...board.items, newItem] };
    onUpdateBoard(updatedBoard, true);
  }, [board, user, onUpdateBoard, getUserItems, t, setToast]);

  const handleAddDrawing = (base64: string) => {
    addItem(ItemType.IMAGE, base64);
    setIsDrawingPadOpen(false);
  };

  const deleteItem = (id: string) => {
    const updatedBoard = { ...board, items: board.items.filter(i => i.id !== id) };
    onUpdateBoard(updatedBoard, true);
  };

  const deleteGroup = () => {
    const updatedBoard = { ...board, items: board.items.filter(i => i.author !== user.name) };
    onUpdateBoard(updatedBoard, true);
    setIsGroupMode(false);
  };

  const changeItemLayer = (id: string, direction: 'front' | 'back') => {
    const items = [...board.items];
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return;
    const [item] = items.splice(index, 1);
    if (direction === 'front') items.push(item);
    else items.unshift(item);
    onUpdateBoard({ ...board, items }, true);
  };

  const updateItem = (id: string, data: Partial<CanvasItem>) => {
    const items = board.items.map(i => i.id === id ? { ...i, ...data } : i);
    onUpdateBoard({ ...board, items }, true);
  };

  const togglePublish = () => {
    const newStatus = !board.isPublic;
    onUpdateBoard({ ...board, isPublic: newStatus }, true);
    setToast({ 
        message: newStatus ? t.publish_confirm : t.unpublish_confirm, 
        type: 'success' 
    });
  };

  // --- Pointer Events (Drag/Resize/Rotate) ---

  const handlePointerDown = useCallback((e: React.PointerEvent, id?: string) => {
    if (isGroupMode) return;
    if (id) {
      const item = board.items.find(i => i.id === id);
      if (item) {
        setDraggedItemId(id);
        setInteractionStart({ x: e.clientX, y: e.clientY, rotation: 0 });
        setItemInitialState({ ...item });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    }
  }, [board, isGroupMode]);

  const handleResizeStart = useCallback((e: React.PointerEvent, id: string) => {
    if (isGroupMode) return;
    const item = board.items.find(i => i.id === id);
    if (item) {
      setResizingItemId(id);
      setInteractionStart({ x: e.clientX, y: e.clientY, rotation: 0 });
      
      const isText = item.type === ItemType.TEXT;
      const isEmoji = item.type === ItemType.EMOJI;
      const defaultWidth = isText ? 250 : (isEmoji ? 100 : 200);
      const defaultHeight = isText ? undefined : (isEmoji ? 100 : 200);
      
      setItemInitialState({ 
        ...item, 
        width: item.width ?? defaultWidth, 
        height: item.height ?? defaultHeight 
      });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [board, isGroupMode]);

  const handleRotateStart = useCallback((e: React.PointerEvent, id: string) => {
    if (isGroupMode) return;
    const item = board.items.find(i => i.id === id);
    if (item) {
      setRotatingItemId(id);
      const centerX = item.x + (item.width || 0) / 2;
      const centerY = item.y + (item.height || 0) / 2;
      const startAngleRadians = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      setInteractionStart({ x: e.clientX, y: e.clientY, rotation: startAngleRadians });
      setItemInitialState({ ...item });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [board, isGroupMode]);

  const handleGroupPointerDown = (e: React.PointerEvent) => {
     e.stopPropagation();
     setIsDraggingGroup(true);
     setInteractionStart({ x: e.clientX, y: e.clientY, rotation: 0 });
     setGroupInitialState({
         items: JSON.parse(JSON.stringify(getUserItems()))
     });
     (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleGroupResizeDown = (e: React.PointerEvent) => {
     e.stopPropagation();
     setIsResizingGroup(true);
     setInteractionStart({ x: e.clientX, y: e.clientY, rotation: 0 });
     const bounds = getGroupBounds();
     setGroupInitialState({
         items: JSON.parse(JSON.stringify(getUserItems())),
         bounds: bounds
     });
     (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };


  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Determine updated items based on move logic
    let updatedItems = [...board.items];
    let hasChanges = false;

    const deltaX = e.clientX - interactionStart.x;
    const deltaY = e.clientY - interactionStart.y;

    // --- Group Logic ---
    if (isGroupMode && (isDraggingGroup || isResizingGroup) && groupInitialState) {
        e.preventDefault();
        hasChanges = true;

        if (isDraggingGroup) {
            const userItemIds = groupInitialState.items.map((i: any) => i.id);
            updatedItems = updatedItems.map(item => {
                if (userItemIds.includes(item.id)) {
                    const initial = groupInitialState.items.find((i: any) => i.id === item.id);
                    return { ...item, x: initial.x + deltaX, y: initial.y + deltaY };
                }
                return item;
            });
        } else if (isResizingGroup && groupInitialState.bounds) {
             const initialBounds = groupInitialState.bounds;
             const newWidth = Math.max(50, initialBounds.width + deltaX);
             const newHeight = Math.max(50, initialBounds.height + deltaY);
             const scaleX = newWidth / initialBounds.width;
             const scaleY = newHeight / initialBounds.height;
             const userItemIds = groupInitialState.items.map((i: any) => i.id);
             
             updatedItems = updatedItems.map(item => {
                if (userItemIds.includes(item.id)) {
                    const initial = groupInitialState.items.find((i: any) => i.id === item.id);
                    const relX = initial.x - initialBounds.x;
                    const relY = initial.y - initialBounds.y;
                    const w = (initial.width || 50) * scaleX;
                    const h = initial.height ? (initial.height * scaleY) : undefined;
                    
                    return { 
                        ...item, 
                        x: initialBounds.x + (relX * scaleX),
                        y: initialBounds.y + (relY * scaleY),
                        width: w,
                        height: h,
                        fontSize: initial.fontSize ? initial.fontSize * scaleX : undefined
                    };
                }
                return item;
             });
        }
    } 
    // --- Single Item Logic ---
    else if ((draggedItemId || resizingItemId || rotatingItemId) && itemInitialState) {
        e.preventDefault();
        hasChanges = true;

        if (draggedItemId) {
          updatedItems = board.items.map(item => item.id === draggedItemId ? { 
            ...item, 
            x: itemInitialState.x + deltaX, 
            y: itemInitialState.y + deltaY 
          } : item);
        } else if (resizingItemId) {
          updatedItems = board.items.map(item => item.id === resizingItemId ? { 
            ...item, 
            width: Math.max(50, (itemInitialState.width || 0) + deltaX),
            height: itemInitialState.height ? Math.max(50, itemInitialState.height + deltaY) : undefined 
          } : item);
        } else if (rotatingItemId) {
          const centerX = itemInitialState.x + (itemInitialState.width || 0) / 2;
          const centerY = itemInitialState.y + (itemInitialState.height || 0) / 2;
          const currentAngleRadians = Math.atan2(e.clientY - centerY, e.clientX - centerX);
          const angleDifferenceRadians = currentAngleRadians - interactionStart.rotation;
          const angleDifferenceDegrees = angleDifferenceRadians * (180 / Math.PI);
          const newRotation = (itemInitialState.rotation || 0) + angleDifferenceDegrees;

          updatedItems = board.items.map(item => item.id === rotatingItemId ? {
            ...item,
            rotation: newRotation
          } : item);
        }
    }

    if (hasChanges) {
        latestItemsRef.current = updatedItems;
        onUpdateBoard({ ...board, items: updatedItems }, false);
    }
    
  }, [draggedItemId, resizingItemId, rotatingItemId, interactionStart, itemInitialState, board, onUpdateBoard, isGroupMode, isDraggingGroup, isResizingGroup, groupInitialState]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (draggedItemId || resizingItemId || rotatingItemId || isDraggingGroup || isResizingGroup) {
      setDraggedItemId(null);
      setResizingItemId(null);
      setRotatingItemId(null);
      setIsDraggingGroup(false);
      setIsResizingGroup(false);
      setItemInitialState(null);
      setGroupInitialState(null);
      
      const finalBoardState = { ...board, items: latestItemsRef.current };
      onUpdateBoard(finalBoardState, true); 
    }
  }, [draggedItemId, resizingItemId, rotatingItemId, isDraggingGroup, isResizingGroup, board, onUpdateBoard]);

  const getBoardStyle = () => {
    const style: React.CSSProperties = {
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      touchAction: 'none',
      cursor: 'default'
    };

    if (board.backgroundImage) {
      style.backgroundImage = `url(${board.backgroundImage})`;
      style.backgroundSize = board.backgroundSize || 'cover';
    } else if (board.backgroundColor) {
      style.backgroundColor = board.backgroundColor;
    } else {
      style.backgroundColor = '#f8fafc';
      style.backgroundImage = 'radial-gradient(#64748b 1px, transparent 1px)';
      style.backgroundSize = '24px 24px';
    }
    return style;
  };

  const groupBounds = isGroupMode ? getGroupBounds() : null;
  const isHost = user.name === board.host;

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      
      {/* 1. SEPARATE TOP BAR STRIP */}
      <div className="flex-none bg-white border-b border-slate-200 p-2 sm:px-4 flex items-center justify-between z-[100] shadow-sm relative">
          
          {/* Left: Back & Title */}
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft size={20} />
            </button>
            
            <div className="flex flex-col">
                <span className="font-bold text-slate-800 text-sm sm:text-base leading-tight truncate max-w-[150px] sm:max-w-xs">
                    {board.topic}
                </span>
                
                {/* 4. CONNECTION INDICATOR (Small Dot) */}
                <div className="flex items-center gap-1.5 mt-0.5">
                   <div 
                      className={`w-2 h-2 rounded-full ${isOnline ? 'bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.6)]' : 'bg-slate-300'}`} 
                      title={isOnline ? t.status_online : t.status_offline}
                   ></div>
                   <span className="text-[10px] text-slate-400 font-medium">
                       {isSaving ? t.saving_indicator : (isOnline ? t.status_online : t.status_offline)}
                   </span>
                </div>
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            
            {/* Manual Save Button */}
            {isOnline && (
                <button 
                    onClick={handleManualSave}
                    className="p-2 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-colors relative group"
                    title={t.manualSave}
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin text-indigo-500"/> : <Save size={18} />}
                </button>
            )}

            {/* Share Link */}
            <button onClick={onShare} className="flex items-center gap-2 bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors text-sm font-medium">
              <LinkIcon size={14} /> <span className="hidden sm:inline">{t.shareLink}</span>
            </button>

            {/* Publish Toggle (Host Only) */}
            {isHost && (
                <button 
                    onClick={togglePublish} 
                    className={`p-2 rounded-full transition-all ${board.isPublic ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}
                    title={board.isPublic ? t.unpublish_btn : t.publish_btn}
                >
                    <Globe size={18} /> 
                </button>
            )}
          </div>
      </div>

      {/* 2. CANVAS AREA (Fills Remaining Space) */}
      <div 
        className="flex-1 relative touch-none overflow-hidden"
        style={getBoardStyle()} 
        onPointerDown={(e) => handlePointerDown(e)} 
        onPointerMove={handlePointerMove} 
        onPointerUp={handlePointerUp} 
        onPointerLeave={handlePointerUp} 
        ref={canvasRef}
      >
        {!board.backgroundImage && <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>}
        
        {board.items.length === 0 && (
            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none animate-pulse px-4 ${board.backgroundImage || (board.backgroundColor && board.backgroundColor !== '#f8fafc') ? 'text-white drop-shadow-md' : 'text-slate-300'}`}>
              <div className="text-center">
                <h2 className="text-2xl sm:text-4xl font-bold mb-2 opacity-50">{t.emptyBoardTitle}</h2>
                <p className="text-sm sm:text-base">{t.emptyBoardSubtitle}</p>
              </div>
            </div>
          )}
          
          {/* Render Individual Items */}
          {board.items.map(item => (
            <DraggableItem 
              key={item.id} 
              item={item} 
              currentUser={user} 
              hostName={board.host} 
              onPointerDown={(e, id) => handlePointerDown(e, id)} 
              onResizeStart={(e, id) => handleResizeStart(e, id)}
              onRotateStart={(e, id) => handleRotateStart(e, id)} 
              onDelete={deleteItem} 
              onLayerChange={changeItemLayer} 
              onUpdate={updateItem}
              isDragging={draggedItemId === item.id || rotatingItemId === item.id || (isDraggingGroup && item.author === user.name && isGroupMode)} 
            />
          ))}

          {/* Group Overlay Layer */}
          {isGroupMode && groupBounds && (
            <div 
                className="absolute border-2 border-orange-500 border-dashed bg-orange-500/10 cursor-move z-[60] group"
                style={{
                    left: groupBounds.x,
                    top: groupBounds.y,
                    width: groupBounds.width,
                    height: groupBounds.height,
                    touchAction: 'none'
                }}
                onPointerDown={handleGroupPointerDown}
            >
                <div className="absolute -top-7 left-0 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-t-md flex items-center gap-2">
                    {t.toolGroup}
                    <button onPointerDown={(e) => { e.stopPropagation(); deleteGroup(); }} className="hover:text-red-200"><Trash2 size={12} /></button>
                </div>
                <div 
                  className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize flex items-center justify-center"
                  onPointerDown={handleGroupResizeDown}
                >
                    <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white"></div>
                </div>
            </div>
          )}
        
        {/* Toolbar Floating over Canvas (Bottom Center) */}
        <Toolbar 
          onAddText={(text, color, textColor) => addItem(ItemType.TEXT, text, color, textColor)} 
          onAddImage={(base64) => addItem(ItemType.IMAGE, base64)} 
          onAddEmoji={(emoji) => addItem(ItemType.EMOJI, emoji)} 
          onAddSticker={(sticker) => addItem(ItemType.STICKER, sticker)}
          onOpenDrawingPad={() => setIsDrawingPadOpen(true)}
          isGroupMode={isGroupMode}
          onToggleGroupMode={() => setIsGroupMode(!isGroupMode)}
          board={board}
          user={user}
          onUpdateBoard={onUpdateBoard}
          t={t} 
          setToast={setToast}
        />
      </div>

      {isDrawingPadOpen && (
        <DrawingPad 
          onClose={() => setIsDrawingPadOpen(false)} 
          onAdd={handleAddDrawing}
          t={t}
        />
      )}
    </div>
  );
};

export default CanvasBoard;
