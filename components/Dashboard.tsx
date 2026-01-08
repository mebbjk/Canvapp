
import React, { useState, useEffect, useRef } from 'react';
import { User, Board, AppNotification } from '../types';
import { Plus, Info, Wifi, WifiOff, LogOut, ArrowRight, Search, Globe, Home, HeartHandshake, Bell, X } from 'lucide-react';
import { translations } from '../translations';
import { getPublicBoards, subscribeToNotifications, clearNotifications } from '../services/firebaseService';
import BoardCard from './BoardCard'; 

interface DashboardProps {
  user: User;
  visitedBoards: Board[];
  onOpenBoard: (board: Board) => void;
  onCreateBoard: (topic: string) => void;
  onDeleteBoard: (boardId: string) => void;
  onLogout: () => void;
  onOpenAbout: () => void;
  isOnline: boolean;
  appVersion: string;
  language: string;
  LanguageSelector: React.FC;
  setToast: (toast: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user, visitedBoards, onOpenBoard, onCreateBoard, onDeleteBoard, onLogout, onOpenAbout, 
  isOnline, appVersion, language, LanguageSelector, setToast
}) => {
  const [activeTab, setActiveTab] = useState<'my' | 'joined' | 'community'>('my');
  const [isJoinMode, setIsJoinMode] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  
  // Community State
  const [communityBoards, setCommunityBoards] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // @ts-ignore
  const t = translations[language];

  // Subscribe to notifications
  useEffect(() => {
    if (isOnline && user) {
        const unsub = subscribeToNotifications(user.name, (list) => {
            setNotifications(list);
        });
        return () => unsub();
    }
  }, [isOnline, user]);

  // Handle click outside notification dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
            setIsNotifOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
  
  const handleDeleteClick = (e: React.MouseEvent, boardId: string) => {
      e.stopPropagation();
      if (window.confirm(t.deleteConfirm)) {
          onDeleteBoard(boardId);
      }
  };

  const handleNotificationClick = (notif: AppNotification) => {
      window.location.hash = notif.boardId;
      setIsNotifOpen(false);
  };

  const handleClearNotifications = () => {
      clearNotifications(user.name);
  };

  // Improved Filter Logic: Topic, Host, Date
  const filteredCommunityBoards = communityBoards.filter(b => {
    const s = searchTerm.toLowerCase();
    const dateStr = new Date(b.createdAt).toLocaleDateString().toLowerCase();
    const monthStr = new Date(b.createdAt).toLocaleDateString(undefined, { month: 'long' }).toLowerCase();
    
    return (
        b.topic.toLowerCase().includes(s) || 
        b.host.toLowerCase().includes(s) ||
        dateStr.includes(s) ||
        monthStr.includes(s)
    );
  });

  const myBoards = visitedBoards.filter(b => b.host === user.name);
  
  const joinedBoards = visitedBoards.filter(b => 
      b.host !== user.name && 
      (b.items && b.items.some(item => item.author === user.name))
  );

  return (
    <div className="min-h-[100dvh] bg-slate-50 p-4 sm:p-6 relative overflow-y-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-10 max-w-5xl mx-auto gap-4">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 relative">
              <div className="absolute inset-0 bg-indigo-500 rounded-lg transform rotate-6 opacity-80"></div>
              <div className="absolute inset-0 bg-purple-500 rounded-lg transform -rotate-3 opacity-90"></div>
              <div className="absolute inset-0 bg-white border-2 border-slate-900 rounded-lg flex items-center justify-center transform rotate-0 shadow-sm">
                  <div className="w-4 h-4 bg-yellow-400 rounded-sm"></div>
              </div>
           </div>
           
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t.dashboardTitle}</h1>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${isOnline ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span className="hidden sm:inline">{isOnline ? t.status_online : t.status_offline}</span>
          </div>

          <LanguageSelector />
          
          <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors relative"
              >
                  <Bell size={20} />
                  {notifications.length > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white"></span>
                  )}
              </button>

              {isNotifOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-200">
                      <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                          <h3 className="font-bold text-slate-700 text-sm">{t.notifications}</h3>
                          {notifications.length > 0 && (
                              <button onClick={handleClearNotifications} className="text-xs text-indigo-500 hover:underline">{t.clearAll}</button>
                          )}
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                          {notifications.length === 0 ? (
                              <div className="p-6 text-center text-slate-400 text-xs">{t.noNotifications}</div>
                          ) : (
                              notifications.map(notif => (
                                  <div 
                                    key={notif.id} 
                                    onClick={() => handleNotificationClick(notif)}
                                    className="p-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                                  >
                                      <div className="text-xs text-slate-800">
                                          <span className="font-bold">{notif.fromUser}</span> {t.notif_addedItem} <span className="font-bold text-indigo-600">{notif.boardTopic}</span>
                                      </div>
                                      <div className="text-[10px] text-slate-400 mt-1">
                                          {new Date(notif.createdAt).toLocaleTimeString()}
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              )}
          </div>

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

        {/* Tabs */}
        <div className="flex mb-6 gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            <button 
                onClick={() => setActiveTab('my')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-full font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'my' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
                <Home size={18} /> {t.tab_myBoards}
            </button>
            <button 
                onClick={() => setActiveTab('joined')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-full font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'joined' ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-white text-slate-500 hover:bg-purple-50 hover:text-purple-600'}`}
            >
                <HeartHandshake size={18} /> {t.tab_joined}
            </button>
            <button 
                onClick={() => setActiveTab('community')}
                className={`flex-1 sm:flex-none px-6 py-2.5 rounded-full font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap ${activeTab === 'community' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
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

                {/* My Boards */}
                {myBoards.map(board => (
                    <BoardCard 
                        key={board.id} 
                        board={board} 
                        currentUserName={user.name} 
                        onClick={onOpenBoard} 
                        onDelete={handleDeleteClick}
                        t={t}
                        variant="my"
                    />
                ))}
            </div>
        ) : activeTab === 'joined' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {joinedBoards.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-slate-400 flex flex-col items-center gap-4">
                        <HeartHandshake size={48} className="opacity-20" />
                        <p>You haven't contributed to any other boards yet.</p>
                    </div>
                ) : (
                    joinedBoards.map(board => (
                        <BoardCard 
                            key={board.id} 
                            board={board} 
                            currentUserName={user.name} 
                            onClick={onOpenBoard} 
                            t={t}
                            variant="joined"
                        />
                    ))
                )}
             </div>
        ) : (
            <div>
                {/* Community Tab */}
                <div className="mb-6 relative">
                     <Search className="absolute left-3 top-3.5 text-slate-400" size={20} />
                     <input 
                        type="text" 
                        placeholder="Search by topic, host name or date..." 
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
                             <BoardCard 
                                key={board.id} 
                                board={board} 
                                currentUserName={user.name} 
                                onClick={onOpenBoard} 
                                t={t}
                                variant="community"
                            />
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
