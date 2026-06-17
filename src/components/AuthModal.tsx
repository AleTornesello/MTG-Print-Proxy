import React, { useState } from 'react';
import { X, Loader2, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { translations, Locale } from '../lib/i18n';

interface AuthModalProps {
  locale: Locale;
  onClose: () => void;
}

export function AuthModal({ locale, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const t = translations[locale];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError(null);

    const { error: authError } = isLogin 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(isLogin ? t.loginError : t.registerError);
      setLoading(false);
    } else {
      setLoading(false);
      onClose();
    }
  };

  const handleGoogleAuth = async () => {
    if (!supabase) return;
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">{isLogin ? t.signIn : t.register}</h2>
          <button 
             onClick={onClose}
             className="p-2 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
             aria-label={t.close}
           >
             <X className="w-5 h-5 text-slate-500" />
           </button>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.email}</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-base bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.password}</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-base bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all shadow-sm"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 text-white font-bold rounded-xl py-3 px-4 flex items-center justify-center hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? t.login : t.register)}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500 font-medium">Or</span>
              </div>
            </div>

            <button 
              onClick={handleGoogleAuth}
              disabled={loading}
              className="mt-6 w-full bg-white border border-slate-200 text-slate-700 font-bold rounded-xl py-3 px-4 flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-colors focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t.continueWithGoogle}
            </button>
          </div>

          <div className="mt-8 text-center text-sm text-slate-600">
            {isLogin ? t.noAccount : t.hasAccount}{' '}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-slate-900 font-bold hover:underline"
            >
              {isLogin ? t.register : t.signIn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
