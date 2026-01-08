
import React from 'react';
import { CanvasItem, ItemType, User } from '../types';

interface DraggableItemProps {
  item: CanvasItem;
  currentUser: User | null;
  hostName: string;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onHover: (id: string | null) => void;
  isDragging: boolean;
  isSelected?: boolean; // Group selection
}

const DraggableItem: React.FC<DraggableItemProps> = ({ 
  item, 
  currentUser, 
  hostName, 
  onPointerDown, 
  onHover,
  isDragging,
  isSelected
}) => {
  
  // Permission Check: Author OR Board Host can edit
  const isAuthorized = currentUser && (currentUser.name === item.author || currentUser.name === hostName);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (isAuthorized) {
      onPointerDown(e, item.id);
    }
  };

  const getStyles = () => {
    return {
      transform: `translate(${item.x}px, ${item.y}px) rotate(${item.rotation}deg)`,
      // Simple z-index: Dragging is highest, Selected/Group is medium, Standard is low
      zIndex: isDragging ? 500 : (isSelected ? 100 : 10),
      width: item.width ? `${item.width}px` : 'auto',
      height: item.height ? `${item.height}px` : 'auto',
    };
  };

  const isTransparent = item.color === 'transparent';

  return (
    <div
      className={`absolute select-none transition-shadow duration-200 
        ${isDragging && !isTransparent && item.type !== ItemType.DRAWING ? 'drop-shadow-2xl scale-[1.01]' : (isTransparent || item.type === ItemType.DRAWING ? '' : 'hover:drop-shadow-lg')} 
        ${isAuthorized ? 'cursor-move' : 'cursor-default'}
        ${isSelected ? 'opacity-90' : ''}
      `}
      style={{ 
        left: 0, 
        top: 0, 
        ...getStyles(),
        minWidth: item.type === ItemType.DRAWING ? '1px' : '50px',
        minHeight: item.type === ItemType.DRAWING ? '1px' : '50px',
        touchAction: 'none'
      }}
      onPointerDown={handlePointerDown}
      onPointerEnter={() => isAuthorized && onHover(item.id)}
      onPointerLeave={() => isAuthorized && onHover(null)}
    >
      
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

    </div>
  );
};

export default DraggableItem;
