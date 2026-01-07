
import React, { useRef, useState, useEffect } from 'react';
import { X, Check, Trash2, Undo, Redo, Pipette } from 'lucide-react';

interface DrawingPadProps {
  onClose: () => void;
  onAdd: (base64: string) => void;
  t: any;
}

const COLORS = [
  '#000000', // Black
  '#ef4444', // Red
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#f59e0b', // Orange
  '#ffffff', // White
];

const DrawingPad: React.FC<DrawingPadProps> = ({ onClose, onAdd, t }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(4);
  const [hasDrawing, setHasDrawing] = useState(false);
  
  // History for Undo/Redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = 500;
    canvas.height = 500;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      
      // Save initial blank state
      const blankState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([blankState]);
      setHistoryStep(0);
    }
  }, []);

  // Update context when color/width changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
      }
    }
  }, [color, lineWidth]);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Slice history if we are in the middle of undo stack
    const newHistory = history.slice(0, historyStep + 1);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
    setHasDrawing(true);
  };

  const handleUndo = () => {
    if (historyStep > 0) {
        const newStep = historyStep - 1;
        setHistoryStep(newStep);
        restoreCanvas(history[newStep]);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
        const newStep = historyStep + 1;
        setHistoryStep(newStep);
        restoreCanvas(history[newStep]);
    }
  };

  const restoreCanvas = (imageData: ImageData) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(imageData, 0, 0);
  };

  const startDrawing = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    setHasDrawing(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.beginPath();
    ctx.moveTo(x, y);
    canvas.setPointerCapture(e.pointerId);
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = (e: React.PointerEvent) => {
    if(isDrawing) {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.releasePointerCapture(e.pointerId);
        }
        saveHistory();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawing(false);
        saveHistory();
      }
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const base64 = canvas.toDataURL('image/png');
      onAdd(base64);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[250] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
      <div className="bg-slate-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative border border-slate-200 flex flex-col">
        
        {/* Header */}
        <div className="bg-white p-4 flex justify-between items-center border-b border-slate-200">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            🎨 {t.toolDraw || "Drawing Pad"}
          </h3>
          <div className="flex gap-1">
             <button 
                onClick={handleUndo} 
                disabled={historyStep <= 0}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
                title={t.undo}
             >
                 <Undo size={18} />
             </button>
             <button 
                onClick={handleRedo} 
                disabled={historyStep >= history.length - 1}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
                title={t.redo}
             >
                 <Redo size={18} />
             </button>
             <div className="w-px h-6 bg-slate-200 mx-1"></div>
             <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-500 p-2 rounded-full transition-colors">
                <X size={20} />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="p-4 flex items-center justify-center bg-slate-50 relative">
             {/* Checkerboard pattern to indicate transparency */}
            <div className="absolute inset-4 rounded-xl opacity-10 pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px' }}>
            </div>
            
            <canvas 
                ref={canvasRef}
                className="bg-transparent border-2 border-dashed border-slate-300 rounded-xl shadow-sm cursor-crosshair touch-none relative z-10 bg-white/50"
                style={{ width: '100%', aspectRatio: '1/1', maxHeight: '400px' }}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={endDrawing}
                onPointerLeave={endDrawing}
            />
        </div>

        {/* Controls */}
        <div className="bg-white p-4 border-t border-slate-200 flex flex-col gap-4">
            
            {/* Colors */}
            <div className="flex justify-between items-center">
                 <div className="flex gap-2 items-center flex-wrap">
                    {COLORS.map(c => (
                        <button 
                            key={c}
                            onClick={() => setColor(c)}
                            className={`w-8 h-8 rounded-full border border-slate-200 shadow-sm transition-transform ${color === c ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2' : 'hover:scale-110'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                    
                    {/* Custom Color Picker */}
                    <div className="relative w-8 h-8 rounded-full border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 hover:scale-110 transition-transform">
                        <input 
                            type="color" 
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            title={t.customColor}
                        />
                        <Pipette size={14} className="text-white drop-shadow-md pointer-events-none" />
                    </div>

                 </div>
                 <button onClick={clearCanvas} className="text-slate-400 hover:text-red-500 p-2" title="Clear">
                     <Trash2 size={20} />
                 </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-2">
                <button 
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                    {t.close || "Cancel"}
                </button>
                <button 
                    onClick={handleSave}
                    disabled={!hasDrawing}
                    className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                >
                    <Check size={20} /> {t.generate || "Add to Board"}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default DrawingPad;
