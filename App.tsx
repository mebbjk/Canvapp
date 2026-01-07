import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Board, CanvasItem, ItemType } from './types';
import Toolbar from './components/Toolbar';
import DraggableItem from './components/DraggableItem';
import Toast from './components/Toast';
import AboutModal from './components/AboutModal';
import { Share2, LogOut, Layout, Plus, Users, Link as LinkIcon, ExternalLink, Globe, ChevronDown, Image as ImageIcon, X, Maximize, Minimize, Move, Settings, Key, HelpCircle, ShieldCheck, Info } from 'lucide-react';
import { Language, LANGUAGES, translations } from './translations';

const STORAGE_KEY_USER = 'collab_canvas_user';
const STORAGE_KEY_BOARDS = 'collab_canvas_boards';
const STORAGE_KEY_LANG = 'collab_canvas_lang';
const STORAGE_KEY_API_KEY = 'collab_canvas_api_key';
const BROADCAST_CHANNEL_NAME = 'collab_canvas_sync';

// --- Helpers ---
const safeJsonParse = (str: string | null, fallback: any) => {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error('JSON Parse Error:', e);
    return fallback;
  }
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Image Compression Helper
const compressImage = (base64Str: string, maxWidth = 1280, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF'; // Ensure transparent PNGs get white background if converting to JPEG
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    }
  });
};

const App: React.FC = () => {
  // --- State ---
  const [user, setUser] = useState<User | null>(null);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [isJoinMode, setIsJoinMode] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  // Settings & API Key
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  
  // Board Creation State
  const [newBoardBg, setNewBoardBg] = useState<string | null>(null);
  const [newBoardBgSize, setNewBoardBgSize] = useState<'cover' | 'contain' | 'auto'>('cover');
  const bgInputRef = useRef<HTMLInputElement>(null);
  
  // Language - Default changed to 'tr'
  const [language, setLanguage] = useState<Language>('tr');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  
  // UI Feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Interaction State (Dragging & Resizing)
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [resizingItemId, setResizingItemId] = useState<string | null>(null);
  const [interactionStart, setInteractionStart] = useState({ x: 0, y: 0 }); // Pointer start pos
  const [itemInitialState, setItemInitialState] = useState<any>(null); // Snapshot of item before drag/resize

  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Real-time Sync Channel
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Translation Helper
  const t = translations[language];

  // --- Initialization & Real-time Sync ---
  useEffect(() => {
    // 1. Load User
    const storedUser = localStorage.getItem(STORAGE_KEY_USER);
    if (storedUser) {
      setUser(safeJsonParse(storedUser, null));
    }

    // Load API Key
    const storedKey = localStorage.getItem(STORAGE_KEY_API_KEY);
    if (storedKey) {
      setApiKeyInput(storedKey);
    }

    // Load Language
    const storedLang = localStorage.getItem(STORAGE_KEY_LANG);
    if (storedLang && LANGUAGES.some(l => l.code === storedLang)) {
      setLanguage(storedLang as Language);
    }

    // 2. Load Boards
    const loadBoards = () => {
      const storedBoards = localStorage.getItem(STORAGE_KEY_BOARDS);
      return safeJsonParse(storedBoards, []) as Board[];
    };

    const initialBoards = loadBoards();
    setBoards(initialBoards);

    // 3. Handle URL Hash (Deep Linking)
    const handleHashChange = (allBoards: Board[]) => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        const sharedBoard = allBoards.find(b => b.id === hash);
        if (sharedBoard) {
          setCurrentBoard(sharedBoard);
        } else {
           // Board not found, remove hash and stay on dashboard
           setCurrentBoard(null);
           try {
             const cleanUrl = window.location.href.split('#')[0];
             window.history.replaceState(null, '', cleanUrl);
           } catch (e) {
             window.location.hash = '';
           }
        }
      } else {
        setCurrentBoard(null);
      }
    };

    handleHashChange(initialBoards);

    // 4. Setup BroadcastChannel for Multi-Tab Sync
    try {
      channelRef.current = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      
      channelRef.current.onmessage = (event) => {
        const { type, payload } = event.data;
        
        if (type === 'UPDATE_BOARD') {
          const updatedBoard = payload as Board;
          
          // Update Boards List
          setBoards(prev => {
            const idx = prev.findIndex(b => b.id === updatedBoard.id);
            const newBoards = [...prev];
            if (idx >= 0) {
              newBoards[idx] = updatedBoard;
            } else {
              newBoards.push(updatedBoard);
            }
            try {
               localStorage.setItem(STORAGE_KEY_BOARDS, JSON.stringify(newBoards));
            } catch (e) {
               console.warn("Could not save to localStorage (sync)", e);
            }
            return newBoards;
          });

          // Update Current Board if needed
          setCurrentBoard(prev => {
            if (prev && prev.id === updatedBoard.id) {
              return updatedBoard;
            }
            return prev;
          });
        }
      };
    } catch (e) {
      console.error('BroadcastChannel not supported or failed', e);
    }

    window.addEventListener('hashchange', () => handleHashChange(loadBoards()));

    return () => {
      channelRef.current?.close();
      window.removeEventListener('hashchange', () => {});
    };
  }, []);

  // --- Persistence Logic ---

  const saveAndBroadcastBoard = (updatedBoard: Board) => {
    setCurrentBoard(updatedBoard);
    
    setBoards(prev => {
      const idx = prev.findIndex(b => b.id === updatedBoard.id);
      let newBoards = [...prev];
      if (idx >= 0) {
        newBoards[idx] = updatedBoard;
      } else {
        newBoards = [...prev, updatedBoard];
      }
      
      try {
        localStorage.setItem(STORAGE_KEY_BOARDS, JSON.stringify(newBoards));
      } catch (e) {
        console.error("Storage limit reached:", e);
        // We catch the error to prevent the app from crashing (white screen)
        // In a real app, we might show a toast here, but we are inside a state setter.
      }
      
      return newBoards;
    });

    channelRef.current?.postMessage({
      type: 'UPDATE_BOARD',
      payload: updatedBoard
    });
  };

  const handleLanguageChange = (code: Language) => {
    setLanguage(code);
    localStorage.setItem(STORAGE_KEY_LANG, code);
    setIsLangMenuOpen(false);
  };

  const saveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem(STORAGE_KEY_API_KEY, apiKeyInput.trim());
      setToast({ message: t.apiKeySaved, type: 'success' });
    } else {
      localStorage.removeItem(STORAGE_KEY_API_KEY);
    }
    setIsSettingsOpen(false);
  };

  // --- Actions ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    // Save User
    const newUser: User = { id: generateId(), name: inputValue };
    setUser(newUser);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
    setInputValue('');

    // Save API Key if provided at login
    if (apiKeyInput.trim()) {
      localStorage.setItem(STORAGE_KEY_API_KEY, apiKeyInput.trim());
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (e.g., > 5MB limit check before processing)
      if (file.size > 5 * 1024 * 1024) {
         setToast({ message: "Image is too large. Compressing...", type: 'success' });
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          // Compress the image before setting state
          const compressed = await compressImage(base64);
          setNewBoardBg(compressed);
        } catch (error) {
          setToast({ message: "Failed to process image", type: 'error' });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateBoard = (topic: string) => {
    if (!user) return;
    const newBoard: Board = {
      id: generateId(),
      topic,
      items: [],
      createdAt: Date.now(),
      host: user.name,
      backgroundImage: newBoardBg || undefined,
      backgroundSize: newBoardBg ? newBoardBgSize : undefined
    };
    saveAndBroadcastBoard(newBoard);
    window.location.hash = newBoard.id;
    // Reset creation state
    setNewBoardBg(null);
    setNewBoardBgSize('cover');
    setIsJoinMode(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY_USER);
    setUser(null);
    setCurrentBoard(null);
    try {
      window.history.pushState("", document.title, window.location.pathname + window.location.search);
    } catch (e) {
      window.location.hash = '';
    }
  };

  const handleShare = async () => {
    if (!currentBoard) return;
    const url = `${window.location.origin}${window.location.pathname}#${currentBoard.id}`;
    
    const copyToClipboard = async (text: string) => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const textArea = document.createElement("textarea");
          textArea.value = text;
          textArea.style.position = "fixed";
          textArea.style.left = "-9999px";
          textArea.style.top = "0";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          textArea.remove();
        }
        setToast({ message: t.linkCopied, type: 'success' });
      } catch (err) {
        console.error('Failed to copy:', err);
        setToast({ message: t.copyFail, type: 'error' });
      }
    };

    await copyToClipboard(url);
  };

  // --- Canvas Logic ---

  const addItem = (type: ItemType, content: string, color?: string, textColor?: string) => {
    if (!currentBoard || !user) return;

    const viewportX = window.innerWidth / 2;
    const viewportY = window.innerHeight / 2;
    const randX = (Math.random() - 0.5) * 150;
    const randY = (Math.random() - 0.5) * 150;

    let width = 200;
    let height = 200;
    if (type === ItemType.TEXT) {
      width = 250;
      height = undefined;
    } else if (type === ItemType.EMOJI) {
      width = 100;
      height = 100;
    }

    const newItem: CanvasItem = {
      id: generateId(),
      type,
      content,
      x: viewportX + randX - 100,
      y: viewportY + randY - 100,
      rotation: (Math.random() - 0.5) * 20,
      author: user.name,
      createdAt: Date.now(),
      color,
      textColor,
      width,
      height
    };

    const updatedBoard = {
      ...currentBoard,
      items: [...currentBoard.items, newItem]
    };

    saveAndBroadcastBoard(updatedBoard);
  };

  const deleteItem = (id: string) => {
    if (!currentBoard) return;
    const updatedBoard = {
      ...currentBoard,
      items: currentBoard.items.filter(i => i.id !== id)
    };
    saveAndBroadcastBoard(updatedBoard);
  };

  const changeItemLayer = (id: string, direction: 'front' | 'back') => {
    if (!currentBoard) return;
    const items = [...currentBoard.items];
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return;

    const [item] = items.splice(index, 1);
    
    if (direction === 'front') {
      items.push(item);
    } else {
      items.unshift(item);
    }

    const updatedBoard = {
      ...currentBoard,
      items
    };
    saveAndBroadcastBoard(updatedBoard);
  };

  // --- Interaction Handlers (Pointer Events for Touch & Mouse) ---

  const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    const item = currentBoard?.items.find(i => i.id === id);
    if (item) {
      setDraggedItemId(id);
      setInteractionStart({ x: e.clientX, y: e.clientY });
      setItemInitialState({ ...item });
      // Important for touch scrolling prevention during drag
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [currentBoard]);

  const handleResizeStart = useCallback((e: React.PointerEvent, id: string) => {
    const item = currentBoard?.items.find(i => i.id === id);
    if (item) {
      setResizingItemId(id);
      setInteractionStart({ x: e.clientX, y: e.clientY });
      
      const defaultWidth = item.type === ItemType.TEXT ? 250 : (item.type === ItemType.EMOJI ? 100 : 200);
      const defaultHeight = (item.type === ItemType.IMAGE || item.type === ItemType.STICKER || item.type === ItemType.EMOJI) ? (item.type === ItemType.EMOJI ? 100 : 200) : undefined;
      
      setItemInitialState({ 
        ...item,
        width: item.width || defaultWidth,
        height: item.height || defaultHeight
      });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [currentBoard]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!currentBoard || !itemInitialState) return;

    if (draggedItemId) {
      e.preventDefault(); // Stop scrolling
      const deltaX = e.clientX - interactionStart.x;
      const deltaY = e.clientY - interactionStart.y;

      setCurrentBoard(prev => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map(item => 
            item.id === draggedItemId 
              ? { ...item, x: itemInitialState.x + deltaX, y: itemInitialState.y + deltaY } 
              : item
          )
        };
      });
    } else if (resizingItemId) {
      e.preventDefault();
      const deltaX = e.clientX - interactionStart.x;
      const deltaY = e.clientY - interactionStart.y;

      setCurrentBoard(prev => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map(item => 
            item.id === resizingItemId 
              ? { 
                  ...item, 
                  width: Math.max(50, (itemInitialState.width || 0) + deltaX),
                  height: itemInitialState.height ? Math.max(50, itemInitialState.height + deltaY) : undefined 
                } 
              : item
          )
        };
      });
    }
  }, [draggedItemId, resizingItemId, interactionStart, itemInitialState, currentBoard]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if ((draggedItemId || resizingItemId) && currentBoard) {
      saveAndBroadcastBoard(currentBoard);
      setDraggedItemId(null);
      setResizingItemId(null);
      setItemInitialState(null);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, [draggedItemId, resizingItemId, currentBoard]);

  // --- Components ---

  const LanguageSelector = ({ className }: { className?: string }) => (
    <div className={className ?? "absolute top-2 right-2 sm:top-4 sm:right-4 z-[60]"}>
      <div className="relative">
        <button 
          onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
          className="bg-white/90 backdrop-blur px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg shadow-sm border border-slate-200 flex items-center gap-1 sm:gap-2 hover:bg-slate-50 transition-colors"
        >
          <span className="text-lg sm:text-xl">{LANGUAGES.find(l => l.code === language)?.flag}</span>
          <span className="font-medium text-slate-700 hidden md:inline">{LANGUAGES.find(l => l.code === language)?.label}</span>
          <ChevronDown size={14} className="text-slate-400" />
        </button>
        
        {isLangMenuOpen && (
          <div className="absolute right-0 mt-2 w-40 sm:w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200 z-[70]">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-4 py-2 hover:bg-indigo-50 flex items-center gap-3 transition-colors ${language === lang.code ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-900 bg-white hover:bg-slate-50'}`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="font-medium">{lang.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const HelpModal = () => (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-indigo-700 flex items-center gap-2">
            <HelpCircle size={24} /> {t.helpTitle}
          </h2>
          <button onClick={() => setIsHelpOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-50 p-4 rounded-xl">
            <h3 className="font-semibold text-indigo-900 mb-2">{t.whyTitle}</h3>
            <p className="text-sm text-indigo-700 leading-relaxed">{t.whyText}</p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-3">{t.howTitle}</h3>
            <ol className="list-decimal list-inside space-y-3 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <li>{t.step1}</li>
              <li>{t.step2}</li>
              <li>{t.step3}</li>
              <li className="font-medium text-slate-900">{t.step4}</li>
            </ol>
            
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
            >
              {t.getKeyBtn} <ExternalLink size={16} />
            </a>
          </div>

          <div className="flex items-start gap-3 text-xs text-slate-400 border-t border-slate-100 pt-4">
             <ShieldCheck size={16} className="text-green-500 shrink-0 mt-0.5" />
             <p>{t.securityNote}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const SettingsModal = () => (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Added max-h and overflow-y-auto for mobile landscape/small screens */}
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-slate-500" /> {t.settings}
          </h2>
          <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
              {t.apiKeyLabel}
              <button 
                type="button" 
                onClick={() => setIsHelpOpen(true)}
                className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1 font-normal bg-indigo-50 px-2 py-1 rounded-full"
              >
                <HelpCircle size={12} /> {t.apiKeyHelp}
              </button>
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="password" 
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={t.apiKeyPlaceholder}
                // Text-base prevents iOS zoom
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
              />
            </div>
            
          </div>
          
          <button 
            onClick={saveApiKey}
            className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-semibold hover:bg-slate-800 transition-colors"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );

  // --- Render Views ---

  return (
    // Removed min-h-[100dvh] from main wrapper and handled overflow per view
    <div className="bg-slate-50 relative" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {isSettingsOpen && <SettingsModal />}
      {isHelpOpen && <HelpModal />}
      {isAboutOpen && <AboutModal onClose={() => setIsAboutOpen(false)} t={t} />}

      {!user ? (
        <div className="min-h-[100dvh] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col justify-center items-center p-4 relative overflow-y-auto">
          <LanguageSelector />
          
          <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-2xl max-w-md w-full text-center relative z-10 my-4 sm:my-auto">
             {/* Logo/Avatar Area - Reverted to User Icon with Info button above */}
            <div className="relative mb-8 mt-10 group flex justify-center">
                {/* Info Button - Absolute Positioned */}
                <button
                  onClick={() => setIsAboutOpen(true)}
                  className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 hover:shadow-md transition-all text-slate-600 hover:text-indigo-600 whitespace-nowrap"
                  title={t.aboutBtn}
                >
                  <Info size={18} />
                  <span className="font-medium text-sm">{t.aboutBtn}</span>
                </button>

               {/* Default User Icon */}
               <div className="bg-slate-900 p-5 rounded-full shadow-2xl shadow-indigo-200 ring-4 ring-white">
                 <Users className="text-white" size={32} />
               </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Canvapp</h1>
            <p className="text-slate-500 mb-6 sm:mb-8 text-sm sm:text-base">{t.loginSubtitle}</p>
            
            <form onSubmit={handleLogin} className="space-y-4 text-left">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">{t.usernameLabel}</label>
                <input 
                  type="text" 
                  placeholder={t.usernamePlaceholder}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base sm:text-lg"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 mb-1 block flex justify-between items-center">
                  <span>{t.apiKeyLabel}</span>
                  <button 
                    type="button" 
                    onClick={() => setIsHelpOpen(true)}
                    className="text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <HelpCircle size={14} />
                  </button>
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" 
                    placeholder={t.apiKeyPlaceholder}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base bg-slate-50"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold text-lg hover:bg-slate-800 transition-transform active:scale-95 mt-2"
              >
                {t.joinButton}
              </button>
            </form>
          </div>
        </div>
      ) : !currentBoard ? (
        <div className="min-h-[100dvh] bg-slate-50 p-4 sm:p-6 relative overflow-y-auto">
          
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-10 max-w-5xl mx-auto gap-4">
            <div className="flex items-center gap-3">
               <div className="bg-indigo-600 p-2 rounded-lg">
                <Layout className="text-white" size={20} />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">{t.dashboardTitle}</h1>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <LanguageSelector className="relative z-[60]" />
              
              <span className="text-slate-600 font-medium bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm flex items-center gap-2 text-sm sm:text-base truncate max-w-[150px]">
                👤 {user.name}
              </span>
              
              <button 
                onClick={() => setIsAboutOpen(true)} 
                className="text-slate-500 hover:text-indigo-600 transition-colors p-2 hover:bg-indigo-50 rounded-full" 
                title={t.aboutBtn}
              >
                <Info size={20} />
              </button>

              <button 
                onClick={() => setIsSettingsOpen(true)} 
                className="text-slate-500 hover:text-indigo-600 transition-colors p-2 hover:bg-indigo-50 rounded-full" 
                title={t.settings}
              >
                <Settings size={20} />
              </button>

              <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full" title={t.logout}>
                <LogOut size={20} />
              </button>
            </div>
          </header>

          <main className="max-w-5xl mx-auto pb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Create New Card */}
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-8 flex flex-col items-center justify-center text-center hover:border-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer group h-64 shadow-sm hover:shadow-md relative overflow-hidden">
                {isJoinMode ? (
                  <div className="w-full animate-in fade-in zoom-in duration-200 z-10">
                    <h3 className="font-semibold text-slate-800 mb-4">{t.topicPrompt}</h3>
                    <input
                      autoFocus
                      type="text"
                      className="w-full p-2 border rounded mb-3 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base"
                      placeholder={t.topicPlaceholder}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateBoard((e.target as HTMLInputElement).value);
                      }}
                    />
                    
                    {/* Background Uploader & Controls */}
                    <div className="flex flex-col gap-2 justify-center mb-4">
                       <input 
                          type="file" 
                          ref={bgInputRef}
                          onChange={handleBgUpload}
                          accept="image/*"
                          className="hidden"
                        />
                       <div className="flex justify-center">
                         <button 
                          onClick={() => bgInputRef.current?.click()}
                          className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 transition-colors"
                         >
                           {newBoardBg ? <span className="text-green-600 font-semibold">✓ Image Set</span> : <><ImageIcon size={14} /> Set Background</>}
                         </button>
                       </div>
                       
                       {newBoardBg && (
                         <div className="flex justify-center gap-1 mt-1">
                           <button onClick={() => setNewBoardBgSize('cover')} className={`p-1.5 rounded-md ${newBoardBgSize === 'cover' ? 'bg-indigo-100 text-indigo-600 ring-1 ring-indigo-400' : 'bg-slate-50 text-slate-400'}`} title="Cover">
                             <Maximize size={12} />
                           </button>
                           <button onClick={() => setNewBoardBgSize('contain')} className={`p-1.5 rounded-md ${newBoardBgSize === 'contain' ? 'bg-indigo-100 text-indigo-600 ring-1 ring-indigo-400' : 'bg-slate-50 text-slate-400'}`} title="Contain">
                             <Minimize size={12} />
                           </button>
                           <button onClick={() => setNewBoardBgSize('auto')} className={`p-1.5 rounded-md ${newBoardBgSize === 'auto' ? 'bg-indigo-100 text-indigo-600 ring-1 ring-indigo-400' : 'bg-slate-50 text-slate-400'}`} title="Original">
                             <Move size={12} />
                           </button>
                         </div>
                       )}
                    </div>

                    <p className="text-xs text-slate-400">{t.createHint}</p>
                    
                    {/* Close Button */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsJoinMode(false); setNewBoardBg(null); setNewBoardBgSize('cover'); }}
                      className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div onClick={() => setIsJoinMode(true)} className="w-full h-full flex flex-col items-center justify-center z-10">
                    <div className="bg-indigo-100 text-indigo-600 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                      <Plus size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700">{t.newCanvasTitle}</h3>
                    <p className="text-slate-500 mt-2">{t.newCanvasSubtitle}</p>
                  </div>
                )}
                
                {/* Preview of selected background in Create Card */}
                {newBoardBg && isJoinMode && (
                   <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{
                     backgroundImage: `url(${newBoardBg})`,
                     backgroundSize: newBoardBgSize,
                     backgroundPosition: 'center',
                     backgroundRepeat: 'no-repeat'
                   }}>
                   </div>
                )}
              </div>

              {/* Existing Boards */}
              {boards.map(board => (
                <div 
                  key={board.id} 
                  onClick={() => {
                    setCurrentBoard(board);
                    window.location.hash = board.id;
                  }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer h-64 relative overflow-hidden group"
                >
                  {/* Board Background Preview */}
                   <div className="absolute inset-0 z-0 opacity-20 pointer-events-none transition-opacity group-hover:opacity-30">
                     {board.backgroundImage ? (
                        <div className="w-full h-full" style={{
                          backgroundImage: `url(${board.backgroundImage})`,
                          backgroundSize: board.backgroundSize || 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat'
                        }} />
                     ) : (
                        <div className="w-full h-full bg-gradient-to-br from-transparent to-indigo-50/50"></div>
                     )}
                   </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-slate-800 mb-1 truncate">{board.topic}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Users size={12} /> {t.host}: {board.host}
                    </p>
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
      ) : (
        /* Board View - Needs fixed height and no scroll */
        <div 
          className="fixed inset-0 w-screen h-[100dvh] overflow-hidden bg-slate-50 relative touch-none"
          style={{
             backgroundImage: currentBoard.backgroundImage ? `url(${currentBoard.backgroundImage})` : 'none',
             backgroundSize: currentBoard.backgroundSize || 'cover',
             backgroundPosition: 'center',
             backgroundRepeat: 'no-repeat'
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          ref={canvasRef}
        >
          {/* Background Pattern (Only if no custom image) */}
          {!currentBoard.backgroundImage && (
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ 
              backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', 
              backgroundSize: '24px 24px' 
            }}></div>
          )}

          {/* Header */}
          <div className="absolute top-0 left-0 w-full p-2 sm:p-4 flex flex-wrap justify-between items-center z-50 pointer-events-none gap-2">
            <div className="pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-2 sm:gap-3 max-w-[70%]">
              <button onClick={() => { setCurrentBoard(null); window.location.hash = ''; }} className="text-slate-500 hover:text-slate-800 font-medium transition-colors text-sm sm:text-base whitespace-nowrap">
                {language === 'ar' ? '→' : '←'} <span className="hidden sm:inline">{t.backToDashboard}</span>
              </button>
              <div className="w-px h-3 sm:h-4 bg-slate-300"></div>
              <span className="font-bold text-slate-800 flex items-center gap-2 truncate text-sm sm:text-base">
                {currentBoard.topic}
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200 font-normal hidden sm:inline-block">{t.liveSync}</span>
              </span>
            </div>
            
            <div className="pointer-events-auto flex gap-2">
               <button 
                onClick={handleShare}
                className="bg-indigo-600 text-white px-3 py-1.5 sm:px-5 sm:py-2 rounded-full shadow-lg shadow-indigo-200 font-medium hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 text-sm sm:text-base"
              >
                <LinkIcon size={14} className="sm:w-4 sm:h-4" /> <span className="hidden sm:inline">{t.shareLink}</span>
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="w-full h-full relative z-10 overflow-hidden">
            {currentBoard.items.length === 0 && (
              <div className={`absolute inset-0 flex items-center justify-center pointer-events-none animate-pulse px-4 ${currentBoard.backgroundImage ? 'text-white drop-shadow-md' : 'text-slate-300'}`}>
                <div className="text-center">
                  <h2 className="text-2xl sm:text-4xl font-bold mb-2 opacity-50">{t.emptyBoardTitle}</h2>
                  <p className="text-sm sm:text-base">{t.emptyBoardSubtitle}</p>
                </div>
              </div>
            )}

            {currentBoard.items.map(item => (
              <DraggableItem 
                key={item.id} 
                item={item}
                currentUser={user}
                hostName={currentBoard.host}
                onPointerDown={handlePointerDown}
                onResizeStart={handleResizeStart}
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
            t={t}
          />
        </div>
      )}
    </div>
  );
};

export default App;