import React, { useState } from 'react';
import { X, Instagram, Mail, Copy, ArrowLeft, Heart } from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
  t: any; // Using the translation object structure
}

const AboutModal: React.FC<AboutModalProps> = ({ onClose, t }) => {
  const [view, setView] = useState<'profile' | 'bank'>('profile');

  const handleCopyIban = () => {
    navigator.clipboard.writeText("TR91 0015 7000 0000 0160 0093 89");
    alert(t.about_copied);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden relative font-sans">
        
        {/* Header Background */}
        <div className="h-24 bg-[#5b4aff] relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-1.5 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Profile Picture */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2">
            <div className="w-24 h-24 rounded-full border-[6px] border-white bg-zinc-100 overflow-hidden shadow-sm">
                <img src="https://github.com/mebbjk.png" alt="Profile" className="w-full h-full object-cover" />
            </div>
        </div>

        {/* Content */}
        <div className="pt-20 pb-8 px-6 text-center">
          
          {view === 'profile' ? (
            <>
              <h2 className="text-xl font-bold text-slate-900">Mehmet Emre Bulun</h2>
              <p className="text-xs font-bold text-[#5b4aff] tracking-wider uppercase mb-4">{t.about_developer}</p>

              <button 
                onClick={() => setView('bank')}
                className="bg-[#ff6b81] text-white px-6 py-2.5 rounded-full font-bold shadow-lg shadow-rose-200 hover:bg-[#ff526a] transition-colors flex items-center justify-center gap-2 mx-auto mb-6 active:scale-95"
              >
                <div className="bg-white/20 p-1 rounded-md">
                   <Heart size={16} fill="white" />
                </div>
                {t.about_support}
              </button>

              <div className="bg-blue-50/80 rounded-2xl p-4 text-sm text-slate-600 mb-6 text-left leading-relaxed whitespace-pre-line">
                <p>
                  {t.about_desc}
                </p>
              </div>

              <div className="space-y-3">
                <a href="https://instagram.com/meb.bjk" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 border border-slate-100 rounded-2xl p-3 hover:bg-slate-50 transition-colors shadow-sm group">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform shrink-0">
                    <Instagram size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.about_instagram}</p>
                    <p className="font-bold text-slate-800">@meb.bjk</p>
                  </div>
                </a>

                <a href="mailto:mehmetemrebulun@outlook.com.tr" className="flex items-center gap-4 border border-slate-100 rounded-2xl p-3 hover:bg-slate-50 transition-colors shadow-sm group">
                  <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white group-hover:scale-110 transition-transform shrink-0">
                    <Mail size={20} />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.about_contact}</p>
                    <p className="font-bold text-slate-800 text-sm break-all">mehmetemrebulun@outlook.com.tr</p>
                  </div>
                </a>
              </div>
            </>
          ) : (
            <div className="animate-in slide-in-from-right duration-200">
               <h2 className="text-xl font-bold text-slate-900">{t.about_bankTitle}</h2>
               <p className="text-xs font-bold text-[#5b4aff] tracking-wider uppercase mb-6">{t.about_bankSubtitle}</p>

               <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-left mb-8 relative group">
                  <button 
                    onClick={handleCopyIban}
                    className="absolute top-4 right-4 text-slate-400 hover:text-[#5b4aff] bg-white p-2 rounded-lg shadow-sm border border-slate-100 transition-colors active:scale-90"
                  >
                    <Copy size={20} />
                  </button>

                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t.about_recipient}</p>
                  <p className="font-bold text-slate-800 text-lg mb-4">Mehmet Emre Bulun</p>
                  
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{t.about_iban}</p>
                  <p className="font-mono text-slate-600 tracking-wider text-sm sm:text-base">TR91 0015 7000 0000 0160 0093 89</p>
               </div>

               <button 
                 onClick={() => setView('profile')}
                 className="text-slate-500 font-bold hover:text-slate-800 flex items-center justify-center gap-2 mx-auto py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors"
               >
                 <ArrowLeft size={16} /> {t.about_back}
               </button>
            </div>
          )}

          <div className="mt-8 text-xs text-slate-400 flex items-center justify-center gap-1">
            {t.about_footer} <Heart size={10} className="text-red-500 fill-red-500" /> v3.0.4
          </div>

        </div>
      </div>
    </div>
  );
};

export default AboutModal;