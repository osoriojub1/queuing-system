'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { createTicket, signOut } from '@/app/actions/queue-actions';
import QRCode from 'react-qr-code';
import { MousePointer2, Baby, Pill, X, CheckCircle2, AlertTriangle, Users, HelpCircle, LogOut } from 'lucide-react';

type CategoryInfo = {
    id: string;
    icon: any;
    color: string;
    label: string;
    description: string;
};

const categories: CategoryInfo[] = [
    { id: 'Animal Bite', icon: MousePointer2, color: 'text-red-600', label: 'Animal Bite', description: 'Emergency & Routine vaccines' },
    { id: 'Prenatal', icon: Baby, color: 'text-pink-600', label: 'Prenatal', description: 'Maternal care & checkups' },
    { id: 'Medicine', icon: Pill, color: 'text-blue-600', label: 'Medicine', description: 'Internal medicine & general' }
];

export default function FrontDeskView() {
    const [loading, setLoading] = useState(false);
    const [latestTicket, setLatestTicket] = useState<{ id: string; ticket_number: string } | null>(null);
    const [pendingCategory, setPendingCategory] = useState<CategoryInfo | null>(null);
    const [limits, setLimits] = useState<Record<string, number>>({});
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [serviceStatus, setServiceStatus] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchInitialData();

        // Subscribe to settings changes
        const settingsChannel = supabase
            .channel('front_desk_settings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_settings' }, () => {
                fetchInitialData();
            })
            .subscribe();

        // Subscribe to queue changes to keep counts accurate
        const queueChannel = supabase
            .channel('front_desk_queue')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, () => {
                fetchInitialData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(settingsChannel);
            supabase.removeChannel(queueChannel);
        };
    }, []);

    const fetchInitialData = async () => {
        // Fetch limits and reset timestamp
        const { data: settingsData } = await supabase.from('queue_settings').select('*');
        const limitMap: Record<string, number> = {};
        const statusMap: Record<string, boolean> = {};
        const resets: Record<string, string> = {};

        settingsData?.forEach(s => {
            limitMap[s.category] = s.max_limit;
            statusMap[s.category] = s.is_open ?? true;
            resets[s.category] = s.last_reset_at;
        });
        setLimits(limitMap);
        setServiceStatus(statusMap);

        // Fetch total registrations since last reset for each category
        const countMap: Record<string, number> = { 'Animal Bite': 0, 'Prenatal': 0, 'Medicine': 0 };

        for (const cat of categories) {
            const resetTime = resets[cat.id] || new Date(0).toISOString();

            const { count } = await supabase
                .from('queue')
                .select('*', { count: 'exact', head: true })
                .eq('category', cat.id)
                .gt('created_at', resetTime);

            countMap[cat.id] = count || 0;
        }

        setCounts(countMap);
    };

    const handleCategoryClick = (cat: CategoryInfo) => {
        if (serviceStatus[cat.id] === false) {
            alert('This service is currently closed. Please check the display for updates.');
            return;
        }
        if (counts[cat.id] >= (limits[cat.id] || 100)) {
            alert('Queue is currently full for this category. Please try again later.');
            return;
        }
        setPendingCategory(cat);
    };

    const registerTicket = async () => {
        if (!pendingCategory) return;
        const category = pendingCategory.id;

        setLoading(true);
        try {
            const result = await createTicket(category);

            if (!result.success || !result.ticket) {
                throw new Error(result.message || 'Failed to create ticket');
            }

            setLatestTicket(result.ticket);
            setPendingCategory(null); // Clear pending state on success

            // If they are in the first 3 waiting spots, we can show a special message
            if (result.position !== undefined && result.position <= 3) {
                console.log('Patient is near the front!');
            }
        } catch (error: any) {
            console.error('Error registering ticket:', error);
            alert(`Failed to create ticket: ${error.message || 'Unknown error'}.`);
        } finally {
            setLoading(false);
        }
    };

    const closePortal = () => setLatestTicket(null);
    const cancelPending = () => setPendingCategory(null);

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12">
            <div className="max-w-6xl mx-auto">
                <header className="mb-16 text-center relative">
                    <div className="absolute top-0 right-0">
                        <button
                            onClick={() => signOut()}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shadow-sm active:scale-95"
                        >
                            <LogOut size={14} />
                            Sign Out
                        </button>
                    </div>
                    <div className="flex justify-center mb-6">
                        <div className="bg-white/10 p-3 rounded-3xl backdrop-blur-md border border-white/10 shadow-xl flex items-center gap-4">
                            <Image
                                src="/logo.png"
                                alt="Logo"
                                width={50}
                                height={50}
                                className="rounded-xl"
                            />
                            <div className="text-left py-1 pr-2">
                                <h1 className="text-xl font-black tracking-tighter uppercase text-blue-600 leading-none">VDH</h1>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Registration Desk</p>
                            </div>
                        </div>
                    </div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Please select a category to get your ticket</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {categories.map((cat) => {
                        const current = counts[cat.id] || 0;
                        const max = limits[cat.id] || 100;
                        const isOpen = serviceStatus[cat.id] !== false;
                        const isFull = current >= max;
                        const isDisabled = !isOpen || isFull;

                        return (
                            <button
                                key={cat.id}
                                disabled={loading || isDisabled}
                                onClick={() => handleCategoryClick(cat)}
                                className={`group relative h-96 rounded-[40px] border-4 transition-all duration-300 flex flex-col items-center justify-center p-8 text-center bg-white shadow-lg overflow-hidden
                                    ${isDisabled
                                        ? 'border-slate-200 grayscale opacity-60 cursor-not-allowed'
                                        : 'border-white hover:border-blue-500 hover:shadow-2xl hover:-translate-y-2 active:scale-95'
                                    }`}
                            >
                                {!isOpen ? (
                                    <div className="absolute top-8 right-8 bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
                                        CLOSED
                                    </div>
                                ) : isFull ? (
                                    <div className="absolute top-8 right-8 bg-red-600 text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest animate-bounce shadow-lg">
                                        FULL
                                    </div>
                                ) : null}

                                <div className={`mb-8 p-6 rounded-3xl transition-colors duration-300 ${isDisabled ? 'bg-slate-100' : 'bg-slate-50 group-hover:bg-blue-50'}`}>
                                    <cat.icon size={80} className={`${cat.color} ${isDisabled ? 'text-slate-400' : ''}`} />
                                </div>

                                <h2 className={`text-3xl font-black uppercase tracking-tighter mb-2 ${isDisabled ? 'text-slate-400' : 'text-slate-900 group-hover:text-blue-600'}`}>
                                    {cat.label}
                                </h2>
                                <p className="text-slate-400 font-medium mb-8 text-sm">{isOpen ? cat.description : 'Service unavailable today'}</p>

                                <div className={`mt-auto w-full py-4 rounded-2xl transition-colors font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3
                                    ${isDisabled
                                        ? 'bg-slate-100 text-slate-400'
                                        : 'bg-slate-900 text-white group-hover:bg-blue-600'}`}>
                                    {!isOpen ? (
                                        <>
                                            <AlertTriangle size={16} />
                                            No Service Today
                                        </>
                                    ) : isFull ? (
                                        <>
                                            <AlertTriangle size={16} />
                                            Limit Reached
                                        </>
                                    ) : (
                                        <>
                                            Register Patient
                                            <span className="opacity-40">|</span>
                                            {current}/{max}
                                        </>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Confirmation Modal */}
                {pendingCategory && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
                        <div className="bg-white rounded-[50px] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center relative border-8 border-slate-50">
                            <div className="mb-8 flex justify-center">
                                <div className="bg-blue-100 text-blue-600 p-5 rounded-[30px]">
                                    <HelpCircle size={48} />
                                </div>
                            </div>

                            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">CONFIRM TICKET</h2>
                            <p className="text-slate-500 font-bold mb-8 uppercase tracking-widest text-xs opacity-60">Register patient for <span className="text-blue-600">{pendingCategory.label}</span>?</p>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={cancelPending}
                                    className="py-5 bg-slate-100 text-slate-600 rounded-[25px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <X size={20} />
                                    Cancel
                                </button>
                                <button
                                    onClick={registerTicket}
                                    disabled={loading}
                                    className="py-5 bg-slate-900 text-white rounded-[25px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl hover:shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={20} />
                                    {loading ? '...' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success Modal */}
                {latestTicket && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-[50px] p-10 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 text-center relative border-8 border-slate-50">
                            <button
                                onClick={closePortal}
                                className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-all"
                            >
                                <X size={24} />
                            </button>

                            <div className="mb-8 flex justify-center">
                                <div className="bg-green-100 text-green-600 p-5 rounded-[30px] shadow-inner">
                                    <CheckCircle2 size={48} />
                                </div>
                            </div>

                            <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">TICKET CREATED</h2>
                            <p className="text-slate-500 font-bold mb-8 uppercase tracking-widest text-xs opacity-60 px-8">Scan to track your position in line</p>

                            <div className="bg-slate-50 p-8 rounded-[40px] mb-8 border-2 border-slate-100 flex flex-col items-center">
                                <div className="text-6xl font-black text-blue-600 mb-4 tracking-tighter drop-shadow-sm">
                                    {latestTicket.ticket_number}
                                </div>
                                <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-200 w-48 h-48 flex items-center justify-center">
                                    <QRCode
                                        value={`${window.location.origin}/register?id=${latestTicket.id}`}
                                        size={160}
                                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                        viewBox={`0 0 256 256`}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={closePortal}
                                className="w-full py-5 bg-slate-900 text-white rounded-[25px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl hover:shadow-blue-500/20 active:scale-95"
                            >
                                Done / Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
