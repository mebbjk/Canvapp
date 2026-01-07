
import React, { useState, useRef } from 'react';
import { User, Board, ItemType } from '../types';
import { Layout, Plus, Users, Image as ImageIcon, X, Maximize, Minimize, Move, Info, Wifi, WifiOff, LogOut } from 'lucide-react';
import { translations } from '../translations';
import { compressImage } from '../utils/helpers';

const BOARD_COLORS = [
  '#f8fafc', '#fff1f2', '#f0f9ff', '#f0fdf4', '#fffbeb', '#faf5ff', '#1e293b'
];

interface DashboardProps {
  user: User;
  visitedBoards: Board[];
  onOpenBoard: (board: Board) => void;
  onCreateBoard: (topic: string, bg: string | null, bgColor: string | undefined, bgSize: any) => void;
  onLogout: () => void;
  onOpenAbout: () => void;
  isOnline: boolean;
  appVersion: string;
  language: string;
  LanguageSelector: React.FC;
  setToast: (toast: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user, visitedBoards, onOpenBoard, onCreateBoard, onLogout, onOpenAbout, 
  isOnline, appVersion, language, LanguageSelector, setToast 
}) => {
  const [isJoinMode, setIsJoinMode] = useState(false);
  const [newBoardBg, setNewBoardBg] = useState<string | null>(null);
  const [newBoardColor, setNewBoardColor] = useState<string>(BOARD_COLORS[0]);
  const [newBoardBgSize, setNewBoardBgSize] = useState<'cover' | 'contain' | 'auto'>('cover');
  const bgInputRef = useRef<HTMLInputElement>(null);

  // @ts-ignore
  const t = translations[language];

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
         setToast({ message: "Image is too large. Compressing...", type: 'success' });
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const compressed = await compressImage(base64);
          setNewBoardBg(compressed);
          setNewBoardColor('transparent');
        } catch (error) {
          setToast({ message: "Failed to process image", type: 'error' });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateSubmit = (e: any) => {
    if (e.key === 'Enter') {
      const topic = (e.target as HTMLInputElement).value;
      if (!topic) return;
      onCreateBoard(topic, newBoardBg, newBoardBg ? undefined : newBoardColor, newBoardBgSize);
      setIsJoinMode(false);
      setNewBoardBg(null);
      setNewBoardColor(BOARD_COLORS[0]);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 p-4 sm:p-6 relative overflow-y-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-10 max-w-5xl mx-auto gap-4">
        <div className="flex items-center gap-3">
           <div className="bg-indigo-600 p-2 rounded-lg">
            <Layout className="text-white" size={20} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{t.dashboardTitle}</h1>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <LanguageSelector />
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.name} className="w-6 h-6 rounded-full" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">👤</div>
            )}
            <span className="text-slate-600 font-medium text-sm sm:text-base truncate max-w-[150px]">
              {user.name}
            </span>
          </div>
          
          <button onClick={onOpenAbout} className="text-slate-500 hover:text-indigo-600 transition-colors p-2 hover:bg-indigo-50 rounded-full" title={t.aboutBtn}>
            <Info size={20} />
          </button>
          <button onClick={onLogout} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full" title={t.logout}>
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto pb-10">
        <div className={`mb-6 p-3 rounded-xl flex items-center justify-between text-sm ${isOnline ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}>
            <div className="flex items-center gap-2">
              {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
              {isOnline ? "Connected to Cloud. Boards will sync automatically." : "Offline Mode. Changes are local."}
            </div>
            <span className="opacity-50 text-xs">{appVersion}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Card */}
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 flex flex-col items-center justify-center text-center hover:border-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer group h-64 shadow-sm hover:shadow-md relative overflow-hidden">
            {isJoinMode ? (
              <div className="w-full animate-in fade-in zoom-in duration-200 z-10">
                <h3 className="font-semibold text-slate-800 mb-2">{t.topicPrompt}</h3>
                <input autoFocus type="text" className="w-full p-2 border rounded-lg mb-4 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base bg-white" placeholder={t.topicPlaceholder} onKeyDown={handleCreateSubmit} />
                
                <div className="flex flex-col gap-3 justify-center mb-2">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Choose Background</label>
                   <div className="flex gap-2 justify-center">
                     {BOARD_COLORS.map(color => (
                        <button 
                          key={color}
                          onClick={(e) => { e.stopPropagation(); setNewBoardColor(color); setNewBoardBg(null); }}
                          className={`w-6 h-6 rounded-full border border-slate-300 shadow-sm ${newBoardColor === color && !newBoardBg ? 'ring-2 ring-indigo-500 scale-110' : ''}`}
                          style={{ backgroundColor: color }}
                          title="Background Color"
                        />
                     ))}
                   </div>

                   <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                     <span className="w-4 border-t border-slate-300"></span>
                     <span>OR</span>
                     <span className="w-4 border-t border-slate-300"></span>
                   </div>

                   <input type="file" ref={bgInputRef} onChange={handleBgUpload} accept="image/*" className="hidden" />
                   <div className="flex justify-center">
                     <button onClick={(e) => { e.stopPropagation(); bgInputRef.current?.click(); }} className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-full border transition-colors ${newBoardBg ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'}`}>
                       {newBoardBg ? <span className="font-semibold flex items-center gap-1">✓ Image Set</span> : <><ImageIcon size={14} /> Upload Image</>}
                     </button>
                   </div>
                   
                   {newBoardBg && (
                     <div className="flex justify-center gap-1">
                       <button onClick={(e) => { e.stopPropagation(); setNewBoardBgSize('cover'); }} className={`p-1.5 rounded-md ${newBoardBgSize === 'cover' ? 'bg-indigo-100 text-indigo-600 ring-1 ring-indigo-400' : 'bg-white text-slate-400'}`} title="Cover"><Maximize size={12} /></button>
                       <button onClick={(e) => { e.stopPropagation(); setNewBoardBgSize('contain'); }} className={`p-1.5 rounded-md ${newBoardBgSize === 'contain' ? 'bg-indigo-100 text-indigo-600 ring-1 ring-indigo-400' : 'bg-white text-slate-400'}`} title="Contain"><Minimize size={12} /></button>
                     </div>
                   )}
                </div>
                
                <button onClick={(e) => { e.stopPropagation(); setIsJoinMode(false); setNewBoardBg(null); setNewBoardBgSize('cover'); setNewBoardColor(BOARD_COLORS[0]); }} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 bg-white rounded-full p-1"><X size={16} /></button>
              </div>
            ) : (
              <div onClick={() => setIsJoinMode(true)} className="w-full h-full flex flex-col items-center justify-center z-10">
                <div className="bg-indigo-100 text-indigo-600 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform"><Plus size={32} /></div>
                <h3 className="text-xl font-bold text-slate-700">{t.newCanvasTitle}</h3>
                <p className="text-slate-500 mt-2">{t.newCanvasSubtitle}</p>
              </div>
            )}
            {(newBoardBg || newBoardColor) && isJoinMode && (
               <div 
                  className="absolute inset-0 z-0 opacity-20 pointer-events-none transition-all duration-300" 
                  style={{ 
                    backgroundColor: newBoardColor,
                    backgroundImage: newBoardBg ? `url(${newBoardBg})` : 'none', 
                    backgroundSize: newBoardBgSize, 
                    backgroundPosition: 'center', 
                    backgroundRepeat: 'no-repeat' 
                  }}
               ></div>
            )}
          </div>

          {/* Visited Boards */}
          {visitedBoards.map(board => (
            <div key={board.id} onClick={() => onOpenBoard(board)} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer h-64 relative overflow-hidden group">
               <div className="absolute inset-0 z-0 opacity-20 pointer-events-none transition-opacity group-hover:opacity-30">
                 {board.backgroundImage ? (
                    <div className="w-full h-full" style={{ backgroundImage: `url(${board.backgroundImage})`, backgroundSize: board.backgroundSize || 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
                 ) : (
                    <div className="w-full h-full" style={{ backgroundColor: board.backgroundColor || '#f0f9ff' }}></div>
                 )}
               </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-slate-800 mb-1 truncate">{board.topic}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1"><Users size={12} /> {t.host}: {board.host}</p>
              </div>
              <div className="flex items-center gap-2 mt-4 pl-2 relative z-10">
                {board.items.length === 0 && <span className="text-xs text-slate-400 italic mix-blend-multiply">{t.emptyCanvasLabel}</span>}
                {board.items.slice(0, 4).map((item, i) => (
                  <div key={i} className="-ml-2 w-10 h-10 rounded-full bg-white border-2 border-slate-50 shadow-sm flex items-center justify-center text-[10px] overflow-hidden transform group-hover:translate-x-1 transition-transform" style={{ zIndex: 10 - i }}>
                    {item.type === ItemType.EMOJI ? item.content : (item.type === ItemType.IMAGE || item.type === ItemType.STICKER ? <img src={item.content} className="w-full h-full object-cover" /> : 'T')}
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 relative z-10">
                <span>{new Date(board.createdAt).toLocaleDateString()}</span>
                <span className="bg-white/50 px-2 py-1 rounded-full backdrop-blur-sm">{board.items.length} {t.itemsCount}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
