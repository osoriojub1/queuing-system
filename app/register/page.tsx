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
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!ticketId) return;

        fetchTicket();

        // OneSignal Init
        const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
        if (ONESIGNAL_APP_ID) {
            console.log('OneSignal: Initializing with ID:', ONESIGNAL_APP_ID);
            OneSignal.init({
                appId: ONESIGNAL_APP_ID,
                allowLocalhostAsSecureOrigin: true,
            }).then(() => {
                console.log('OneSignal: Initialized');
                setIsSubscribed(OneSignal.Notifications.permission);

                // Add event listener for subscription changes
                // This ensures we catch the ID as soon as it's generated, even if the user
                // reacts to the standard browser prompt instead of our bell button.
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
            });
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

            {/* Full-screen Turn Alert */}
            {showTurnAlert && ticket.status === 'serving' && (
                <div className="fixed inset-0 bg-blue-600 flex flex-col items-center justify-center z-50 animate-fade-in p-8 text-center">
                    <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center mb-8 animate-bounce">
                        <Bell size={64} className="text-white" />
                    </div>
                    <h2 className="text-6xl font-black text-white mb-4 tracking-tighter uppercase">It's Your Turn!</h2>
                    <p className="text-2xl text-blue-100 mb-12">Please proceed to the {ticket.category} station immediately.</p>
                    <div className="text-9xl font-black text-white mb-12 bg-slate-900/20 px-12 py-6 rounded-3xl">
                        {ticket.ticket_number}
                    </div>
                    <button
                        onClick={() => setShowTurnAlert(false)}
                        className="px-12 py-5 bg-white text-blue-600 rounded-2xl font-black text-xl shadow-2xl active:scale-95 transition-all"
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
