'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { dispatchNext, callPrevious, resetQueue, updateMaxLimit, toggleService, signOut } from '@/app/actions/queue-actions';
import { ChevronRight, Users, Play, CheckCircle, RotateCcw, ArrowLeft, Settings2, Save, LogOut, Power, PowerOff } from 'lucide-react';

type QueueItem = {
    id: string;
    ticket_number: string;
    status: string;
    category: string;
};

type QueueSettings = {
    category: string;
    max_limit: number;
    is_open: boolean;
};

export default function DispatcherDashboard() {
    const [queues, setQueues] = useState<Record<string, QueueItem[]>>({
        'Animal Bite': [],
        'Prenatal': [],
        'Medicine': []
    });
    const [settings, setSettings] = useState<Record<string, number>>({
        'Animal Bite': 100,
        'Prenatal': 100,
        'Medicine': 100
    });
    const [serviceStatus, setServiceStatus] = useState<Record<string, boolean>>({
        'Animal Bite': true,
        'Prenatal': true,
        'Medicine': true
    });
    const [tempLimits, setTempLimits] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchQueues();
        fetchSettings();

        // Subscribe to queue changes
        const queueChannel = supabase
            .channel('dispatcher_queue_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, () => {
                fetchQueues();
            })
            .subscribe();

        // Subscribe to settings changes
        const settingsChannel = supabase
            .channel('dispatcher_settings_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_settings' }, () => {
                fetchSettings();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(queueChannel);
            supabase.removeChannel(settingsChannel);
        };
    }, []);

    const fetchQueues = async () => {
        const { data, error } = await supabase
            .from('queue')
            .select('*')
            .in('status', ['waiting', 'serving'])
            .order('created_at', { ascending: true });

        if (error) console.error('Fetch error:', error);
        else {
            const grouped = (data as QueueItem[]).reduce((acc, item) => {
                if (!acc[item.category]) acc[item.category] = [];
                acc[item.category].push(item);
                return acc;
            }, { 'Animal Bite': [], 'Prenatal': [], 'Medicine': [] } as Record<string, QueueItem[]>);
            setQueues(grouped);
        }
    };

    const fetchSettings = async () => {
        const { data, error } = await supabase.from('queue_settings').select('*');
        if (error) console.error('Settings fetch error:', error);
        else {
            const s = (data as QueueSettings[]).reduce((acc, item) => {
                acc[item.category] = item.max_limit;
                return acc;
            }, {} as Record<string, number>);
            setSettings(s);

            const status = (data as QueueSettings[]).reduce((acc, item) => {
                acc[item.category] = item.is_open ?? true;
                return acc;
            }, {} as Record<string, boolean>);
            setServiceStatus(status);

            // Initialize temp limits for editing
            const temp: Record<string, string> = {};
            data.forEach(item => {
                temp[item.category] = item.max_limit.toString();
            });
            setTempLimits(temp);
        }
    };

    const handleAction = async (category: string, action: 'next' | 'previous' | 'reset' | 'update_limit' | 'toggle_service') => {
        setLoading(prev => ({ ...prev, [category]: true }));
        let result;

        if (action === 'next') {
            result = await dispatchNext(category);
        } else if (action === 'previous') {
            result = await callPrevious(category);
        } else if (action === 'reset') {
            if (confirm(`Are you sure you want to reset the entire ${category} queue?`)) {
                result = await resetQueue(category);
            } else {
                setLoading(prev => ({ ...prev, [category]: false }));
                return;
            }
        } else if (action === 'update_limit') {
            const newLimit = parseInt(tempLimits[category]);
            if (isNaN(newLimit) || newLimit < 1) {
                alert('Please enter a valid number');
                setLoading(prev => ({ ...prev, [category]: false }));
                return;
            }
            result = await updateMaxLimit(category, newLimit);
        } else if (action === 'toggle_service') {
            const currentStatus = serviceStatus[category];
            result = await toggleService(category, !currentStatus);
        }

        if (result && !result.success) {
            alert(result.message);
        }
        setLoading(prev => ({ ...prev, [category]: false }));
    };

    return (
        <div className="min-h-screen bg-slate-100 p-8">
            <div className="max-w-[1600px] mx-auto">
                <header className="flex flex-col sm:flex-row justify-between items-center sm:items-end mb-12 gap-4">
                    <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                        <Image
                            src="/logo.png"
                            alt="Logo"
                            width={44}
                            height={44}
                            className="rounded-lg"
                        />
                        <div className="text-left">
                            <h1 className="text-xl font-black tracking-tighter uppercase text-slate-900 leading-none">VDH Hospital</h1>
                            <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-1">Dispatcher Hub</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => signOut()}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shadow-sm active:scale-95"
                        >
                            <LogOut size={14} />
                            Sign Out
                        </button>
                        <div className="flex bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 items-center gap-4">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Live Sync Active</span>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {Object.entries(queues).map(([category, items]) => {
                        const serving = items.find(i => i.status === 'serving');
                        const waiting = items.filter(i => i.status === 'waiting');
                        const currentTotal = items.length;

                        return (
                            <div key={category} className="medical-card flex flex-col h-[850px] transition-shadow hover:shadow-xl">
                                <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${serviceStatus[category] ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                        <h2 className="text-2xl font-black uppercase tracking-tight">{category}</h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleAction(category, 'toggle_service')}
                                            disabled={loading[category]}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all border ${serviceStatus[category]
                                                ? 'bg-green-500/10 text-green-400 border-green-500/50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50'
                                                : 'bg-red-500/10 text-red-400 border-red-500/50 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/50'
                                                }`}
                                        >
                                            {loading[category] ? (
                                                <RotateCcw size={14} className="animate-spin" />
                                            ) : serviceStatus[category] ? (
                                                <>
                                                    <Power size={14} />
                                                    Live
                                                </>
                                            ) : (
                                                <>
                                                    <PowerOff size={14} />
                                                    Closed
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleAction(category, 'reset')}
                                            className="p-2 hover:bg-red-600 rounded-xl transition-colors group"
                                            title="Reset Counter"
                                        >
                                            <RotateCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6-grow flex flex-col gap-6 bg-white">
                                    {/* Limit Configuration Section */}
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Settings2 size={18} />
                                            <span className="text-xs font-black uppercase tracking-widest">Max Limit</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={tempLimits[category] || ''}
                                                onChange={(e) => setTempLimits(prev => ({ ...prev, [category]: e.target.value }))}
                                                className="w-20 px-3 py-1.5 rounded-xl border border-slate-300 font-black text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button
                                                onClick={() => handleAction(category, 'update_limit')}
                                                disabled={loading[category]}
                                                className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
                                            >
                                                <Save size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Now Serving Section */}
                                    <div className="bg-blue-50 border-2 border-blue-100 rounded-3xl p-8 text-center relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4">
                                            <button
                                                onClick={() => handleAction(category, 'previous')}
                                                disabled={loading[category]}
                                                className="p-3 bg-white border border-blue-200 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white disabled:opacity-50 transition-all shadow-sm"
                                                title="Call Previous"
                                            >
                                                <ArrowLeft size={24} />
                                            </button>
                                        </div>

                                        <span className="text-blue-600 text-sm font-black uppercase tracking-widest mb-4 block">Currently Serving</span>
                                        <div className="text-8xl font-black text-blue-900 mb-8 tracking-tighter">
                                            {serving ? serving.ticket_number : '---'}
                                        </div>

                                        <button
                                            onClick={() => handleAction(category, 'next')}
                                            disabled={loading[category] || waiting.length === 0}
                                            className="w-full btn-medical bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none flex flex-row justify-center items-center py-5 text-xl"
                                        >
                                            <Play size={24} fill="white" className="mr-3" />
                                            {loading[category] ? 'Calling...' : 'Call Next'}
                                        </button>

                                        <div className="mt-6 pt-6 border-t border-blue-100 flex justify-between items-center px-2">
                                            <span className="text-blue-400 text-xs font-black uppercase tracking-widest text-left">Capacity Status</span>
                                            <div className="text-right">
                                                <span className={`text-lg font-black ${currentTotal >= (settings[category] || 100) ? 'text-red-500' : 'text-blue-700'}`}>
                                                    {currentTotal}
                                                </span>
                                                <span className="text-blue-300 font-bold"> / {settings[category] || 100}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Waiting List Section */}
                                    <div className="flex-grow flex flex-col min-h-0 bg-slate-50 rounded-3xl border border-slate-100 p-6">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="font-black text-slate-800 flex items-center gap-2 text-lg">
                                                <Users size={20} className="text-blue-600" />
                                                WAITING
                                            </h3>
                                            <span className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-black shadow-lg shadow-blue-500/30">
                                                {waiting.length}
                                            </span>
                                        </div>

                                        <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                            {waiting.length > 0 ? (
                                                waiting.map((item, idx) => (
                                                    <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm animate-fade-in hover:border-blue-400 transition-colors" style={{ animationDelay: `${idx * 0.05}s` }}>
                                                        <div>
                                                            <div className="text-2xl font-black text-slate-900">{item.ticket_number}</div>
                                                            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">Ready</div>
                                                        </div>
                                                        <div className="text-slate-300">
                                                            <ChevronRight size={24} />
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                                    <CheckCircle size={64} className="mb-4 opacity-20" />
                                                    <p className="font-black uppercase tracking-widest text-sm opacity-40">Queue Clear</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
        </div>
    );
}
