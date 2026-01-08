
import React, { useRef, useState, useEffect } from 'react';
import { Board, CanvasItem, ItemType, User } from '../types';
import DraggableItem from './DraggableItem';
import { OverlayControls } from './OverlayControls';
import Toolbar from './Toolbar';
import DrawingPad from './DrawingPad';
import { translations } from '../translations';
import { generateId } from '../utils/helpers';
import { sendNotification } from '../services/firebaseService';
import { useCanvasInteraction } from '../hooks/useCanvasInteraction'; 
import { ArrowLeft, Trash2, Cloud, CloudOff, Eye, EyeOff } from 'lucide-react';

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
  const latestItemsRef = useRef<CanvasItem[]>(board.items);
  const [uiVisible, setUiVisible] = useState(true);

  // States managed by Hook
  const {
      activeItemId, setActiveItemId,
      draggedItemId, resizingItemId, rotatingItemId,
      isGroupMode, setIsGroupMode,
      selectedIds, setSelectedIds,
      selectionBox,
      isDraggingGroup, isResizingGroup,
      getGroupBounds,
      handlePointerDown, handlePointerMove, handlePointerUp,
      handleResizeStart, handleRotateStart,
      handleGroupPointerDown, handleGroupResizeDown
  } = useCanvasInteraction({ board, user, onUpdateBoard, latestItemsRef });

  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [isDrawingPadOpen, setIsDrawingPadOpen] = useState(false);

  // Update refs when board changes
  useEffect(() => {
    if (!draggedItemId && !resizingItemId && !rotatingItemId && !isDraggingGroup && !isResizingGroup) {
      latestItemsRef.current = board.items;
    }
  }, [board.items, draggedItemId, resizingItemId, rotatingItemId, isDraggingGroup, isResizingGroup]);

  // @ts-ignore
  const t = translations[language];

  // --- CRUD Actions ---
  const handleManualSave = () => {
      onUpdateBoard({ ...board, items: latestItemsRef.current }, true);
      setToast({ message: t.save_indicator, type: 'success' });
  };

  const handleToggleGroupMode = () => {
    if (isGroupMode) {
        setIsGroupMode(false);
        setSelectedIds([]);
    } else {
        setIsGroupMode(true);
        setSelectedIds([]);
        setActiveItemId(null); 
        setToast({ message: "Drag on background to select multiple items.", type: 'success' });
    }
  };

  const addItem = (type: ItemType, content: string, color?: string, textColor?: string) => {
    const userItems = board.items.filter(i => i.author === user.name);
    if (board.maxItemsPerUser && board.maxItemsPerUser > 0 && userItems.length >= board.maxItemsPerUser) {
        setToast({ message: t.limitReached, type: 'error' });
        return;
    }
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
    
    // CRITICAL FIX: Ensure we use the latest ref state plus the new item
    const newItems = [...latestItemsRef.current, newItem];
    const updatedBoard = { ...board, items: newItems };
    
    // Update ref immediately to prevent race conditions
    latestItemsRef.current = newItems;
    
    onUpdateBoard(updatedBoard, true);
    setActiveItemId(newItem.id); 

    if (isOnline && user.name !== board.host) {
       sendNotification(board.host, user.name, board.id, board.topic);
    }
  };

  const handleAddDrawing = (base64: string) => {
    addItem(ItemType.IMAGE, base64);
    setIsDrawingPadOpen(false);
  };

  const deleteItem = (id: string) => {
    const newItems = board.items.filter(i => i.id !== id);
    latestItemsRef.current = newItems;
    const updatedBoard = { ...board, items: newItems };
    onUpdateBoard(updatedBoard, true);
    if (activeItemId === id) setActiveItemId(null);
  };

  const deleteGroup = () => {
    const newItems = board.items.filter(i => !selectedIds.includes(i.id));
    latestItemsRef.current = newItems;
    const updatedBoard = { ...board, items: newItems };
    onUpdateBoard(updatedBoard, true);
    setSelectedIds([]); 
  };

  const changeItemLayer = (id: string, direction: 'front' | 'back') => {
    const items = [...board.items];
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return;
    const [item] = items.splice(index, 1);
    if (direction === 'front') items.push(item);
    else items.unshift(item);
    
    latestItemsRef.current = items;
    onUpdateBoard({ ...board, items }, true);
  };

  const updateItem = (id: string, data: Partial<CanvasItem>) => {
    const items = board.items.map(i => i.id === id ? { ...i, ...data } : i);
    latestItemsRef.current = items;
    onUpdateBoard({ ...board, items }, true);
  };

  const togglePublish = () => {
    const newStatus = !board.isPublic;
    onUpdateBoard({ ...board, isPublic: newStatus }, true);
    setToast({ message: newStatus ? t.publish_confirm : t.unpublish_confirm, type: 'success' });
  };

  const groupBounds = isGroupMode ? getGroupBounds() : null;
  
  const overlayItemIds = new Set<string>();
  if (activeItemId) {
    overlayItemIds.add(activeItemId);
  } else if (hoveredItemId && !isDraggingGroup && !draggedItemId && !isGroupMode) {
    overlayItemIds.add(hoveredItemId);
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden relative">
      
      {/* Visibility Toggle - Always visible (faintly) */}
      <button 
        onClick={() => setUiVisible(!uiVisible)}
        className={`absolute top-4 left-4 z-[110] p-3 rounded-full transition-all duration-300 ${uiVisible ? 'bg-white/90 text-slate-600 shadow-md border border-slate-200 hover:text-indigo-600' : 'bg-black/10 text-black/40 hover:bg-black/20 hover:text-black'}`}
        title="Toggle Interface"
      >
        {uiVisible ? <EyeOff size={20} /> : <Eye size={20} />}
      </button>

      {/* Floating Top Header / Navigation - Hidden in Cinema Mode */}
      <div className={`absolute top-4 left-20 z-[100] flex items-center gap-3 transition-all duration-300 ${uiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
          <button 
             onClick={onBack} 
             className="bg-white/90 backdrop-blur-md p-3 rounded-full shadow-md border border-slate-200 text-slate-600 hover:text-indigo-600 hover:scale-105 transition-all"
             title={t.backToDashboard}
          >
             <ArrowLeft size={20} />
          </button>
          
          <div className="bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-full shadow-md border border-slate-200 flex items-center gap-3">
             <div className="flex flex-col">
                <span className="font-bold text-slate-800 text-sm leading-tight max-w-[150px] sm:max-w-xs truncate">{board.topic}</span>
                <div className="flex items-center gap-1.5">
                   <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-400'}`}></div>
                   <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {isSaving ? t.saving_indicator : (isOnline ? t.status_online : t.status_offline)}
                   </span>
                </div>
             </div>
             {/* Simple Connectivity Icon */}
             <div className="border-l border-slate-200 pl-3 text-slate-400">
                {isOnline ? <Cloud size={16} /> : <CloudOff size={16} className="text-red-400" />}
             </div>
          </div>
      </div>

      {/* Main Canvas Area */}
      <div 
        className="flex-1 relative touch-none overflow-hidden"
        style={{
          backgroundColor: board.backgroundColor || '#ffffff', 
          backgroundImage: board.backgroundImage ? `url(${board.backgroundImage})` : 'none',
          backgroundSize: board.backgroundImage ? (board.backgroundSize || 'cover') : 'auto',
          cursor: isGroupMode ? (selectedIds.length > 0 ? 'default' : 'crosshair') : 'default'
        }}
        onPointerDown={(e) => handlePointerDown(e)} 
        onPointerMove={handlePointerMove} 
        onPointerUp={handlePointerUp} 
        onPointerLeave={handlePointerUp} 
        ref={canvasRef}
      >
          
          {board.items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 text-slate-300">
                <div className="text-center">
                    <h2 className="text-4xl font-black mb-2 tracking-tight">JamWall</h2>
                    <p>{t.emptyBoardSubtitle}</p>
                </div>
            </div>
          )}

          {isGroupMode && selectedIds.length === 0 && !selectionBox && uiVisible && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-2 rounded-full shadow-xl text-sm font-bold z-50 pointer-events-none animate-pulse border-2 border-white/20">
                Drag on empty space to select
            </div>
          )}

          {/* Rubber Band */}
          {selectionBox && (
             <div className="absolute bg-indigo-500/20 border border-indigo-500 z-[9999]" style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.w, height: selectionBox.h }}></div>
          )}

          {/* Render Items */}
          {board.items.map(item => (
            <DraggableItem 
              key={item.id} 
              item={item} 
              currentUser={user} 
              hostName={board.host} 
              onPointerDown={(e, id) => handlePointerDown(e, id)} 
              onHover={setHoveredItemId}
              isDragging={draggedItemId === item.id || (isDraggingGroup && selectedIds.includes(item.id))}
              isSelected={selectedIds.includes(item.id)}
            />
          ))}

          {/* Group Overlay */}
          {isGroupMode && groupBounds && (
            <div 
                className="absolute border-2 border-indigo-500 border-dashed bg-indigo-500/10 cursor-move z-[999] group"
                style={{ left: groupBounds.x, top: groupBounds.y, width: groupBounds.width, height: groupBounds.height }}
                onPointerDown={handleGroupPointerDown}
            >
                <div className="absolute -top-8 left-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-t-lg flex items-center gap-2 shadow-lg">
                    {selectedIds.length} items
                    <div className="w-px h-3 bg-white/30 mx-1"></div>
                    <button onPointerDown={(e) => { e.stopPropagation(); deleteGroup(); }} className="hover:text-red-200"><Trash2 size={14} /></button>
                </div>
                <div className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize" onPointerDown={handleGroupResizeDown} />
            </div>
          )}

          {/* Render Overlay Controls for Active/Hovered Items */}
          {!isGroupMode && uiVisible && Array.from(overlayItemIds).map(id => {
             const item = board.items.find(i => i.id === id);
             if (!item) return null;
             const isAuthorized = user && (user.name === item.author || user.name === board.host);
             if (!isAuthorized) return null;

             return (
               <OverlayControls 
                 key={id}
                 item={item}
                 isActive={id === activeItemId}
                 onDelete={deleteItem}
                 onLayerChange={changeItemLayer}
                 onUpdate={updateItem}
                 onResizeStart={handleResizeStart}
                 onRotateStart={handleRotateStart}
               />
             );
          })}
        
        {/* New Right Sidebar Toolbar - Now Bottom Dock, passed visibility prop */}
        <Toolbar 
          onAddText={(text, color, textColor) => addItem(ItemType.TEXT, text, color, textColor)} 
          onAddImage={(base64) => addItem(ItemType.IMAGE, base64)} 
          onAddEmoji={(emoji) => addItem(ItemType.EMOJI, emoji)} 
          onAddSticker={(sticker) => addItem(ItemType.STICKER, sticker)}
          onOpenDrawingPad={() => setIsDrawingPadOpen(true)}
          isGroupMode={isGroupMode}
          onToggleGroupMode={handleToggleGroupMode}
          board={board}
          user={user}
          onUpdateBoard={onUpdateBoard}
          onShare={onShare}
          onManualSave={handleManualSave}
          isSaving={isSaving}
          isOnline={isOnline}
          togglePublish={togglePublish}
          t={t} 
          setToast={setToast}
          visible={uiVisible}
        />
      </div>

      {isDrawingPadOpen && <DrawingPad onClose={() => setIsDrawingPadOpen(false)} onAdd={handleAddDrawing} t={t} />}
    </div>
  );
};

export default CanvasBoard;
