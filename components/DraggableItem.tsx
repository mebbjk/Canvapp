import React from 'react';
import { CanvasItem, ItemType, User } from '../types';
import { X, User as UserIcon, GripHorizontal, ArrowUpToLine, ArrowDownToLine } from 'lucide-react';

interface DraggableItemProps {
  item: CanvasItem;
  currentUser: User | null;
  hostName: string;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onResizeStart: (e: React.PointerEvent, id: string) => void;
  onDelete: (id: string) => void;
  onLayerChange: (id: string, direction: 'front' | 'back') => void;
  isDragging: boolean;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ 
  item, 
  currentUser, 
  hostName, 
  onPointerDown, 
  onResizeStart, 
  onDelete, 
  onLayerChange,
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
        ${isDragging && !isTransparent ? 'drop-shadow-2xl scale-[1.01]' : (isTransparent ? '' : 'hover:drop-shadow-lg')} 
        ${isAuthorized ? 'cursor-move' : 'cursor-default'}`}
      style={{ 
        left: 0, 
        top: 0, 
        ...getStyles(),
        minWidth: '50px',
        minHeight: '50px',
        touchAction: 'none' // Critical for mobile dragging
      }}
      onPointerDown={handlePointerDown}
    >
      {isAuthorized && (
        <>
          {/* Layer Controls (Top Left) */}
          <div className="absolute -top-3 -left-3 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-50">
             <button 
              onPointerDown={(e) => { e.stopPropagation(); onLayerChange(item.id, 'front'); }}
              className="bg-white text-slate-600 rounded-full p-1.5 shadow-sm border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              title="Bring to Front"
            >
              <ArrowUpToLine size={12} />
            </button>
             <button 
              onPointerDown={(e) => { e.stopPropagation(); onLayerChange(item.id, 'back'); }}
              className="bg-white text-slate-600 rounded-full p-1.5 shadow-sm border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              title="Send to Back"
            >
              <ArrowDownToLine size={12} />
            </button>
          </div>

          {/* Delete Button (Top Right) */}
          <button 
            onPointerDown={(e) => { e.stopPropagation(); onDelete(item.id); }}
            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 sm:p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-50 shadow-sm hover:scale-110"
          >
            <X size={14} />
          </button>
        </>
      )}

      {/* Author Tag (Visible on Hover) */}
      <div className="absolute -bottom-6 left-0 bg-black/75 text-white text-[10px] px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none flex items-center gap-1 z-50">
        <UserIcon size={10} /> {item.author}
      </div>

      {/* Content Rendering */}
      {item.type === ItemType.TEXT && (
        <div 
          className={`handwritten text-lg sm:text-xl break-words h-full ${isTransparent ? 'p-0 drop-shadow-sm font-bold' : 'p-4 shadow-md'}`}
          style={{ 
            backgroundColor: isTransparent ? 'transparent' : (item.color || '#fef3c7'),
            color: item.textColor || '#1e293b', 
            textShadow: isTransparent ? '1px 1px 0 rgba(255,255,255,0.8)' : 'none'
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

      {/* Resize Handle */}
      {isAuthorized && (
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