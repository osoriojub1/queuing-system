'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Lock, Users, AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

export default function ResetPasswordPage() {
    const supabase = createClient();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
            setError(error.message);
        } else {
            setSuccess(true);
            setTimeout(() => {
                router.push('/operator-a');
            }, 2000);
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-slate-100">
            <div className="max-w-md w-full">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-4 bg-blue-600 rounded-[28px] shadow-2xl mb-6">
                        <ShieldCheck size={40} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 uppercase">Secure Access</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.1em] text-[10px] opacity-60">Update Your Staff Credentials</p>
                </div>

                <div className="bg-white rounded-[45px] p-10 shadow-2xl border border-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>

                    {error && (
                        <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-2xl flex items-start gap-3">
                            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                            <p className="text-red-700 text-sm font-bold leading-tight">{error}</p>
                        </div>
                    )}

                    {success ? (
                        <div className="text-center py-6">
                            <div className="mb-6 flex justify-center">
                                <div className="bg-green-100 text-green-600 p-5 rounded-full animate-bounce">
                                    <CheckCircle2 size={48} />
                                </div>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-2">Password Updated!</h2>
                            <p className="text-slate-500 font-medium">Redirecting you to the dashboard...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-4">New Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                    <input
                                        required
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border-0 rounded-3xl py-5 pl-14 pr-6 text-slate-900 font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-4">Confirm New Password</label>
                                <div className="relative group">
                                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                    <input
                                        required
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full bg-slate-50 border-0 rounded-3xl py-5 pl-14 pr-6 text-slate-900 font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                disabled={isLoading}
                                className="w-full bg-slate-950 text-white rounded-[30px] py-6 font-black uppercase tracking-widest text-sm hover:bg-blue-600 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : 'Update Password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
