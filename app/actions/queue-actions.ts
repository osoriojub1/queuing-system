'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient as createServerSupabase } from '@/utils/supabase/server';

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

export async function createTicket(category: string) {
    try {
        // 1. Insert the new ticket
        const { data: ticket, error } = await supabase
            .from('queue')
            .insert([{ category, status: 'waiting' }])
            .select()
            .single();

        if (error || !ticket) throw error;

        // 2. Check position to see if they need an immediate "upcoming" notification
        // (If they are in the first 3 waiting spots, they should know immediately)
        const { count } = await supabase
            .from('queue')
            .select('*', { count: 'exact', head: true })
            .eq('category', category)
            .eq('status', 'waiting')
            .lt('created_at', ticket.created_at);

        const position = (count || 0) + 1;

        return {
            success: true,
            ticket,
            position
        };
    } catch (error) {
        console.error('Create ticket error:', error);
        return { success: false, message: 'Server error creating ticket.' };
    }
}

export async function dispatchNext(category: string) {
    try {
        // 1. Mark current 'serving' patient in this category as 'completed'
        await supabase
            .from('queue')
            .update({ status: 'completed' })
            .eq('category', category)
            .eq('status', 'serving');

        // 2. Get the next 'waiting' patient
        const { data: nextPatient, error: nextError } = await supabase
            .from('queue')
            .select('id, ticket_number, push_user_id')
            .eq('category', category)
            .eq('status', 'waiting')
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

        if (nextError || !nextPatient) {
            return { success: false, message: 'No patients in waiting line.' };
        }

        // 3. Set the next patient to 'serving'
        await supabase
            .from('queue')
            .update({ status: 'serving' })
            .eq('id', nextPatient.id);

        // 4. Notification Logic:
        // A. Notify the person who JUST became 'serving'
        if (nextPatient.push_user_id) {
            await sendPushNotification(
                [nextPatient.push_user_id],
                `It's your turn! Please proceed to the ${category} station.`
            );
        }

        // B. Notify the person who is exactly 3 numbers away (the 3rd person in the waiting list)
        // This gives them a "heads up" to start moving towards the station.
        const { data: thirdInLine } = await supabase
            .from('queue')
            .select('push_user_id')
            .eq('category', category)
            .eq('status', 'waiting')
            .order('created_at', { ascending: true })
            .range(2, 2) // Get the 3rd item (0, 1, 2)
            .single();

        if (thirdInLine?.push_user_id) {
            await sendPushNotification(
                [thirdInLine.push_user_id],
                `Heads up! You are now 3rd in line for ${category}. Please prepare.`
            );
        }

        return { success: true, ticket_number: nextPatient.ticket_number };
    } catch (error) {
        console.error('Dispatch error:', error);
        return { success: false, message: 'Server error during dispatch.' };
    }
}

async function sendPushNotification(playerIds: string[], message: string) {
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
        console.warn('OneSignal credentials missing. Skipping push.');
        return;
    }

    try {
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                include_player_ids: playerIds,
                contents: { en: message },
            }),
        });

        const data = await response.json();
        console.log('OneSignal response:', data);
    } catch (error) {
        console.error('Push notification error:', error);
    }
}

export async function updatePushId(ticketId: string, pushId: string) {
    try {
        const { error } = await supabase
            .from('queue')
            .update({ push_user_id: pushId })
            .eq('id', ticketId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Update push ID error:', error);
        return { success: false };
    }
}

export async function callPrevious(category: string) {
    try {
        // 1. Find the current 'serving' patient
        const { data: currentServing } = await supabase
            .from('queue')
            .select('id')
            .eq('category', category)
            .eq('status', 'serving')
            .single();

        // 2. Set current 'serving' back to 'waiting' (put them back at the front of the line)
        // Since we order by created_at, they naturally go back to the front
        if (currentServing) {
            await supabase
                .from('queue')
                .update({ status: 'waiting' })
                .eq('id', currentServing.id);
        }

        // 3. Find the most recently 'completed' patient
        const { data: lastCompleted, error } = await supabase
            .from('queue')
            .select('id, ticket_number')
            .eq('category', category)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !lastCompleted) {
            return { success: false, message: 'No previous records found.' };
        }

        // 4. Set that patient back to 'serving'
        await supabase
            .from('queue')
            .update({ status: 'serving' })
            .eq('id', lastCompleted.id);

        return { success: true, ticket_number: lastCompleted.ticket_number };
    } catch (error) {
        console.error('Call previous error:', error);
        return { success: false, message: 'Server error during undo.' };
    }
}

export async function resetQueue(category: string) {
    try {
        // Reset means mark all active (waiting/serving) as completed
        const { error } = await supabase
            .from('queue')
            .update({ status: 'completed' })
            .eq('category', category)
            .in('status', ['waiting', 'serving']);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Reset queue error:', error);
        return { success: false, message: 'Server error during reset.' };
    }
}

export async function updateMaxLimit(category: string, limit: number) {
    try {
        const { error } = await supabase
            .from('queue_settings')
            .upsert({ category, max_limit: limit })
            .eq('category', category);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Update limit error:', error);
        return { success: false, message: 'Server error updating limit.' };
    }
}

export async function toggleService(category: string, isOpen: boolean) {
    try {
        const { error } = await supabase
            .from('queue_settings')
            .upsert({ category, is_open: isOpen })
            .eq('category', category);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Toggle service error:', error);
        return { success: false, message: 'Server error toggling service.' };
    }
}

export async function signOut() {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
    revalidatePath('/', 'layout');
    redirect('/login');
}
