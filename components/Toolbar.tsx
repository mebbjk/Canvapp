
import React, { useState, useRef } from 'react';
import { Type, Image as ImageIcon, Smile, Sparkles, Send, X, Loader2, Ban, Pencil, Paintbrush, Maximize, Minimize, Layers, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { generateAISticker } from '../services/geminiService';
import EmojiPicker, { EmojiClickData, Theme, EmojiStyle } from 'emoji-picker-react';
import { Board, User } from '../types';
import { compressImage } from '../utils/helpers';

interface ToolbarProps {
  onAddText: (text: string, color: string, textColor: string) => void;
  onAddImage: (base64: string) => void;
  onAddEmoji: (emoji: string) => void;
  onAddSticker: (stickerBase64: string) => void;
  onOpenDrawingPad: () => void;
  isGroupMode: boolean;
  onToggleGroupMode: () => void;
  board: Board;
  user: User;
  onUpdateBoard: (board: Board) => void;
  t: any;
  setToast: (toast: any) => void;
}

// Pastel Background Colors (Paper like) + Dark Muted Colors + Transparent
const BG_COLORS = [
  // Light Pastels
  '#fef3c7', // Cream
  '#dcfce7', // Mint
  '#dbeafe', // Light Blue
  '#fce7f3', // Pink
  '#f3f4f6', // Light Grey
  '#ffedd5', // Peach
  '#e0e7ff', // Lavender
  '#ffffff', // White
  // Dark Pastels / Muted
  '#334155', // Slate Dark
  '#7f1d1d', // Muted Red
  '#14532d', // Muted Green
  '#1e3a8a', // Muted Blue
  '#581c87', // Muted Purple
  '#78350f', // Muted Brown
  // None
  'transparent', // No Background
];

// Board Background Colors
const BOARD_BG_COLORS = [
  '#f8fafc', '#fff1f2', '#f0f9ff', '#f0fdf4', '#fffbeb', '#faf5ff', '#1e293b'
];

// Text Colors
const TEXT_COLORS = [
  '#000000', // Black
  '#ffffff', // White
  '#4338ca', // Indigo
  '#059669', // Emerald
  '#e11d48', // Rose
  '#d97706', // Amber
  '#7c3aed', // Violet
  '#facc15', // Yellow (Good for dark backgrounds)
];

const Toolbar: React.FC<ToolbarProps> = ({ 
  onAddText, 
  onAddImage, 
  onAddEmoji, 
  onAddSticker, 
  onOpenDrawingPad,
  isGroupMode,
  onToggleGroupMode,
  board,
  user,
  onUpdateBoard,
  t,
  setToast
}) => {
  const activeToolRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isDockVisible, setIsDockVisible] = useState(true);
  
  // Color State
  const [selectedBgColor, setSelectedBgColor] = useState(BG_COLORS[0]);
  const [selectedTextColor, setSelectedTextColor] = useState(TEXT_COLORS[0]);
  
  const [stickerPrompt, setStickerPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  const isHost = user.name === board.host;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onAddImage(reader.result as string);
        setActiveTool(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingBg(true);
      setToast({ message: "Processing background...", type: 'success' });
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          // Force compression to ensure it fits in RTDB reasonable limits
          const compressed = await compressImage(base64, 1280, 0.7);
          
          // Explicitly clear first to force update if needed (though not strictly necessary if reference changes)
          // We apply the new background image directly
          onUpdateBoard({
             ...board,
             backgroundImage: compressed,
             backgroundColor: undefined,
             backgroundSize: 'cover'
          });
          setToast({ message: "Background updated!", type: 'success' });
        } catch (error) {
          console.error("BG Upload fail", error);
          setToast({ message: "Failed to upload background.", type: 'error' });
        } finally {
            setIsUploadingBg(false);
            if(bgImageInputRef.current) bgImageInputRef.current.value = "";
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onAddText(inputText, selectedBgColor, selectedTextColor);
      setInputText('');
      setActiveTool(null);
    }
  };

  const handleGenerateSticker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stickerPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const stickerBase64 = await generateAISticker(stickerPrompt);
      onAddSticker(stickerBase64);
      setStickerPrompt('');
      setActiveTool(null);
    } catch (error) {
      alert("Failed to generate sticker. The service might be temporarily unavailable.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onAddEmoji(emojiData.emoji);
    setActiveTool(null);
  };

  const handleToolSelect = (tool: string | null) => {
    setActiveTool(activeTool === tool ? null : tool);
    if(tool !== null && isGroupMode) {
        onToggleGroupMode(); // Turn off group mode if picking a creation tool
    }
  };

  // Prevent drawing when clicking on toolbar
  const stopProp = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
        className="fixed bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-4 z-[200] w-full max-w-[90vw] sm:max-w-fit pointer-events-auto"
        onPointerDown={stopProp}
        onPointerUp={stopProp}
        onClick={stopProp}
    >
      
      {/* Active Tool Panel */}
      {activeTool && isDockVisible && (
        <div 
          ref={activeToolRef}
          className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-200 w-full sm:w-80 animate-in slide-in-from-bottom-5 duration-300 max-h-[60vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-3 sticky top-0 bg-white/0 z-10">
            <h3 className="font-semibold text-slate-700 capitalize">
              {activeTool === 'note' && t.toolNote}
              {activeTool === 'emoji' && t.toolEmoji}
              {activeTool === 'sticker' && t.toolSticker}
              {activeTool === 'settings' && t.toolSettings}
            </h3>
            <button onClick={() => setActiveTool(null)} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1">
              <X size={18} />
            </button>
          </div>

          {activeTool === 'note' && (
            <form onSubmit={handleTextSubmit}>
              <textarea
                autoFocus
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t.writePlaceholder}
                className="w-full p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3 handwritten text-lg resize-none"
                rows={3}
                style={{ 
                  backgroundColor: selectedBgColor === 'transparent' ? 'transparent' : selectedBgColor,
                  color: selectedTextColor
                }}
              />
              
              <div className="space-y-2 mb-4">
                <div>
                  <label className="text-xs text-slate-500 font-medium ml-1 mb-1 block">{t.bgColor}</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {BG_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedBgColor(c)}
                        className={`w-6 h-6 rounded-full border border-slate-300 shadow-sm flex items-center justify-center ${selectedBgColor === c ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}
                        style={{ backgroundColor: c === 'transparent' ? 'transparent' : c }}
                        title={c === 'transparent' ? 'Transparent' : c}
                      >
                         {c === 'transparent' && <Ban size={12} className="text-slate-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 font-medium ml-1 mb-1 block">{t.textColor}</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {TEXT_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedTextColor(c)}
                        className={`w-6 h-6 rounded-full border border-slate-200 shadow-sm ${selectedTextColor === c ? 'ring-2 ring-indigo-500 ring-offset-1 scale-110' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors">
                {t.postNote}
              </button>
            </form>
          )}

          {activeTool === 'emoji' && (
            <div className="w-full flex justify-center">
              <EmojiPicker 
                onEmojiClick={handleEmojiClick}
                width="100%"
                height="350px"
                searchDisabled={false}
                skinTonesDisabled={false}
                previewConfig={{ showPreview: false }}
                theme={Theme.LIGHT}
              />
            </div>
          )}

          {activeTool === 'sticker' && (
            <form onSubmit={handleGenerateSticker}>
               <p className="text-xs text-slate-500 mb-2">{t.geminiPowered}</p>
               <input
                autoFocus
                type="text"
                value={stickerPrompt}
                onChange={(e) => setStickerPrompt(e.target.value)}
                placeholder={t.stickerPlaceholder}
                className="w-full p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3"
              />
               <button 
                type="submit" 
                disabled={isGenerating}
                className="w-full bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                {isGenerating ? t.generating : t.generate}
              </button>
            </form>
          )}

          {activeTool === 'settings' && (
             <div className="space-y-4">
                
                {/* HOST ONLY: Item Limits */}
                {isHost && (
                    <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200">
                        <label className="text-sm font-bold text-yellow-800 mb-2 block flex items-center gap-2">
                           <AlertCircle size={14} /> {t.itemLimitLabel}
                        </label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number"
                                min="0"
                                placeholder="0 = Unlimited"
                                value={board.maxItemsPerUser || ''}
                                onChange={(e) => onUpdateBoard({...board, maxItemsPerUser: parseInt(e.target.value) || 0})}
                                className="w-full p-2 rounded-lg border border-yellow-300 text-center"
                            />
                            <span className="text-xs text-yellow-600 whitespace-nowrap">
                                {(!board.maxItemsPerUser || board.maxItemsPerUser === 0) ? t.unlimited : ''}
                            </span>
                        </div>
                    </div>
                )}

                <div>
                   <label className="text-sm font-semibold text-slate-700 mb-2 block">{t.bgColor}</label>
                   <div className="flex gap-2 flex-wrap">
                      {BOARD_BG_COLORS.map(color => (
                         <button
                            key={color}
                            onClick={() => onUpdateBoard({...board, backgroundColor: color, backgroundImage: undefined})}
                            className={`w-8 h-8 rounded-full border border-slate-300 shadow-sm ${board.backgroundColor === color && !board.backgroundImage ? 'ring-2 ring-indigo-500 ring-offset-1 scale-110' : ''}`}
                            style={{backgroundColor: color}}
                         />
                      ))}
                   </div>
                </div>

                <div>
                   <label className="text-sm font-semibold text-slate-700 mb-2 block">{t.toolImage}</label>
                   <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={bgImageInputRef}
                      onChange={handleBgImageUpload}
                   />
                   <div className="flex gap-2">
                       <button 
                          onClick={() => bgImageInputRef.current?.click()}
                          disabled={isUploadingBg}
                          className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded-lg hover:bg-slate-50 text-sm font-medium flex justify-center items-center gap-2"
                       >
                          {isUploadingBg && <Loader2 size={14} className="animate-spin"/>}
                          {board.backgroundImage ? 'Change Image' : 'Upload Image'}
                       </button>
                       {board.backgroundImage && (
                          <button 
                             onClick={() => onUpdateBoard({...board, backgroundImage: undefined, backgroundColor: BOARD_BG_COLORS[0]})}
                             className="px-3 bg-red-50 text-red-500 border border-red-200 rounded-lg hover:bg-red-100"
                          >
                             <X size={16} />
                          </button>
                       )}
                   </div>
                </div>

                {board.backgroundImage && (
                   <div>
                       <label className="text-sm font-semibold text-slate-700 mb-2 block">Image Fit</label>
                       <div className="flex gap-2">
                          <button 
                             onClick={() => onUpdateBoard({...board, backgroundSize: 'cover'})}
                             className={`flex-1 py-2 rounded-lg text-sm font-medium border flex items-center justify-center gap-2 ${board.backgroundSize === 'cover' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200'}`}
                          >
                             <Maximize size={14} /> Cover
                          </button>
                          <button 
                             onClick={() => onUpdateBoard({...board, backgroundSize: 'contain'})}
                             className={`flex-1 py-2 rounded-lg text-sm font-medium border flex items-center justify-center gap-2 ${board.backgroundSize === 'contain' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200'}`}
                          >
                             <Minimize size={14} /> Contain
                          </button>
                       </div>
                   </div>
                )}
             </div>
          )}
        </div>
      )}

      {/* Main Dock */}
      {isDockVisible ? (
      <div className="bg-slate-900/90 backdrop-blur-md p-2 rounded-full shadow-xl flex items-center gap-2 border border-slate-700 max-w-full overflow-x-auto animate-in slide-in-from-bottom-2">
        <button
          onClick={() => handleToolSelect('note')}
          className={`p-3 rounded-full transition-all text-white hover:bg-white/20 ${activeTool === 'note' ? 'bg-white/20' : ''}`}
          title={t.toolNote}
        >
          <Type size={20} />
        </button>
        <button
          onClick={() => { setActiveTool(null); onOpenDrawingPad(); }}
          className="p-3 rounded-full transition-all text-white hover:bg-white/20"
          title={t.toolDraw}
        >
          <Pencil size={20} />
        </button>
        <button
          onClick={() => { setActiveTool(null); fileInputRef.current?.click(); }}
          className="p-3 rounded-full transition-all text-white hover:bg-white/20"
          title={t.toolImage}
        >
          <ImageIcon size={20} />
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
          accept="image/*" 
          className="hidden" 
        />
        
        <div className="w-px h-6 bg-slate-600 mx-1"></div>

        <button
          onClick={() => handleToolSelect('emoji')}
          className={`p-3 rounded-full transition-all text-white hover:bg-white/20 ${activeTool === 'emoji' ? 'bg-white/20' : ''}`}
          title={t.toolEmoji}
        >
          <Smile size={20} />
        </button>
        <button
          onClick={() => handleToolSelect('sticker')}
          className={`p-3 rounded-full transition-all text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 ${activeTool === 'sticker' ? 'bg-purple-500/20 text-purple-200' : ''}`}
          title={t.toolSticker}
        >
          <Sparkles size={20} />
        </button>

         <div className="w-px h-6 bg-slate-600 mx-1"></div>
         
         {/* Group Mode Button */}
         <button
          onClick={() => { setActiveTool(null); onToggleGroupMode(); }}
          className={`p-3 rounded-full transition-all hover:bg-orange-500/20 hover:text-orange-200 ${isGroupMode ? 'bg-orange-500 text-white ring-2 ring-orange-300' : 'text-orange-300'}`}
          title={t.toolGroup}
        >
          <Layers size={20} />
        </button>

         <button
          onClick={() => handleToolSelect('settings')}
          className={`p-3 rounded-full transition-all text-blue-200 hover:bg-blue-500/20 hover:text-white ${activeTool === 'settings' ? 'bg-blue-500/20 text-white' : ''}`}
          title={t.toolSettings}
        >
          <Paintbrush size={20} />
        </button>

         {/* Hide Toggle */}
         <div className="w-px h-6 bg-slate-600 mx-1"></div>
         <button
            onClick={() => setIsDockVisible(false)}
            className="p-3 rounded-full transition-all text-slate-400 hover:bg-white/10 hover:text-white"
            title={t.toggleToolbar}
         >
            <ChevronDown size={20} />
         </button>
      </div>
      ) : (
          <button 
             onClick={() => setIsDockVisible(true)}
             className="bg-slate-900/80 backdrop-blur-md p-3 rounded-full shadow-lg text-white hover:bg-slate-900 hover:scale-110 transition-all border border-slate-700"
             title={t.toggleToolbar}
          >
              <ChevronUp size={24} />
          </button>
      )}
    </div>
  );
};

export default Toolbar;
