import React, { useState, useRef } from 'react';
import { Type, Image as ImageIcon, Smile, Sparkles, Send, X, Loader2, Ban } from 'lucide-react';
import { generateAISticker } from '../services/geminiService';
import EmojiPicker, { EmojiClickData, Theme, EmojiStyle } from 'emoji-picker-react';

interface ToolbarProps {
  onAddText: (text: string, color: string, textColor: string) => void;
  onAddImage: (base64: string) => void;
  onAddEmoji: (emoji: string) => void;
  onAddSticker: (stickerBase64: string) => void;
  t: any;
}

// Pastel Background Colors (Paper like) + Transparent
const BG_COLORS = [
  '#fef3c7', // Cream
  '#dcfce7', // Mint
  '#dbeafe', // Light Blue
  '#fce7f3', // Pink
  '#f3f4f6', // Light Grey
  '#ffedd5', // Peach
  '#e0e7ff', // Lavender
  '#ffffff', // White
  'transparent', // No Background
];

// Pastel/Matte Text Colors (Darker for contrast)
const TEXT_COLORS = [
  '#000000', // Black
  '#ffffff', // White
  '#4338ca', // Indigo
  '#059669', // Emerald
  '#e11d48', // Rose
  '#d97706', // Amber
  '#7c3aed', // Violet
];

const Toolbar: React.FC<ToolbarProps> = ({ onAddText, onAddImage, onAddEmoji, onAddSticker, t }) => {
  const activeToolRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  
  // Color State
  const [selectedBgColor, setSelectedBgColor] = useState(BG_COLORS[0]);
  const [selectedTextColor, setSelectedTextColor] = useState(TEXT_COLORS[0]);
  
  const [stickerPrompt, setStickerPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      alert("Failed to generate sticker. Please check your API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onAddEmoji(emojiData.emoji);
    setActiveTool(null);
  };

  return (
    <div className="fixed bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-4 z-50 w-full max-w-[90vw] sm:max-w-fit">
      
      {/* Active Tool Panel */}
      {activeTool && (
        <div 
          ref={activeToolRef}
          className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-slate-200 w-full sm:w-80 animate-in slide-in-from-bottom-5 duration-300 max-h-[60vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-3 sticky top-0 bg-white/0 z-10">
            <h3 className="font-semibold text-slate-700 capitalize">
              {activeTool === 'note' && t.toolNote}
              {activeTool === 'emoji' && t.toolEmoji}
              {activeTool === 'sticker' && t.toolSticker}
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
                {/* Background Color Picker */}
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

                {/* Text Color Picker */}
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
        </div>
      )}

      {/* Main Dock */}
      <div className="bg-slate-900/90 backdrop-blur-md p-2 rounded-full shadow-xl flex items-center gap-2 border border-slate-700 max-w-full overflow-x-auto">
        <button
          onClick={() => setActiveTool(activeTool === 'note' ? null : 'note')}
          className={`p-3 rounded-full transition-all text-white hover:bg-white/20 ${activeTool === 'note' ? 'bg-white/20' : ''}`}
          title={t.toolNote}
        >
          <Type size={20} />
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
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
          onClick={() => setActiveTool(activeTool === 'emoji' ? null : 'emoji')}
          className={`p-3 rounded-full transition-all text-white hover:bg-white/20 ${activeTool === 'emoji' ? 'bg-white/20' : ''}`}
          title={t.toolEmoji}
        >
          <Smile size={20} />
        </button>
        <button
          onClick={() => setActiveTool(activeTool === 'sticker' ? null : 'sticker')}
          className={`p-3 rounded-full transition-all text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 ${activeTool === 'sticker' ? 'bg-purple-500/20 text-purple-200' : ''}`}
          title={t.toolSticker}
        >
          <Sparkles size={20} />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;