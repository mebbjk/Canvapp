
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Board, CanvasItem, ItemType, User } from '../types';
import DraggableItem from './DraggableItem';
import Toolbar from './Toolbar';
import DrawingPad from './DrawingPad';
import { translations } from '../translations';
import { compressImage, generateId } from '../utils/helpers';
import { Link as LinkIcon, Trash2, Globe, Check, Cloud, Save } from 'lucide-react';

interface CanvasBoardProps {
  board: Board;
  user: User;
  isOnline: boolean;
  language: string;
  onUpdateBoard: (board: Board) => void;
  onBack: () => void;
  onShare: () => void;
  setToast: (toast: any) => void;
}

const CanvasBoard: React.FC<CanvasBoardProps> = ({ 
  board, user, isOnline, language, onUpdateBoard, onBack, onShare, setToast 
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Dragging / Resizing / Rotating State
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [resizingItemId, setResizingItemId] = useState<string | null>(null);
  const [rotatingItemId, setRotatingItemId] = useState<string | null>(null);
  
  // Group Mode State
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [isDraggingGroup, setIsDraggingGroup] = useState(false);
  const [isResizingGroup, setIsResizingGroup] = useState(false);

  // Interaction tracking
  const [interactionStart, setInteractionStart] = useState({ x: 0, y: 0, rotation: 0 });
  const [itemInitialState, setItemInitialState] = useState<any>(null); // For single item
  const [groupInitialState, setGroupInitialState] = useState<any>(null); // For group: { items: [], bounds: {} }

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
        // Approximate bounds since rotation makes it complex, using axis-aligned bounding box
        // For better UX in simple grouping, we just use x, y + width, height
        const w = item.width || 50;
        const h = item.height || 50;
        minX = Math.min(minX, item.x);
        minY = Math.min(minY, item.y);
        maxX = Math.max(maxX, item.x + w);
        maxY = Math.max(maxY, item.y + h);
    });

    // Add some padding
    return { x: minX - 10, y: minY - 10, width: (maxX - minX) + 20, height: (maxY - minY) + 20 };
  }, [getUserItems]);

  // --- Actions ---

  const addItem = useCallback((type: ItemType, content: string, color?: string, textColor?: string) => {
    // 1. Check Limits
    const myItems = getUserItems();
    if (board.maxItemsPerUser && board.maxItemsPerUser > 0 && myItems.length >= board.maxItemsPerUser) {
        setToast({ message: t.limitReached, type: 'error' });
        return;
    }

    const viewportX = window.innerWidth / 2;
    const viewportY = window.innerHeight / 2;
    const randX = (Math.random() - 0.5) * 150;
    const randY = (Math.random() - 0.5) * 150;

    let width = 200;
    let height = 200;
    if (type === ItemType.TEXT) { width = 250; height = undefined as any; }
    else if (type === ItemType.EMOJI) { width = 100; height = 100; }

    const newItem: CanvasItem = {
      id: generateId(),
      type, content, x: viewportX + randX - 100, y: viewportY + randY - 100,
      rotation: (Math.random() - 0.5) * 10,
      author: user.name, createdAt: Date.now(), color, textColor, width, height,
      fontSize: 20 // Default font size
    };

    const updatedBoard = { ...board, items: [...board.items, newItem] };
    onUpdateBoard(updatedBoard);
  }, [board, user, onUpdateBoard, getUserItems, t, setToast]);

  const handleAddDrawing = (base64: string) => {
    addItem(ItemType.IMAGE, base64); // Treat drawings as transparent stickers/images
    setIsDrawingPadOpen(false);
  };

  const deleteItem = (id: string) => {
    const updatedBoard = { ...board, items: board.items.filter(i => i.id !== id) };
    onUpdateBoard(updatedBoard);
  };

  const deleteGroup = () => {
    const updatedBoard = { ...board, items: board.items.filter(i => i.author !== user.name) };
    onUpdateBoard(updatedBoard);
    setIsGroupMode(false); // Exit group mode after deleting
  };

  const changeItemLayer = (id: string, direction: 'front' | 'back') => {
    const items = [...board.items];
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return;
    const [item] = items.splice(index, 1);
    if (direction === 'front') items.push(item);
    else items.unshift(item);
    onUpdateBoard({ ...board, items });
  };

  const updateItem = (id: string, data: Partial<CanvasItem>) => {
    const items = board.items.map(i => i.id === id ? { ...i, ...data } : i);
    onUpdateBoard({ ...board, items });
  };

  // Toggle Publish State
  const togglePublish = () => {
    const newStatus = !board.isPublic;
    onUpdateBoard({ ...board, isPublic: newStatus });
    setToast({ 
        message: newStatus ? t.publish_confirm : t.unpublish_confirm, 
        type: 'success' 
    });
  };

  // --- Pointer Events (Drag/Resize/Rotate) ---

  const handlePointerDown = useCallback((e: React.PointerEvent, id?: string) => {
    if (isGroupMode) return; // In group mode, individual item drag is disabled
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

  // --- Group Pointer Events ---

  const handleGroupPointerDown = (e: React.PointerEvent) => {
     e.stopPropagation();
     setIsDraggingGroup(true);
     setInteractionStart({ x: e.clientX, y: e.clientY, rotation: 0 });
     // Snapshot all user items
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
         bounds: bounds // Store initial bounds to calculate scale
     });
     (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };


  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // --- Group Logic ---
    if (isGroupMode && (isDraggingGroup || isResizingGroup) && groupInitialState) {
        e.preventDefault();
        const deltaX = e.clientX - interactionStart.x;
        const deltaY = e.clientY - interactionStart.y;
        
        let updatedItems = [...board.items];

        if (isDraggingGroup) {
            // Move all items by delta
            const userItemIds = groupInitialState.items.map((i: any) => i.id);
            updatedItems = updatedItems.map(item => {
                if (userItemIds.includes(item.id)) {
                    const initial = groupInitialState.items.find((i: any) => i.id === item.id);
                    return { ...item, x: initial.x + deltaX, y: initial.y + deltaY };
                }
                return item;
            });
        } else if (isResizingGroup && groupInitialState.bounds) {
             // Scale Logic
             // New Group Width = Old Width + Delta
             // Scale Factor = New / Old
             const initialBounds = groupInitialState.bounds;
             const newWidth = Math.max(50, initialBounds.width + deltaX);
             const newHeight = Math.max(50, initialBounds.height + deltaY);
             
             const scaleX = newWidth / initialBounds.width;
             const scaleY = newHeight / initialBounds.height;

             const userItemIds = groupInitialState.items.map((i: any) => i.id);
             
             updatedItems = updatedItems.map(item => {
                if (userItemIds.includes(item.id)) {
                    const initial = groupInitialState.items.find((i: any) => i.id === item.id);
                    
                    // Position relative to group top-left
                    const relX = initial.x - initialBounds.x;
                    const relY = initial.y - initialBounds.y;

                    // New dimensions
                    const w = (initial.width || 50) * scaleX;
                    const h = initial.height ? (initial.height * scaleY) : undefined;
                    
                    return { 
                        ...item, 
                        x: initialBounds.x + (relX * scaleX),
                        y: initialBounds.y + (relY * scaleY),
                        width: w,
                        height: h,
                        // Attempt to scale font size reasonably
                        fontSize: initial.fontSize ? initial.fontSize * scaleX : undefined
                    };
                }
                return item;
             });
        }

        onUpdateBoard({ ...board, items: updatedItems });
        return;
    }

    // --- Single Item Logic ---
    if ((!draggedItemId && !resizingItemId && !rotatingItemId) || !itemInitialState) return;
    
    e.preventDefault();
    const deltaX = e.clientX - interactionStart.x;
    const deltaY = e.clientY - interactionStart.y;

    let updatedItems = board.items;

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

    onUpdateBoard({ ...board, items: updatedItems });
    
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
      onUpdateBoard(board); 
    }
  }, [draggedItemId, resizingItemId, rotatingItemId, isDraggingGroup, isResizingGroup, board, onUpdateBoard]);

  // --- Paste Handler ---
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isDrawingPadOpen) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            setToast({ message: "Pasting image...", type: 'success' });
            const reader = new FileReader();
            reader.onload = async (event) => {
               if(event.target?.result) {
                   const compressed = await compressImage(event.target.result as string);
                   addItem(ItemType.IMAGE, compressed);
               }
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addItem, setToast, isDrawingPadOpen]);


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
    <>
      <div 
        className="fixed inset-0 w-screen h-[100dvh] overflow-hidden relative touch-none" 
        style={getBoardStyle()} 
        onPointerDown={(e) => handlePointerDown(e)} 
        onPointerMove={handlePointerMove} 
        onPointerUp={handlePointerUp} 
        onPointerLeave={handlePointerUp} 
        ref={canvasRef}
      >
        {!board.backgroundImage && <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>}
        
        {/* Header */}
        <div className="absolute top-0 left-0 w-full p-2 sm:p-4 flex flex-wrap justify-between items-center z-50 pointer-events-none gap-2">
          
          {/* Left: Back & Title */}
          <div className="pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-2 sm:gap-3 max-w-[50%]">
            <button onClick={onBack} className="text-slate-500 hover:text-slate-800 font-medium transition-colors text-sm sm:text-base whitespace-nowrap">
              {language === 'ar' ? '→' : '←'} <span className="hidden sm:inline">{t.backToDashboard}</span>
            </button>
            <div className="w-px h-3 sm:h-4 bg-slate-300"></div>
            <span className="font-bold text-slate-800 flex items-center gap-2 truncate text-sm sm:text-base">
              {board.topic}
              {isOnline && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200 font-bold hidden sm:flex items-center gap-1 animate-pulse"><span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span> LIVE</span>}
            </span>
          </div>
          
          {/* Right: Actions */}
          <div className="pointer-events-auto flex gap-2">
            
            {/* Auto Save Indicator (Passive) */}
            <div className="hidden sm:flex items-center gap-1 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-500 shadow-sm">
                <Cloud size={12} className="text-slate-400"/> {t.save_indicator}
            </div>

            {/* Share Link */}
            <button onClick={onShare} className="bg-white text-slate-700 border border-slate-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-sm font-medium hover:bg-slate-50 transition-all flex items-center gap-2 text-sm sm:text-base">
              <LinkIcon size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">{t.shareLink}</span>
            </button>

            {/* Publish Toggle (Host Only) */}
            {isHost && (
                <button 
                    onClick={togglePublish} 
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg font-medium transition-all flex items-center gap-2 text-sm sm:text-base ${board.isPublic ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-slate-500 border border-slate-200 hover:text-indigo-600'}`}
                >
                    <Globe size={14} className="sm:w-4 sm:h-4" /> 
                    <span className="hidden sm:inline">{board.isPublic ? t.unpublish_btn : t.publish_btn}</span>
                </button>
            )}
          </div>
        </div>

        <div className="w-full h-full relative z-10 overflow-hidden">
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

          {/* Group Overlay Layer (Only if group mode is active and user has items) */}
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
                {/* Group Label */}
                <div className="absolute -top-7 left-0 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-t-md flex items-center gap-2">
                    {t.toolGroup}
                    <button onPointerDown={(e) => { e.stopPropagation(); deleteGroup(); }} className="hover:text-red-200"><Trash2 size={12} /></button>
                </div>
                
                {/* Resize Handle for Group */}
                <div 
                  className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize flex items-center justify-center"
                  onPointerDown={handleGroupResizeDown}
                >
                    <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white"></div>
                </div>
            </div>
          )}
        </div>

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
    </>
  );
};

export default CanvasBoard;
