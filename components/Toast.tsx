
import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  let bgClass = 'bg-slate-900 text-white';
  let Icon = CheckCircle;

  if (type === 'error') {
    bgClass = 'bg-red-500 text-white';
    Icon = AlertCircle;
  } else if (type === 'warning') {
    bgClass = 'bg-yellow-500 text-white';
    Icon = AlertTriangle;
  }

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] flex items-center gap-2 px-6 py-3 rounded-full shadow-xl animate-in slide-in-from-top-5 fade-in duration-300 ${bgClass}`}>
      <Icon size={18} />
      <span className="font-medium">{message}</span>
    </div>
  );
};

export default Toast;
