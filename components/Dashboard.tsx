
import React, { useState, useEffect } from 'react';
import { User, Board, ItemType } from '../types';
import { Layout, Plus, Users, X, Info, Wifi, WifiOff, LogOut, ArrowRight, Search, Globe, Home } from 'lucide-react';
import { translations } from '../translations';
import { getPublicBoards } from '../services/firebaseService';

interface DashboardProps {
  user: User;
  visitedBoards: Board[];
  onOpenBoard: (board: Board) => void;
  onCreateBoard: (topic: string) => void;
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
  const [activeTab, setActiveTab] = useState<'my' | 'community'>('my');
  const [isJoinMode, setIsJoinMode] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  
  // Community State
  const [communityBoards, setCommunityBoards] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);

  // @ts-ignore
  const t = translations[language];

  // Fetch community boards when tab changes
  useEffect(() => {
    if (activeTab === 'community' && isOnline) {
        setIsLoadingCommunity(true);
        getPublicBoards()
            .then(data => setCommunityBoards(data))
            .catch(() => setCommunityBoards([]))
            .finally(() => setIsLoadingCommunity(false));
    }
  }, [activeTab, isOnline]);

  const executeCreateBoard = () => {
    if (!topicInput.trim()) return;
    onCreateBoard(topicInput);
    
    // Reset UI
    setIsJoinMode(false);
    setTopicInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      e.stopPropagation();
      executeCreateBoard();
    }
  };

  const openCreateModal = () => {
    setIsJoinMode(true);
    setTopicInput(''); // Clear previous input
  };

  const closeCreateModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsJoinMode(false);
    setTopicInput('');
  };

  // Filter Logic
  const filteredCommunityBoards = communityBoards.filter(b => 
    b.topic.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.host.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              {isOnline ? "Connected to Cloud." : "Offline Mode."}
            </div>
            <span className="opacity-50 text-xs">{appVersion}</span>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 gap-2">
            <button 
                onClick={() => setActiveTab('my')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-full font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'my' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
                <Home size={18} /> {t.tab_myBoards}
            </button>
            <button 
                onClick={() => setActiveTab('community')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-full font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'community' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
            >
                <Globe size={18} /> {t.tab_community}
            </button>
        </div>

        {activeTab === 'my' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Create New Card */}
                <div 
                    onClick={!isJoinMode ? openCreateModal : undefined}
                    className={`bg-white rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-center transition-all shadow-sm relative overflow-hidden ${!isJoinMode ? 'hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer hover:shadow-md' : 'border-indigo-500 ring-4 ring-indigo-50 cursor-default'}`}
                    style={{ minHeight: '16rem' }}
                >
                    {isJoinMode ? (
                    <div className="w-full animate-in fade-in zoom-in duration-200 z-10 flex flex-col h-full justify-between p-6 bg-white/90 backdrop-blur-sm">
                        <div className="w-full my-auto">
                        <h3 className="font-bold text-slate-800 mb-4 text-lg">{t.topicPrompt}</h3>
                        <input 
                            autoFocus 
                            type="text" 
                            value={topicInput}
                            onChange={(e) => setTopicInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full p-3 border rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-medium shadow-inner bg-white mb-6" 
                            placeholder={t.topicPlaceholder} 
                        />
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); executeCreateBoard(); }}
                            disabled={!topicInput.trim()}
                            className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                        >
                            {t.joinButton} <ArrowRight size={20} />
                        </button>
                        </div>
                        
                        <button 
                            onClick={closeCreateModal} 
                            className="absolute top-3 right-3 text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 rounded-full p-2 transition-colors shadow-sm"
                            title={t.close}
                        >
                            <X size={20} />
                        </button>
                    </div>
                    ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center z-10 p-6">
                        <div className="bg-indigo-100 text-indigo-600 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform"><Plus size={32} /></div>
                        <h3 className="text-xl font-bold text-slate-700">{t.newCanvasTitle}</h3>
                        <p className="text-slate-500 mt-2">{t.newCanvasSubtitle}</p>
                    </div>
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
        ) : (
            <div>
                {/* Community Tab */}
                <div className="mb-6 relative">
                     <Search className="absolute left-3 top-3.5 text-slate-400" size={20} />
                     <input 
                        type="text" 
                        placeholder={t.search_placeholder} 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                     />
                </div>

                {isLoadingCommunity ? (
                    <div className="text-center py-20 text-slate-400">Loading community boards...</div>
                ) : filteredCommunityBoards.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-4">
                        <Globe size={48} className="opacity-20" />
                        <p>{searchTerm ? "No matching boards found." : "No public boards yet. Be the first to publish!"}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCommunityBoards.map(board => (
                             <div key={board.id} onClick={() => onOpenBoard(board)} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer h-40 group relative overflow-hidden">
                                 {/* Simple pattern background for community items since we don't fetch heavy BG images */}
                                 <div className="absolute top-0 right-0 p-10 bg-indigo-50 rounded-bl-[100px] -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                                 
                                 <div className="relative z-10">
                                    <h3 className="text-lg font-bold text-slate-800 mb-1 truncate">{board.topic}</h3>
                                    <p className="text-xs text-indigo-500 font-bold flex items-center gap-1 uppercase tracking-wider mb-2">
                                        {t.host}: {board.host}
                                    </p>
                                 </div>
                                 
                                 <div className="mt-auto relative z-10 flex justify-between items-center">
                                    <span className="text-xs text-slate-400">{new Date(board.createdAt).toLocaleDateString()}</span>
                                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-bold">Public</span>
                                 </div>
                             </div>
                        ))}
                    </div>
                )}
            </div>
        )}

      </main>
    </div>
  );
};

export default Dashboard;
