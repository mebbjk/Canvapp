
import React, { useState, useEffect } from 'react';
import { User, Board } from './types';
import Toast from './components/Toast';
import AboutModal from './components/AboutModal';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import CanvasBoard from './components/CanvasBoard';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Language, LANGUAGES, translations } from './translations';
import { 
  createBoardInCloud, 
  subscribeToBoard, 
  updateBoardInCloud, 
  isFirebaseReady, 
  subscribeToAuth,
  logoutUser
} from './services/firebaseService';
import { generateId, safeJsonParse } from './utils/helpers';

const STORAGE_KEY_VISITED_BOARDS = 'collab_canvas_visited';
const STORAGE_KEY_LANG = 'collab_canvas_lang';
const APP_VERSION = "v3.1.2";

const App: React.FC = () => {
  // --- Global State ---
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [visitedBoards, setVisitedBoards] = useState<Board[]>([]);
  
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  
  const [language, setLanguage] = useState<Language>('tr');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // @ts-ignore
  const t = translations[language];

  // --- Persistence & Init ---
  
  const addToVisitedBoards = (board: Board) => {
    setVisitedBoards(prev => {
      const exists = prev.find(b => b.id === board.id);
      let newBoards;
      if (exists) {
        newBoards = prev.map(b => b.id === board.id ? { 
          ...b, 
          topic: board.topic, 
          host: board.host, 
          backgroundImage: board.backgroundImage, 
          backgroundColor: board.backgroundColor,
          backgroundSize: board.backgroundSize,
          items: board.items 
        } : b);
      } else {
        newBoards = [board, ...prev];
      }
      localStorage.setItem(STORAGE_KEY_VISITED_BOARDS, JSON.stringify(newBoards));
      return newBoards;
    });
  };

  const updateBoard = (updatedBoard: Board) => {
    setCurrentBoard(updatedBoard);
    if (isOnline) {
      updateBoardInCloud(updatedBoard);
    }
    addToVisitedBoards(updatedBoard);
  };

  useEffect(() => {
    setIsOnline(isFirebaseReady());
    const storedLang = localStorage.getItem(STORAGE_KEY_LANG);
    if (storedLang && LANGUAGES.some(l => l.code === storedLang)) {
      setLanguage(storedLang as Language);
    }
    const cachedBoards = safeJsonParse(localStorage.getItem(STORAGE_KEY_VISITED_BOARDS), []) as Board[];
    setVisitedBoards(cachedBoards);

    const unsubscribeAuth = subscribeToAuth((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Anonymous',
          email: firebaseUser.email || undefined,
          photoURL: firebaseUser.photoURL || undefined
        });
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // --- Routing ---

  useEffect(() => {
    if (authLoading) return;
    let cleanupSub: (() => void) | undefined;

    const handleRouting = () => {
      const hash = window.location.hash.replace('#', '');
      
      if (cleanupSub) { cleanupSub(); cleanupSub = undefined; }

      if (hash) {
        if (isFirebaseReady()) {
          cleanupSub = subscribeToBoard(hash, (cloudBoard) => {
             if (cloudBoard) {
               setCurrentBoard(cloudBoard);
               addToVisitedBoards(cloudBoard); 
             } else {
               // If cloud returns null (maybe permission denied or not exists), check local cache
               const cachedBoards = safeJsonParse(localStorage.getItem(STORAGE_KEY_VISITED_BOARDS), []) as Board[];
               const local = cachedBoards.find(b => b.id === hash);
               if (local) {
                 setCurrentBoard(local);
                 setToast({ message: "Loaded from local cache (Cloud sync unavailable)", type: 'error' });
               } else {
                 setCurrentBoard(null);
                 if (user) setToast({ message: t.boardNotFound, type: 'error' });
               }
             }
          });
        } else {
           const cachedBoards = safeJsonParse(localStorage.getItem(STORAGE_KEY_VISITED_BOARDS), []) as Board[];
           const local = cachedBoards.find(b => b.id === hash);
           if (local) setCurrentBoard(local);
           else setCurrentBoard(null);
        }
      } else {
        setCurrentBoard(null);
      }
    };

    handleRouting();
    window.addEventListener('hashchange', handleRouting);
    return () => {
      window.removeEventListener('hashchange', handleRouting);
      if (cleanupSub) cleanupSub();
    };
  }, [authLoading, user]);

  // --- Actions ---

  const handleCreateBoard = async (topic: string) => {
    if (!user) return;
    const newBoard: Board = {
      id: generateId(),
      topic, 
      items: [], 
      createdAt: Date.now(), 
      host: user.name,
      // Default Styling
      backgroundColor: '#f8fafc',
    };

    // Optimistic creation: Try cloud, but always succeed locally so UX is smooth
    if (isFirebaseReady()) {
      try {
        await createBoardInCloud(newBoard);
      } catch (error) {
        console.error("Cloud creation failed:", error);
        setToast({ message: "Cloud sync failed, created locally.", type: 'error' });
      }
    }
    
    // Always navigate, even if cloud fails
    addToVisitedBoards(newBoard); // Ensure it's in local storage immediately
    window.location.hash = newBoard.id;
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentBoard(null);
    window.location.hash = '';
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast({ message: t.linkCopied, type: 'success' });
    } catch (err) {
      setToast({ message: t.copyFail, type: 'error' });
    }
  };

  const handleLanguageChange = (code: Language) => {
    setLanguage(code);
    localStorage.setItem(STORAGE_KEY_LANG, code);
    setIsLangMenuOpen(false);
  };

  const LanguageSelector = ({ className }: { className?: string }) => (
    <div className={className ?? "absolute top-2 right-2 sm:top-4 sm:right-4 z-[60]"}>
      <div className="relative">
        <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="bg-white/90 backdrop-blur px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg shadow-sm border border-slate-200 flex items-center gap-1 sm:gap-2 hover:bg-slate-50 transition-colors">
          <span className="text-lg sm:text-xl">{LANGUAGES.find(l => l.code === language)?.flag}</span>
          <span className="font-medium text-slate-700 hidden md:inline">{LANGUAGES.find(l => l.code === language)?.label}</span>
          <ChevronDown size={14} className="text-slate-400" />
        </button>
        {isLangMenuOpen && (
          <div className="absolute right-0 mt-2 w-40 sm:w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200 z-[70]">
            {LANGUAGES.map(lang => (
              <button key={lang.code} onClick={() => handleLanguageChange(lang.code)} className={`w-full text-left px-4 py-2 hover:bg-indigo-50 flex items-center gap-3 transition-colors ${language === lang.code ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-900 bg-white hover:bg-slate-50'}`}>
                <span className="text-xl">{lang.flag}</span>
                <span className="font-medium">{lang.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-slate-50 relative h-[100dvh]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {isAboutOpen && <AboutModal onClose={() => setIsAboutOpen(false)} t={t} />}

      {authLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
        </div>
      ) : !user ? (
        <AuthScreen 
          language={language}
          onLoginSuccess={() => {}} // Auth state listener handles redirect
          onOpenAbout={() => setIsAboutOpen(true)}
          LanguageSelector={LanguageSelector}
          setToast={setToast}
        />
      ) : !currentBoard ? (
        <Dashboard 
          user={user}
          visitedBoards={visitedBoards}
          onOpenBoard={(b) => { window.location.hash = b.id; }}
          onCreateBoard={handleCreateBoard}
          onLogout={handleLogout}
          onOpenAbout={() => setIsAboutOpen(true)}
          isOnline={isOnline}
          appVersion={APP_VERSION}
          language={language}
          LanguageSelector={LanguageSelector}
          setToast={setToast}
        />
      ) : (
        <CanvasBoard 
          board={currentBoard}
          user={user}
          isOnline={isOnline}
          language={language}
          onUpdateBoard={updateBoard}
          onBack={() => { window.location.hash = ''; setCurrentBoard(null); }}
          onShare={handleShare}
          setToast={setToast}
        />
      )}
    </div>
  );
};

export default App;
