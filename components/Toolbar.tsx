
import React, { useState, useEffect } from 'react';
import { Type, Image as ImageIcon, Smile, Sparkles, Send, X, Loader2, Ban, Pencil, Paintbrush, Maximize, Settings, Check, LayoutGrid, Palette } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { generateAISticker } from '../services/geminiService';
import { compressImage } from '../utils/helpers';
import { Board, ItemType, User } from '../types';

interface ToolbarProps {
  onAddText: (text: string, color?: string, textColor?: string) => void;
  onAddImage: (base64: string) => void;
  onAddEmoji: (emoji: string) => void;
  onAddSticker: (sticker: string) => void;
  onOpenDrawingPad: () => void;
  isGroupMode: boolean;
  onToggleGroupMode: () => void;
  board: Board;
  user: User;
  onUpdateBoard: (board: Board, saveToCloud?: boolean) => void;
  t: any;
  setToast: (toast: any) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  onAddText, onAddImage, onAddEmoji, onAddSticker, onOpenDrawingPad, 
  isGroupMode, onToggleGroupMode, board, user, onUpdateBoard, t, setToast 
}) => {
  const [activeTool, setActiveTool] = useState<'text' | 'image' | 'emoji' | 'sticker' | 'settings' | null>(null);
  const [inputText, setInputText] = useState('');
  const [stickerPrompt, setStickerPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Settings State
  const [bgColor, setBgColor] = useState(board.backgroundColor || '#f8fafc');
  const [bgImage, setBgImage] = useState(board.backgroundImage || '');
  const [maxItems, setMaxItems] = useState(board.maxItemsPerUser || 0);

  // Sync settings state when board prop changes
  useEffect(() => {
    setBgColor(board.backgroundColor || '#f8fafc');
    setBgImage(board.backgroundImage || '');
    setMaxItems(board.maxItemsPerUser || 0);
  }, [board.backgroundColor, board.backgroundImage, board.maxItemsPerUser]);

  const [selectedColor, setSelectedColor] = useState('#fef3c7'); // Default sticky note color
  const [selectedTextColor, setSelectedTextColor] = useState('#1e293b');
  
  const NOTE_COLORS = ['#fef3c7', '#dbeafe', '#fce7f3', '#dcfce7', '#f3f4f6', 'transparent'];
  const TEXT_COLORS = ['#1e293b', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#ffffff'];

  const handlePostText = () => {
    if (inputText.trim()) {
      onAddText(inputText, selectedColor, selectedTextColor);
      setInputText('');
      setActiveTool(null);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const compressed = await compressImage(event.target.result as string);
          onAddImage(compressed);
          setActiveTool(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateSticker = async () => {
    if (!stickerPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const stickerBase64 = await generateAISticker(stickerPrompt);
      onAddSticker(stickerBase64);
      setStickerPrompt('');
      setActiveTool(null);
    } catch (error) {
      console.error(error);
      setToast({ message: "Failed to generate sticker. Try again.", type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSettings = () => {
    const updatedBoard = {
        ...board,
        backgroundColor: bgColor,
        backgroundImage: bgImage,
        maxItemsPerUser: maxItems
    };
    onUpdateBoard(updatedBoard, true);
    setActiveTool(null);
    setToast({ message: t.save_indicator, type: 'success' });
  };

  const isHost = user.name === board.host;

  if (!isExpanded) {
    return (
      <button 
        onClick={() => setIsExpanded(true)}
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform z-50"
      >
        <Maximize size={24} />
      </button>
    );
  }

  return (
    <>
      {/* Tool Modal / Popover */}
      {activeTool && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-[90vw] max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-[60] animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-700">
              {activeTool === 'text' && t.toolNote}
              {activeTool === 'image' && t.toolImage}
              {activeTool === 'emoji' && t.toolEmoji}
              {activeTool === 'sticker' && t.toolSticker}
              {activeTool === 'settings' && t.toolSettings}
            </h3>
            <button onClick={() => setActiveTool(null)} className="p-1 hover:bg-slate-100 rounded-full"><X size={18} /></button>
          </div>

          {activeTool === 'text' && (
            <div className="space-y-3">
              <textarea 
                autoFocus
                className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-none"
                placeholder={t.writePlaceholder}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{ backgroundColor: selectedColor === 'transparent' ? '#fff' : selectedColor, color: selectedTextColor }}
              />
              
              <div className="flex justify-between items-center">
                 <div className="flex gap-1">
                    {NOTE_COLORS.map(c => (
                        <button 
                            key={c} 
                            onClick={() => setSelectedColor(c)}
                            className={`w-6 h-6 rounded-full border border-slate-200 shadow-sm ${selectedColor === c ? 'ring-2 ring-indigo-500' : ''}`}
                            style={{ backgroundColor: c === 'transparent' ? '#fff' : c, backgroundImage: c === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%)' : 'none', backgroundSize: '8px 8px' }}
                        />
                    ))}
                 </div>
                 <div className="w-px h-6 bg-slate-200"></div>
                 <div className="flex gap-1">
                    {TEXT_COLORS.map(c => (
                        <button 
                            key={c} 
                            onClick={() => setSelectedTextColor(c)}
                            className={`w-6 h-6 rounded-full border border-slate-200 shadow-sm ${selectedTextColor === c ? 'ring-2 ring-indigo-500' : ''}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                 </div>
              </div>

              <button 
                onClick={handlePostText}
                disabled={!inputText.trim()}
                className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {t.postNote} <Send size={16} />
              </button>
            </div>
          )}

          {activeTool === 'image' && (
            <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl hover:bg-slate-50 transition-colors relative cursor-pointer">
              <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleImageUpload}
              />
              <ImageIcon className="mx-auto text-slate-400 mb-2" size={32} />
              <p className="text-slate-500 text-sm font-medium">{t.toolImage}</p>
            </div>
          )}

          {activeTool === 'emoji' && (
            <div className="h-[300px]">
               <EmojiPicker 
                 onEmojiClick={(data) => { onAddEmoji(data.emoji); setActiveTool(null); }} 
                 width="100%" 
                 height="100%"
                 searchDisabled={false}
                 previewConfig={{ showPreview: false }}
               />
            </div>
          )}

          {activeTool === 'sticker' && (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-0.5 rounded-xl">
                <div className="bg-white rounded-[10px] p-3">
                  <div className="flex items-center gap-2 mb-2 text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                     <Sparkles size={12} className="text-purple-500" /> {t.geminiPowered}
                  </div>
                  <input 
                    type="text" 
                    className="w-full p-2 border-b border-slate-100 focus:outline-none focus:border-purple-300 text-sm"
                    placeholder={t.stickerPlaceholder}
                    value={stickerPrompt}
                    onChange={(e) => setStickerPrompt(e.target.value)}
                  />
                </div>
              </div>
              <button 
                onClick={handleGenerateSticker}
                disabled={!stickerPrompt.trim() || isGenerating}
                className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                {isGenerating ? t.generating : t.generate}
              </button>
            </div>
          )}

          {activeTool === 'settings' && (
              <div className="space-y-4">
                  {/* Only Host can edit board settings */}
                  {isHost ? (
                      <>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1"><Palette size={12}/> {t.bgColor}</label>
                            <div className="flex gap-2 flex-wrap">
                                {['#f8fafc', '#fff1f2', '#f0f9ff', '#f0fdf4', '#faf5ff', '#1e293b'].map(c => (
                                    <button 
                                        key={c}
                                        onClick={() => { setBgColor(c); setBgImage(''); }}
                                        className={`w-8 h-8 rounded-full border shadow-sm ${bgColor === c && !bgImage ? 'ring-2 ring-indigo-500 ring-offset-2' : 'border-slate-200'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                             <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1"><Ban size={12}/> {t.itemLimitLabel}</label>
                             <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="50" 
                                    value={maxItems}
                                    onChange={(e) => setMaxItems(parseInt(e.target.value) || 0)}
                                    className="w-20 p-2 border border-slate-200 rounded-lg text-center font-bold"
                                />
                                <span className="text-xs text-slate-400">{maxItems === 0 ? t.unlimited : ''}</span>
                             </div>
                        </div>

                        <button 
                            onClick={handleSaveSettings}
                            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 mt-2"
                        >
                            <Check size={16} /> {t.settingsSave}
                        </button>
                      </>
                  ) : (
                      <div className="text-center text-slate-500 py-4 text-sm">
                          Only the host can change board settings.
                      </div>
                  )}
              </div>
          )}
        </div>
      )}

      {/* Main Toolbar */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl rounded-full px-2 py-2 flex items-center gap-1 sm:gap-2 z-50">
        
        <ToolbarButton icon={<Type size={20} />} label={t.toolNote} onClick={() => setActiveTool(activeTool === 'text' ? null : 'text')} isActive={activeTool === 'text'} />
        <ToolbarButton icon={<ImageIcon size={20} />} label={t.toolImage} onClick={() => setActiveTool(activeTool === 'image' ? null : 'image')} isActive={activeTool === 'image'} />
        <ToolbarButton icon={<Pencil size={20} />} label={t.toolDraw} onClick={onOpenDrawingPad} />
        <ToolbarButton icon={<Smile size={20} />} label={t.toolEmoji} onClick={() => setActiveTool(activeTool === 'emoji' ? null : 'emoji')} isActive={activeTool === 'emoji'} />
        <ToolbarButton icon={<Sparkles size={20} />} label={t.toolSticker} onClick={() => setActiveTool(activeTool === 'sticker' ? null : 'sticker')} isActive={activeTool === 'sticker'} />
        
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        
        <ToolbarButton 
            icon={<LayoutGrid size={20} />} 
            label={t.toolGroup} 
            onClick={onToggleGroupMode} 
            isActive={isGroupMode} 
            className={isGroupMode ? "bg-orange-100 text-orange-600 ring-2 ring-orange-400" : ""}
        />

        <ToolbarButton 
            icon={<Settings size={20} />} 
            label={t.toolSettings} 
            onClick={() => setActiveTool(activeTool === 'settings' ? null : 'settings')}
            isActive={activeTool === 'settings'}
        />

        <div className="w-px h-6 bg-slate-300 mx-1"></div>

        <button 
            onClick={() => setIsExpanded(false)}
            className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
            <X size={20} />
        </button>

      </div>
    </>
  );
};

const ToolbarButton: React.FC<{ icon: React.ReactNode, label: string, onClick: () => void, isActive?: boolean, className?: string }> = ({ icon, label, onClick, isActive, className }) => (
  <button 
    onClick={onClick}
    className={`p-3 rounded-full transition-all duration-200 group relative ${isActive ? 'bg-indigo-100 text-indigo-600 scale-110' : 'text-slate-600 hover:bg-slate-100 hover:scale-105'} ${className}`}
    title={label}
  >
    {icon}
    {/* Tooltip */}
    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-medium">
      {label}
    </span>
  </button>
);

export default Toolbar;
