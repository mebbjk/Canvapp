
import React from 'react';
import { CanvasItem, ItemType } from '../types';
import { X, ArrowUpToLine, ArrowDownToLine, RefreshCw, Type, Plus, Minus, User as UserIcon } from 'lucide-react';

interface OverlayControlsProps {
  item: CanvasItem;
  onDelete: (id: string) => void;
  onLayerChange: (id: string, direction: 'front' | 'back') => void;
  onUpdate: (id: string, data: Partial<CanvasItem>) => void;
  onResizeStart: (e: React.PointerEvent, id: string) => void;
  onRotateStart: (e: React.PointerEvent, id: string) => void;
  isActive: boolean; // True if this is the currently selected item
}

export const OverlayControls: React.FC<OverlayControlsProps> = ({
  item,
  onDelete,
  onLayerChange,
  onUpdate,
  onResizeStart,
  onRotateStart,
  isActive
}) => {
  
  const handleFontSizeChange = (delta: number) => {
    const currentSize = item.fontSize || 20;
    const newSize = Math.max(10, Math.min(200, currentSize + delta));
    onUpdate(item.id, { fontSize: newSize });
  };

  // Position the overlay exactly where the item is
  const style: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    transform: `translate(${item.x}px, ${item.y}px) rotate(${item.rotation}deg)`,
    width: item.width ? `${item.width}px` : 'auto',
    height: item.height ? `${item.height}px` : 'auto',
    minWidth: item.type === ItemType.DRAWING ? '1px' : '50px',
    minHeight: item.type === ItemType.DRAWING ? '1px' : '50px',
    pointerEvents: 'none', // Allow clicks to pass through to the item below for dragging
    zIndex: 99999, // BOOST Z-INDEX: Ensures controls are always on top of everything
  };

  return (
    <div style={style}>
      {/* Container for buttons - enable pointer events for buttons */}
      <div className={`absolute -top-12 left-0 w-full flex justify-center items-center transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
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
            
            <button 
              onPointerDown={(e) => { e.stopPropagation(); onDelete(item.id); }}
              className="text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors"
              title="Delete"
            >
              <X size={14} />
            </button>
         </div>
      </div>

      {/* Rotate Handle */}
      <div 
         className={`absolute -bottom-10 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing pointer-events-auto transition-opacity duration-200 flex flex-col items-center ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
         onPointerDown={(e) => { e.stopPropagation(); onRotateStart(e, item.id); }}
      >
         <div className="w-px h-4 bg-slate-400"></div>
         <div className="bg-white text-slate-600 rounded-full p-1.5 shadow-sm border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
           <RefreshCw size={14} />
         </div>
      </div>

      {/* Resize Handle */}
      {item.type !== ItemType.DRAWING && (
        <div 
          className={`absolute bottom-0 right-0 w-8 h-8 sm:w-6 sm:h-6 cursor-nwse-resize pointer-events-auto transition-opacity duration-200 flex items-center justify-center text-slate-400 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          onPointerDown={(e) => { e.stopPropagation(); onResizeStart(e, item.id); }}
        >
           <div className="w-3 h-3 sm:w-2 sm:h-2 bg-slate-400 rounded-full border border-white shadow-sm"></div>
        </div>
      )}

      {/* Author Tag */}
      <div className={`absolute -bottom-6 left-0 bg-black/75 text-white text-[10px] px-2 py-1 rounded-full transition-opacity duration-200 whitespace-nowrap flex items-center gap-1 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <UserIcon size={10} /> {item.author}
      </div>
      
      {/* Visual Border for Active State */}
      {isActive && (
        <div className="absolute inset-0 border-2 border-indigo-500 rounded-lg pointer-events-none"></div>
      )}
    </div>
  );
};
