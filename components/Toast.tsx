import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] flex items-center gap-2 px-6 py-3 rounded-full shadow-xl animate-in slide-in-from-top-5 fade-in duration-300 ${type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-500 text-white'}`}>
      {type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      <span className="font-medium">{message}</span>
    </div>
  );
};

export default Toast;
