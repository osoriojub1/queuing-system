'use client';

import { login, resetPassword } from './actions';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lock, Mail, Users, AlertCircle, CheckCircle2, Loader2, KeyRound } from 'lucide-react';

function LoginContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    const [isLoading, setIsLoading] = useState(false);
    const [showReset, setShowReset] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        setIsLoading(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-slate-100">
            <div className="max-w-md w-full">
                {/* Brand / Logo Area */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-[28px] shadow-2xl shadow-blue-500/30 mb-6 group transition-transform hover:scale-105">
                        <Users size={40} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 uppercase">Hospital Portal</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] opacity-60">Authorized Staff Access Only</p>
                </div>

                {/* Login Card */}
                <div className="bg-white rounded-[45px] p-10 shadow-2xl shadow-slate-200 border border-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>

                    {error && (
                        <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
                            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                            <p className="text-red-700 text-sm font-bold leading-tight">{error}</p>
                        </div>
                    )}

                    {message && (
                        <div className="mb-8 p-4 bg-green-50 border-l-4 border-green-500 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
                            <CheckCircle2 className="text-green-500 shrink-0 mt-0.5" size={18} />
                            <p className="text-green-700 text-sm font-bold leading-tight">{message}</p>
                        </div>
                    )}

                    {!showReset ? (
                        <form action={login} onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-4">Staff Email</label>
                                <div className="relative group">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                    <input
                                        required
                                        name="email"
                                        type="email"
                                        placeholder="name@hospital.com"
                                        className="w-full bg-slate-50 border-0 rounded-3xl py-5 pl-14 pr-6 text-slate-900 font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-4">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Password</label>
                                    <button
                                        type="button"
                                        onClick={() => setShowReset(true)}
                                        className="text-[10px] font-black uppercase tracking-[0.1em] text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                        Forgot?
                                    </button>
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                    <input
                                        required
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border-0 rounded-3xl py-5 pl-14 pr-6 text-slate-900 font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                disabled={isLoading}
                                className="w-full bg-slate-950 text-white rounded-[30px] py-6 font-black uppercase tracking-widest text-sm hover:bg-blue-600 transition-all shadow-xl hover:shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Log In to System'}
                            </button>
                        </form>
                    ) : (
                        <form action={resetPassword} onSubmit={handleSubmit} className="space-y-6">
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-black text-slate-900 mb-2">Reset Password</h2>
                                <p className="text-slate-500 text-sm font-medium">Click below to send a secure recovery link to the <b>authorized admin email</b>.</p>
                            </div>

                            {/* Hidden field for form submission if needed, but we'll use server-side hardcoded email */}
                            <input type="hidden" name="email" value="admin_trigger" />

                            <button
                                disabled={isLoading}
                                className="w-full bg-blue-600 text-white rounded-[30px] py-6 font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-xl hover:shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Send Link to Admin'}
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowReset(false)}
                                className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                            >
                                Back to Login
                            </button>
                        </form>
                    )}
                </div>

                <div className="mt-12 text-center">
                    <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900/5 rounded-full border border-slate-900/5">
                        <KeyRound size={14} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End-to-End Encryption Enabled</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
