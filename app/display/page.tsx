'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Clock as ClockIcon, Users } from 'lucide-react';

type QueueItem = {
    id: string;
    ticket_number: string;
    status: string;
    category: string;
};

export default function PublicDisplay() {
    const [queues, setQueues] = useState<Record<string, QueueItem[]>>({
        'Animal Bite': [],
        'Prenatal': [],
        'Medicine': []
    });
    const [currentTime, setCurrentTime] = useState(new Date());
    const [serviceStatus, setServiceStatus] = useState<Record<string, boolean>>({
        'Animal Bite': true,
        'Prenatal': true,
        'Medicine': true
    });
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        fetchQueues();

        // Clock update
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        // Subscribe to real-time updates
        const channel = supabase
            .channel('public_queue_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, () => {
                fetchQueues();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_settings' }, () => {
                fetchQueues();
            })
            .subscribe();

        return () => {
            clearInterval(timer);
            supabase.removeChannel(channel);
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

        // Fetch service status
        const { data: settingsData } = await supabase.from('queue_settings').select('category, is_open');
        if (settingsData) {
            const statusMap: Record<string, boolean> = {};
            settingsData.forEach(s => statusMap[s.category] = s.is_open ?? true);
            setServiceStatus(statusMap);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-hidden flex flex-col">
            {/* Simplified, High-Visibility Header */}
            <header className="bg-slate-900 px-12 py-10 flex justify-between items-center border-b-4 border-blue-600 shadow-2xl">
                <div className="flex items-center gap-6">
                    <div className="bg-blue-600 p-4 rounded-3xl shadow-lg shadow-blue-500/20">
                        <Users size={64} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-7xl font-black tracking-tight uppercase flex items-center gap-4">
                            Queue Status
                            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
                        </h1>
                    </div>
                </div>

                <div className="text-right">
                    <div className="flex items-center gap-6 justify-end text-8xl font-black tracking-tighter text-blue-400">
                        {isMounted && currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <p className="text-slate-400 text-3xl font-bold mt-2 uppercase tracking-widest">
                        {isMounted && currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </header>

            {/* Main Content Area - Emphasized Serving Numbers */}
            <main className="flex-grow p-10 grid grid-cols-1 md:grid-cols-3 gap-12">
                {Object.entries(queues).map(([category, items]) => {
                    const serving = items.find(i => i.status === 'serving');
                    const waiting = items.filter(i => i.status === 'waiting').slice(0, 4);

                    return (
                        <div key={category} className="bg-slate-900 border-2 border-slate-800 rounded-[50px] flex flex-col overflow-hidden shadow-2xl relative">
                            {/* Category Header */}
                            <div className="bg-blue-600/10 p-10 border-b border-slate-800 text-center">
                                <h2 className="text-5xl font-black uppercase tracking-tighter text-blue-500">
                                    {category}
                                </h2>
                            </div>

                            {/* Ultra Emphasized Serving Number */}
                            <div className="px-6 py-10 flex-grow flex flex-col items-center justify-center text-center">
                                {serviceStatus[category] !== false ? (
                                    <>
                                        <span className="text-slate-500 text-3xl font-black uppercase tracking-[0.5em] mb-8">Now Serving</span>
                                        <div className="text-[200px] leading-none font-black text-white mb-10 tracking-tighter drop-shadow-[0_20px_20px_rgba(37,99,235,0.6)] animate-pulse selection:bg-blue-600 break-all px-4">
                                            {serving ? serving.ticket_number : '---'}
                                        </div>

                                        {/* Waiting List Preview */}
                                        <div className="w-full mt-auto bg-slate-950/50 p-8 rounded-[40px] border border-slate-800">
                                            <div className="flex items-center justify-center gap-4 text-slate-400 mb-6 font-black uppercase tracking-widest text-2xl">
                                                <span>Upcoming</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                {waiting.length > 0 ? (
                                                    waiting.map((item) => (
                                                        <div key={item.id} className="bg-slate-800 px-8 py-4 rounded-2xl border border-slate-700 text-3xl font-black text-slate-300 shadow-inner">
                                                            {item.ticket_number}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="col-span-2 text-slate-700 font-bold text-2xl py-2 italic text-center">
                                                        Waiting list empty
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-8 py-20 grayscale opacity-40">
                                        <div className="text-9xl font-black text-slate-700 tracking-tighter uppercase rotate-[-10deg]">
                                            NO SERVICE
                                        </div>
                                        <div className="text-4xl font-bold text-slate-500 uppercase tracking-widest">
                                            Unavailable Today
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* Refined Footer with Logo */}
            <footer className="bg-slate-900 px-12 py-8 border-t border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <div className="bg-white/5 p-2 rounded-2xl border border-white/10">
                        <Image
                            src="/logo.png"
                            alt="Logo"
                            width={60}
                            height={60}
                            className="rounded-xl"
                        />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tighter uppercase text-white leading-none mb-1">Valladolid District Hospital</h2>
                        <p className="text-blue-500 text-xs font-black uppercase tracking-[0.4em]">Government Medical Service Center</p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2 text-right">
                    <div className="text-3xl font-black text-slate-300 italic uppercase tracking-widest">
                        Now Calling Numbers
                    </div>
                    <div className="text-sm text-slate-500 font-bold uppercase tracking-widest">
                        Please wait for your turn • Maging mahinahon at maayos
                    </div>
                </div>
            </footer>
        </div>
    );
}
