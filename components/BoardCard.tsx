
import React from 'react';
import { Board, ItemType } from '../types';
import { Users, Trash2, Calendar } from 'lucide-react';

interface BoardCardProps {
  board: Board;
  currentUserName: string;
  onClick: (board: Board) => void;
  onDelete?: (e: React.MouseEvent, boardId: string) => void;
  t: any;
  variant?: 'my' | 'joined' | 'community';
}

const BoardCard: React.FC<BoardCardProps> = ({ board, currentUserName, onClick, onDelete, t, variant = 'my' }) => {
  const isHost = board.host === currentUserName;
  const itemsPreview = board.items ? board.items.slice(0, 5) : [];

  return (
    <div 
        onClick={() => onClick(board)} 
        className={`bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden group ${variant === 'community' ? 'h-52' : 'h-64'}`}
    >
        {/* PREVIEW AREA */}
        <div className="absolute inset-0 h-32 bg-slate-100 overflow-hidden border-b border-slate-100">
            {/* Background */}
            {board.backgroundImage ? (
                <div className="w-full h-full opacity-60" style={{ backgroundImage: `url(${board.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            ) : (
                <div className="w-full h-full opacity-60" style={{ backgroundColor: board.backgroundColor || '#f0f9ff' }}></div>
            )}

            {/* Mini Items Render (Simulation of canvas) */}
            <div className="absolute inset-0 pointer-events-none">
                {itemsPreview.map((item, i) => {
                     // Normalize positions for the thumbnail container (simulated)
                     // We grab absolute positions but scale them way down and center mostly
                     // Ideally we just scatter them a bit
                     const left = (i * 20) + 10 + '%';
                     const top = (i * 10) + 20 + '%';
                     
                     return (
                         <div key={i} className="absolute transform scale-50 origin-top-left drop-shadow-sm" style={{ left, top }}>
                             {item.type === ItemType.TEXT && (
                                 <div className="bg-yellow-200 p-1 text-[8px] rounded w-16 h-8 overflow-hidden" style={{ backgroundColor: item.color || '#fef3c7' }}>
                                     {item.content}
                                 </div>
                             )}
                             {(item.type === ItemType.IMAGE || item.type === ItemType.STICKER) && (
                                 <img src={item.content} className="w-12 h-12 object-cover rounded" />
                             )}
                             {item.type === ItemType.EMOJI && (
                                 <div className="text-xl">{item.content}</div>
                             )}
                         </div>
                     );
                })}
            </div>
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-white/90 to-transparent"></div>
        </div>

        {/* Delete Button (Only for My Boards) */}
        {variant === 'my' && isHost && onDelete && (
            <button 
                onClick={(e) => onDelete(e, board.id)}
                className="absolute top-2 right-2 bg-white hover:bg-red-500 hover:text-white text-slate-400 p-2 rounded-full shadow-md z-20 transition-all opacity-0 group-hover:opacity-100"
                title={t.deleteBoard}
            >
                <Trash2 size={16} />
            </button>
        )}

        {/* Content Section (Pushed down) */}
        <div className="relative z-10 pt-32 px-5 pb-5 flex flex-col h-full justify-end">
            
            <h3 className="text-lg font-bold text-slate-800 mb-1 truncate leading-tight">{board.topic}</h3>
            
            <div className="flex flex-col gap-1 mt-1">
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Users size={12} className="text-indigo-500" /> 
                    {board.host}
                </p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(board.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
            </div>

            {variant === 'joined' && (
                <div className="absolute top-3 right-3 bg-purple-100 text-purple-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm">Joined</div>
            )}
            
            {variant === 'community' && (
                <div className="absolute top-3 right-3 bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm">Public</div>
            )}
        </div>
    </div>
  );
};

export default BoardCard;
