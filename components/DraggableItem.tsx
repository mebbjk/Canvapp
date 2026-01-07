
import React from 'react';
import { CanvasItem, ItemType, User } from '../types';
import { X, User as UserIcon, ArrowUpToLine, ArrowDownToLine, RefreshCw, Type, Plus, Minus } from 'lucide-react';

interface DraggableItemProps {
  item: CanvasItem;
  currentUser: User | null;
  hostName: string;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onResizeStart: (e: React.PointerEvent, id: string) => void;
  onRotateStart: (e: React.PointerEvent, id: string) => void; 
  onDelete: (id: string) => void;
  onLayerChange: (id: string, direction: 'front' | 'back') => void;
  onUpdate: (id: string, data: Partial<CanvasItem>) => void;
  isDragging: boolean;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ 
  item, 
  currentUser, 
  hostName, 
  onPointerDown, 
  onResizeStart, 
  onRotateStart,
  onDelete, 
  onLayerChange,
  onUpdate,
  isDragging 
}) => {
  
  // Permission Check: Author OR Board Host can edit
  const isAuthorized = currentUser && (currentUser.name === item.author || currentUser.name === hostName);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (isAuthorized) {
      onPointerDown(e, item.id);
    }
  };

  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (isAuthorized) {
      onResizeStart(e, item.id);
    }
  };
  
  const handleRotatePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (isAuthorized) {
      onRotateStart(e, item.id);
    }
  };

  const handleFontSizeChange = (delta: number) => {
    const currentSize = item.fontSize || 20; // Default base size
    const newSize = Math.max(10, Math.min(200, currentSize + delta));
    onUpdate(item.id, { fontSize: newSize });
  };

  const getStyles = () => {
    return {
      transform: `translate(${item.x}px, ${item.y}px) rotate(${item.rotation}deg)`,
      zIndex: isDragging ? 50 : 10,
      width: item.width ? `${item.width}px` : 'auto',
      height: item.height ? `${item.height}px` : 'auto',
    };
  };

  const isTransparent = item.color === 'transparent';

  return (
    <div
      className={`absolute group select-none transition-shadow duration-200 
        ${isDragging && !isTransparent && item.type !== ItemType.DRAWING ? 'drop-shadow-2xl scale-[1.01]' : (isTransparent || item.type === ItemType.DRAWING ? '' : 'hover:drop-shadow-lg')} 
        ${isAuthorized ? 'cursor-move' : 'cursor-default'}`}
      style={{ 
        left: 0, 
        top: 0, 
        ...getStyles(),
        minWidth: item.type === ItemType.DRAWING ? '1px' : '50px',
        minHeight: item.type === ItemType.DRAWING ? '1px' : '50px',
        touchAction: 'none' // Critical for mobile dragging
      }}
      onPointerDown={handlePointerDown}
    >
      {isAuthorized && (
        <>
          {/* Top Controls Container - Now safely renders above item without header overlap issue */}
          <div className="absolute -top-12 left-0 w-full flex justify-center items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-[60] pointer-events-none">
             <div className="bg-white/95 backdrop-blur rounded-full shadow-md border border-slate-200 p-1 flex items-center gap-1 pointer-events-auto">
                {/* Layer Controls */}
                <button 
                  onPointerDown={(e) => { e.stopPropagation(); onLayerChange(item.id, 'front'); }}
                  className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                  title="Bring to Front"
                >
                  <ArrowUpToLine size={14} />
                </button>
                <button 
                  onPointerDown={(e) => { e.stopPropagation(); onLayerChange(item.id, 'back'); }}
                  className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                  title="Send to Back"
                >
                  <ArrowDownToLine size={14} />
                </button>
                
                {/* Font Size Controls (Only for Text) */}
                {item.type === ItemType.TEXT && (
                  <>
                    <div className="w-px h-3 bg-slate-300 mx-1"></div>
                    <button 
                      onPointerDown={(e) => { e.stopPropagation(); handleFontSizeChange(-2); }}
                      className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors flex items-center"
                      title="Decrease Font Size"
                    >
                      <Type size={10} /><Minus size={10} />
                    </button>
                    <button 
                      onPointerDown={(e) => { e.stopPropagation(); handleFontSizeChange(2); }}
                      className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors flex items-center"
                      title="Increase Font Size"
                    >
                      <Type size={12} /><Plus size={10} />
                    </button>
                  </>
                )}

                <div className="w-px h-3 bg-slate-300 mx-1"></div>
                
                {/* Delete */}
                <button 
                  onPointerDown={(e) => { e.stopPropagation(); onDelete(item.id); }}
                  className="text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                  title="Delete"
                >
                  <X size={14} />
                </button>
             </div>
          </div>

          {/* Rotation Handle */}
          <div 
             className="absolute -bottom-10 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-50 flex flex-col items-center group/rotate"
             onPointerDown={handleRotatePointerDown}
          >
             <div className="w-px h-4 bg-slate-400"></div>
             <div className="bg-white text-slate-600 rounded-full p-1.5 shadow-sm border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
               <RefreshCw size={14} />
             </div>
          </div>
        </>
      )}

      {/* Author Tag (Visible on Hover) */}
      <div className="absolute -bottom-6 left-0 bg-black/75 text-white text-[10px] px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none flex items-center gap-1 z-50">
        <UserIcon size={10} /> {item.author}
      </div>

      {/* Content Rendering */}
      {item.type === ItemType.TEXT && (
        <div 
          className={`handwritten break-words h-full ${isTransparent ? 'p-0 drop-shadow-sm font-bold' : 'p-4 shadow-md'}`}
          style={{ 
            backgroundColor: isTransparent ? 'transparent' : (item.color || '#fef3c7'),
            color: item.textColor || '#1e293b', 
            textShadow: isTransparent ? '1px 1px 0 rgba(255,255,255,0.8)' : 'none',
            fontSize: item.fontSize ? `${item.fontSize}px` : '20px', 
            lineHeight: 1.4
          }}
        >
          {item.content}
        </div>
      )}

      {item.type === ItemType.EMOJI && (
        <div 
          className="flex items-center justify-center h-full drop-shadow-sm filter"
          style={{ fontSize: item.width ? `${Math.min(item.width, item.height || item.width) * 0.7}px` : '64px' }}
        >
          {item.content}
        </div>
      )}

      {(item.type === ItemType.IMAGE || item.type === ItemType.STICKER) && (
        <div className="relative w-full h-full">
          <img 
            src={item.content} 
            alt="canvas item" 
            className={`pointer-events-none w-full h-full rounded-sm ${item.type === ItemType.STICKER ? 'drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'shadow-none'}`}
            style={{ objectFit: 'contain' }}
            draggable={false}
          />
        </div>
      )}

      {item.type === ItemType.DRAWING && (
        <svg 
          width={item.width} 
          height={item.height} 
          viewBox={`0 0 ${item.width} ${item.height}`} 
          className="drop-shadow-sm overflow-visible"
        >
          <path 
            d={item.content} 
            stroke={item.textColor || '#000'} 
            strokeWidth="4" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* Resize Handle */}
      {isAuthorized && item.type !== ItemType.DRAWING && (
        <div 
          className="absolute bottom-0 right-0 w-8 h-8 sm:w-6 sm:h-6 cursor-nwse-resize opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-50 flex items-center justify-center text-slate-400"
          onPointerDown={handleResizePointerDown}
        >
           <div className="w-3 h-3 sm:w-2 sm:h-2 bg-slate-400 rounded-full border border-white shadow-sm"></div>
        </div>
      )}
    </div>
  );
};

export default DraggableItem;
