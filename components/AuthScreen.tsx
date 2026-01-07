
import React, { useState } from 'react';
import { User, Mail, Lock, Loader2, Info } from 'lucide-react';
import { translations } from '../translations';
import { loginWithGoogle, registerWithEmail, loginWithEmail } from '../services/firebaseService';

interface AuthScreenProps {
  language: string;
  onLoginSuccess: () => void;
  onOpenAbout: () => void;
  LanguageSelector: React.FC;
  setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ language, onLoginSuccess, onOpenAbout, LanguageSelector, setToast }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authName, setAuthName] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  
  // @ts-ignore
  const t = translations[language];

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      onLoginSuccess();
    } catch (error: any) {
      console.error("Google Login Error:", error);
      let msg = error.message;
      
      // User-friendly error mapping
      if (JSON.stringify(error).includes("auth/configuration-not-found") || msg.includes("configuration-not-found")) {
        msg = language === 'tr' 
          ? "Firebase Console'da bu giriş yöntemi aktif edilmemiş." 
          : "Sign-In method is not enabled in Firebase Console.";
      } else if (msg.includes("auth/popup-closed-by-user")) {
        msg = language === 'tr' ? "Giriş iptal edildi." : "Login cancelled.";
      } else if (msg.includes("auth/popup-blocked")) {
        msg = language === 'tr' ? "Tarayıcı penceresi engellendi. Lütfen izin verin." : "Popup blocked by browser.";
      } else if (msg.includes("auth/account-exists-with-different-credential")) {
        msg = language === 'tr' ? "Bu e-posta ile başka bir yöntemle zaten kayıt olunmuş." : "Account exists with different credentials.";
      } else if (msg.includes("auth/unauthorized-domain")) {
        msg = language === 'tr' 
          ? "Bu alan adı (Domain) Firebase'de yetkilendirilmemiş. Lütfen Firebase Console > Auth > Settings > Authorized Domains kısmına ekleyin." 
          : "Domain not authorized. Please add this domain to Firebase Console > Auth > Settings > Authorized Domains.";
      } else if (msg.includes("auth/operation-not-allowed")) {
        msg = t.auth_operationNotAllowed;
      }
      
      setToast({ message: msg, type: 'error' });
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPass) return;
    if (isRegistering && !authName) return;

    setIsAuthSubmitting(true);
    try {
      if (isRegistering) {
        await registerWithEmail(authEmail, authPass, authName);
      } else {
        await loginWithEmail(authEmail, authPass);
      }
      onLoginSuccess();
    } catch (error: any) {
      console.error("Auth Error:", error);
      let msg = error.message;
      if (msg.includes("auth/invalid-credential") || msg.includes("auth/wrong-password") || msg.includes("auth/user-not-found")) {
         msg = language === 'tr' ? "E-posta veya şifre hatalı." : "Invalid email or password.";
      }
      if (msg.includes("auth/email-already-in-use")) {
         msg = language === 'tr' ? "Bu e-posta zaten kullanımda." : "Email already in use.";
      }
      if (msg.includes("auth/weak-password")) {
         msg = language === 'tr' ? "Şifre çok zayıf (en az 6 karakter)." : "Password should be at least 6 characters.";
      }
      if (msg.includes("auth/operation-not-allowed")) {
        msg = t.auth_operationNotAllowed;
      }
      setToast({ message: msg, type: 'error' });
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex flex-col justify-center items-center p-4 relative overflow-y-auto">
      <LanguageSelector />
      <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-2xl max-w-md w-full text-center relative z-10 my-4 sm:my-auto">
        <div className="relative mb-6 mt-10 group flex justify-center">
            <button onClick={onOpenAbout} className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 hover:shadow-md transition-all text-slate-600 hover:text-indigo-600 whitespace-nowrap" title={t.aboutBtn}>
              <Info size={18} />
              <span className="font-medium text-sm">{t.aboutBtn}</span>
            </button>
           
           {/* Custom Large Logo */}
           <div className="w-24 h-24 relative shadow-2xl rounded-2xl">
              <div className="absolute inset-0 bg-indigo-500 rounded-2xl transform rotate-6 opacity-80"></div>
              <div className="absolute inset-0 bg-purple-500 rounded-2xl transform -rotate-3 opacity-90"></div>
              <div className="absolute inset-0 bg-white border-2 border-slate-900 rounded-2xl flex items-center justify-center transform rotate-0">
                  <div className="w-8 h-8 bg-yellow-400 rounded-md"></div>
              </div>
           </div>

        </div>
        
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">JamWall</h1>
        <p className="text-slate-500 mb-8 text-sm sm:text-base">{t.loginSubtitle}</p>

        <h2 className="text-lg font-bold text-slate-800 mb-6">
          {isRegistering ? t.auth_registerTitle : t.auth_loginTitle}
        </h2>

        {/* Login Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
          {isRegistering && (
            <div className="relative">
              <User className="absolute left-3 top-3.5 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder={t.auth_name} 
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                value={authName} 
                onChange={(e) => setAuthName(e.target.value)} 
                required 
              />
            </div>
          )}
          
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
            <input 
              type="email" 
              placeholder={t.auth_email} 
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              value={authEmail} 
              onChange={(e) => setAuthEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
            <input 
              type="password" 
              placeholder={t.auth_password} 
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              value={authPass} 
              onChange={(e) => setAuthPass(e.target.value)} 
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={isAuthSubmitting}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold text-lg hover:bg-slate-800 transition-transform active:scale-95 mt-2 flex items-center justify-center"
          >
            {isAuthSubmitting ? <Loader2 className="animate-spin" /> : (isRegistering ? t.auth_registerBtn : t.auth_loginBtn)}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold tracking-wider">{t.auth_or}</span></div>
        </div>

        <div className="space-y-3">
          <button 
            onClick={handleGoogleLogin} 
            className="w-full border border-slate-200 bg-white text-slate-700 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-3 relative group"
          >
            <svg className="w-5 h-5 absolute left-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 4.66c1.61 0 3.1.56 4.28 1.68l3.21-3.21C17.45 1.45 14.97 0 12 0 7.7 0 3.99 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="flex-1 text-center">{t.auth_google}</span>
          </button>
        </div>

        <div className="mt-6 text-sm">
          <span className="text-slate-500">{isRegistering ? t.auth_haveAccount : t.auth_noAccount} </span>
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setToast(null); }}
            className="font-bold text-indigo-600 hover:text-indigo-800"
          >
            {isRegistering ? t.auth_switchLogin : t.auth_switchRegister}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
