
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Board, CanvasItem, ItemType, User } from '../types';
import DraggableItem from './DraggableItem';
import Toolbar from './Toolbar';
import { translations } from '../translations';
import { compressImage, generateId } from '../utils/helpers';
import { Link as LinkIcon } from 'lucide-react';

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
  
  // Dragging / Resizing State
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [resizingItemId, setResizingItemId] = useState<string | null>(null);
  const [interactionStart, setInteractionStart] = useState({ x: 0, y: 0 });
  const [itemInitialState, setItemInitialState] = useState<any>(null);

  // Drawing State
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // @ts-ignore
  const t = translations[language];

  // --- Actions ---

  const addItem = useCallback((type: ItemType, content: string, color?: string, textColor?: string) => {
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
      rotation: (Math.random() - 0.5) * 20,
      author: user.name, createdAt: Date.now(), color, textColor, width, height
    };

    const updatedBoard = { ...board, items: [...board.items, newItem] };
    onUpdateBoard(updatedBoard);
  }, [board, user, onUpdateBoard]);

  const addDrawing = (pathData: {x: number, y: number}[], color: string) => {
    if (pathData.length < 2) return;

    // Calculate Bounding Box
    const xs = pathData.map(p => p.x);
    const ys = pathData.map(p => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const width = Math.max(10, maxX - minX);
    const height = Math.max(10, maxY - minY);

    // Normalize Path relative to bounding box
    const normalizedPath = pathData.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x - minX} ${p.y - minY}`
    ).join(' ');

    const newItem: CanvasItem = {
      id: generateId(),
      type: ItemType.DRAWING,
      content: normalizedPath,
      x: minX,
      y: minY,
      width,
      height,
      rotation: 0,
      author: user.name,
      createdAt: Date.now(),
      textColor: color // Use textColor for stroke
    };

    onUpdateBoard({ ...board, items: [...board.items, newItem] });
  };

  const deleteItem = (id: string) => {
    const updatedBoard = { ...board, items: board.items.filter(i => i.id !== id) };
    onUpdateBoard(updatedBoard);
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

  // --- Pointer Events (Drag/Resize/Draw) ---

  const handlePointerDown = useCallback((e: React.PointerEvent, id?: string) => {
    if (isDrawingMode) {
       setIsDrawing(true);
       setCurrentPath([{ x: e.clientX, y: e.clientY }]);
       (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
       return;
    }

    if (id) {
      const item = board.items.find(i => i.id === id);
      if (item) {
        setDraggedItemId(id);
        setInteractionStart({ x: e.clientX, y: e.clientY });
        setItemInitialState({ ...item });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    }
  }, [board, isDrawingMode]);

  const handleResizeStart = useCallback((e: React.PointerEvent, id: string) => {
    if (isDrawingMode) return;
    const item = board.items.find(i => i.id === id);
    if (item) {
      setResizingItemId(id);
      setInteractionStart({ x: e.clientX, y: e.clientY });
      
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
  }, [board, isDrawingMode]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isDrawingMode && isDrawing) {
      setCurrentPath(prev => [...prev, { x: e.clientX, y: e.clientY }]);
      return;
    }

    if ((!draggedItemId && !resizingItemId) || !itemInitialState) return;
    
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
    }

    onUpdateBoard({ ...board, items: updatedItems });
    
  }, [draggedItemId, resizingItemId, interactionStart, itemInitialState, board, onUpdateBoard, isDrawingMode, isDrawing]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDrawingMode && isDrawing) {
      setIsDrawing(false);
      addDrawing(currentPath, drawingColor);
      setCurrentPath([]);
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      return;
    }

    if (draggedItemId || resizingItemId) {
      setDraggedItemId(null);
      setResizingItemId(null);
      setItemInitialState(null);
      // (e.target as HTMLElement).releasePointerCapture(e.pointerId); // Sometimes target is gone
      onUpdateBoard(board); 
    }
  }, [draggedItemId, resizingItemId, board, onUpdateBoard, isDrawingMode, isDrawing, currentPath, drawingColor]);

  // --- Paste Handler ---
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if(isDrawingMode) return; // Disable paste while drawing

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
  }, [addItem, setToast, isDrawingMode]);


  const getBoardStyle = () => {
    const style: React.CSSProperties = {
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      touchAction: 'none',
      cursor: isDrawingMode ? 'crosshair' : 'default'
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

  // Temporary path rendering
  const tempPathData = currentPath.length > 0 
    ? currentPath.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') 
    : '';

  return (
    <div 
      className="fixed inset-0 w-screen h-[100dvh] overflow-hidden relative touch-none" 
      style={getBoardStyle()} 
      onPointerDown={(e) => handlePointerDown(e)} // Attach to board for drawing
      onPointerMove={handlePointerMove} 
      onPointerUp={handlePointerUp} 
      onPointerLeave={handlePointerUp} 
      ref={canvasRef}
    >
      {!board.backgroundImage && <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>}
      
      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-2 sm:p-4 flex flex-wrap justify-between items-center z-50 pointer-events-none gap-2">
        <div className="pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-2 sm:gap-3 max-w-[70%]">
          <button onClick={onBack} className="text-slate-500 hover:text-slate-800 font-medium transition-colors text-sm sm:text-base whitespace-nowrap">
            {language === 'ar' ? '→' : '←'} <span className="hidden sm:inline">{t.backToDashboard}</span>
          </button>
          <div className="w-px h-3 sm:h-4 bg-slate-300"></div>
          <span className="font-bold text-slate-800 flex items-center gap-2 truncate text-sm sm:text-base">
            {board.topic}
            {isOnline && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200 font-bold hidden sm:flex items-center gap-1 animate-pulse"><span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span> LIVE</span>}
          </span>
        </div>
        
        <div className="pointer-events-auto flex gap-2">
           <button onClick={onShare} className="bg-indigo-600 text-white px-3 py-1.5 sm:px-5 sm:py-2 rounded-full shadow-lg shadow-indigo-200 font-medium hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-sm sm:text-base">
            <LinkIcon size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">{t.shareLink}</span>
          </button>
        </div>
      </div>

      {/* SVG Layer for Current Drawing (Active) */}
      {isDrawingMode && currentPath.length > 0 && (
         <svg className="absolute inset-0 pointer-events-none z-[100] w-full h-full overflow-visible">
            <path d={tempPathData} stroke={drawingColor} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
         </svg>
      )}

      <div className="w-full h-full relative z-10 overflow-hidden">
        {board.items.length === 0 && !isDrawingMode && (
          <div className={`absolute inset-0 flex items-center justify-center pointer-events-none animate-pulse px-4 ${board.backgroundImage || (board.backgroundColor && board.backgroundColor !== '#f8fafc') ? 'text-white drop-shadow-md' : 'text-slate-300'}`}>
            <div className="text-center">
              <h2 className="text-2xl sm:text-4xl font-bold mb-2 opacity-50">{t.emptyBoardTitle}</h2>
              <p className="text-sm sm:text-base">{t.emptyBoardSubtitle}</p>
            </div>
          </div>
        )}
        {board.items.map(item => (
          <DraggableItem 
            key={item.id} 
            item={item} 
            currentUser={user} 
            hostName={board.host} 
            onPointerDown={(e, id) => {
               if(!isDrawingMode) handlePointerDown(e, id);
            }} 
            onResizeStart={(e, id) => {
               if(!isDrawingMode) handleResizeStart(e, id);
            }} 
            onDelete={deleteItem} 
            onLayerChange={changeItemLayer} 
            isDragging={draggedItemId === item.id} 
          />
        ))}
      </div>

      <Toolbar 
        onAddText={(text, color, textColor) => addItem(ItemType.TEXT, text, color, textColor)} 
        onAddImage={(base64) => addItem(ItemType.IMAGE, base64)} 
        onAddEmoji={(emoji) => addItem(ItemType.EMOJI, emoji)} 
        onAddSticker={(sticker) => addItem(ItemType.STICKER, sticker)}
        drawingMode={isDrawingMode}
        setDrawingMode={setIsDrawingMode}
        drawingColor={drawingColor}
        setDrawingColor={setDrawingColor}
        t={t} 
      />
    </div>
  );
};

export default CanvasBoard;
