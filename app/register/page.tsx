'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import OneSignal from 'react-onesignal';
import { Bell, BellOff, MapPin, Clock, AlertCircle, Users } from 'lucide-react';
import { updatePushId } from '@/app/actions/queue-actions';

function PatientPortalContent() {
    const searchParams = useSearchParams();
    const ticketId = searchParams.get('id');

    const [ticket, setTicket] = useState<any>(null);
    const [position, setPosition] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [showTurnAlert, setShowTurnAlert] = useState(false);
    const [oneSignalError, setOneSignalError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!ticketId) return;

        fetchTicket();

        // OneSignal Init
        const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
        if (ONESIGNAL_APP_ID) {
            console.log('OneSignal: Initializing with ID:', ONESIGNAL_APP_ID);

            // Modern initialization with error boundary
            const initOneSignal = async () => {
                try {
                    // Check if push is supported by the browser (v16 syntax)
                    if (!(OneSignal as any).Notifications.isPushSupported()) {
                        console.warn('OneSignal: Browser does not support push notifications.');
                        return;
                    }

                    await OneSignal.init({
                        appId: ONESIGNAL_APP_ID,
                        allowLocalhostAsSecureOrigin: true,
                        serviceWorkerPath: "/OneSignalSDKWorker.js", // Explicit path for Vercel
                    } as any);

                    console.log('OneSignal: Initialized successfully');
                    setIsSubscribed(OneSignal.Notifications.permission);

                    // Add event listener for subscription changes
                    OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
                        const pushId = event.current.id;
                        const isOptedIn = event.current.optedIn;
                        console.log('OneSignal: Subscription change detected', { pushId, isOptedIn });

                        if (pushId && ticketId && isOptedIn) {
                            console.log('OneSignal: Syncing Push ID to Supabase...');
                            await updatePushId(ticketId, pushId);
                            setIsSubscribed(true);
                        }
                    });

                    // Initial check if already subscribed
                    const currentPushId = OneSignal.User.PushSubscription.id;
                    if (currentPushId && ticketId) {
                        console.log('OneSignal: Already subscribed, syncing Push ID:', currentPushId);
                        updatePushId(ticketId, currentPushId);
                    }
                } catch (err: any) {
                    console.error('OneSignal: Initialization Failed:', err);

                    // Detection logic for IndexedDB failures (Private Mode / Corrupted Cache)
                    if (err.message?.includes('indexedDB') || err.name === 'UnknownError') {
                        setOneSignalError('BROWSER_STORAGE_ERROR');
                    } else {
                        setOneSignalError('GENERAL_ERROR');
                    }
                }
            };

            initOneSignal();
        }

        // Real-time listener
        const channel = supabase
            .channel(`ticket_${ticketId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'queue' }, // Listen to all queue changes to update position
                (payload: any) => {
                    // Always refresh data when ANY queue update happens (someone else called, etc)
                    fetchTicket();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [ticketId]);

    const fetchTicket = async () => {
        try {
            // 1. Fetch ticket details
            const { data, error } = await supabase
                .from('queue')
                .select('*')
                .eq('id', ticketId)
                .single();

            if (error) throw error;
            setTicket(data);
            if (data.status === 'serving') setShowTurnAlert(true);

            // 2. Fetch how many people are 'waiting' before this ticket
            if (data.status === 'waiting') {
                const { count } = await supabase
                    .from('queue')
                    .select('*', { count: 'exact', head: true })
                    .eq('category', data.category)
                    .eq('status', 'waiting')
                    .lt('created_at', data.created_at);

                setPosition((count || 0) + 1);
            } else {
                setPosition(0);
            }
        } catch (err) {
            console.error('Fetch ticket error:', err);
        } finally {
            setLoading(false);
        }
    };

    const triggerAlert = () => {
        setShowTurnAlert(true);
        if (audioRef.current) {
            audioRef.current.play().catch(e => console.log('Audio play blocked:', e));
        }
        // Vibrate if mobile
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
        }
    };

    const togglePush = async () => {
        try {
            if (!isSubscribed) {
                console.log('OneSignal: Requesting permission...');
                await OneSignal.Notifications.requestPermission();

                // OneSignal.User.PushSubscription.id might be null briefly after permission
                // But our event listener added in useEffect will catch it when it arrives.
                // However, for immediate feedback:
                const pushId = OneSignal.User.PushSubscription.id;
                if (pushId && ticketId) {
                    console.log('OneSignal: Permission granted, ID found:', pushId);
                    await updatePushId(ticketId, pushId);
                }
                setIsSubscribed(OneSignal.Notifications.permission);
            }
        } catch (err) {
            console.error('OneSignal: togglePush error:', err);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!ticket) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
            <AlertCircle size={64} className="text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-slate-900">Ticket Not Found</h1>
            <p className="text-slate-500">Please scan a valid QR code from the front desk.</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col">
            <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/03/15/audio_7303c2b186.mp3" preload="auto" />

            {/* Header */}
            <div className="p-6 bg-slate-800/50 backdrop-blur-md sticky top-0 z-10 border-b border-slate-700">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-black tracking-tighter uppercase text-blue-400">Hospital Live</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{ticket.category}</p>
                    </div>
                    <button
                        onClick={togglePush}
                        className={`p-3 rounded-full transition-all ${isSubscribed ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-300'}`}
                    >
                        {isSubscribed ? <Bell size={20} /> : <BellOff size={20} />}
                    </button>
                </div>
            </div>

            {/* ERROR UI: OneSignal / Browser Storage Issues */}
            {oneSignalError && (
                <div className="mx-6 mb-4 p-5 bg-amber-500/10 border border-amber-500/50 rounded-3xl animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex gap-4">
                        <div className="bg-amber-500 text-slate-900 p-2 rounded-xl h-fit">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <h3 className="text-amber-500 font-black uppercase text-xs tracking-widest mb-1">
                                {oneSignalError === 'BROWSER_STORAGE_ERROR' ? 'Browser Storage Blocked' : 'Notification Issue'}
                            </h3>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                {oneSignalError === 'BROWSER_STORAGE_ERROR'
                                    ? 'Your browser is blocking the local database. Please turn off "Private/Incognito" mode or clear your browser cache to receive notifications.'
                                    : 'There was a problem starting notifications. Please refresh the page.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-grow flex flex-col items-center justify-center p-8">
                <div className="text-slate-400 text-sm font-bold uppercase tracking-[0.2em] mb-4">Your Ticket Number</div>
                <div className="text-[120px] leading-none font-black text-white mb-8 tracking-tighter drop-shadow-2xl">
                    {ticket.ticket_number}
                </div>

                <div className="w-full max-w-sm space-y-4">
                    {ticket.status === 'waiting' && position !== null && (
                        <div className={`p-6 rounded-3xl border flex items-center gap-4 transition-all duration-500 ${position <= 3 ? 'bg-orange-500/20 border-orange-500/50 animate-pulse' : 'bg-slate-800 border-slate-700'}`}>
                            <div className={`p-3 rounded-2xl ${position <= 3 ? 'bg-orange-400/20 text-orange-400' : 'bg-green-500/10 text-green-400'}`}>
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase">Position in Line</p>
                                <p className={`text-xl font-bold ${position <= 3 ? 'text-orange-400' : 'text-white'}`}>
                                    {position === 1 ? 'You are next!' : `${position} people ahead`}
                                </p>
                                {position <= 3 && (
                                    <p className="text-[10px] text-orange-300/60 font-black uppercase tracking-widest mt-1">Please move closer to station</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 flex items-center gap-4">
                        <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-400">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase">Current Status</p>
                            <p className="text-xl font-bold capitalize">{ticket.status}</p>
                        </div>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 flex items-center gap-4">
                        <div className="bg-purple-500/10 p-3 rounded-2xl text-purple-400">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase">Section</p>
                            <p className="text-xl font-bold">{ticket.category} Station</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Info */}
            <div className="p-8 text-center text-slate-500 text-sm">
                <p>Keep this page open to receive real-time updates. You will be notified when it's your turn.</p>
            </div>

            {/* Full-screen Turn Alert - Responsive Fix */}
            {showTurnAlert && ticket.status === 'serving' && (
                <div className="fixed inset-0 bg-blue-600 flex flex-col items-center justify-center z-50 animate-fade-in p-4 sm:p-8 text-center overscroll-none">
                    <div className="w-20 h-20 sm:w-32 sm:h-32 bg-white/20 rounded-full flex items-center justify-center mb-4 sm:mb-8 animate-bounce">
                        <Bell className="w-10 h-10 sm:w-16 sm:h-16 text-white" />
                    </div>
                    <h2 className="text-4xl sm:text-6xl font-black text-white mb-2 sm:mb-4 tracking-tighter uppercase leading-tight">
                        It's Your Turn!
                    </h2>
                    <p className="text-lg sm:text-2xl text-blue-100 mb-6 sm:mb-12 font-medium">
                        Please proceed to the <span className="font-black text-white">{ticket.category}</span> station immediately.
                    </p>
                    <div className="text-6xl sm:text-9xl font-black text-white mb-8 sm:mb-12 bg-slate-900/20 px-8 py-4 sm:px-12 sm:py-6 rounded-3xl border border-white/10 shadow-inner">
                        {ticket.ticket_number}
                    </div>
                    <button
                        onClick={() => setShowTurnAlert(false)}
                        className="w-full max-w-[280px] sm:max-w-none sm:w-auto px-10 py-4 sm:px-12 sm:py-5 bg-white text-blue-600 rounded-2xl font-black text-lg sm:text-xl shadow-2xl active:scale-95 transition-all hover:bg-blue-50"
                    >
                        I AM GOING
                    </button>
                </div>
            )}
        </div>
    );
}

export default function PatientPortal() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PatientPortalContent />
        </Suspense>
    );
}
