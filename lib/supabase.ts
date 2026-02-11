import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate URL format to prevent runtime crashes during initial setup
const isValidUrl = (url: string) => {
    try {
        new URL(url);
        return url.startsWith('http');
    } catch {
        return false;
    }
};

if (!isValidUrl(supabaseUrl)) {
    console.warn(
        '⚠️ Supabase URL is missing or invalid. Real-time features will not work until you update .env.local with valid credentials from your Supabase dashboard.'
    );
}

export const supabase = createClient(
    isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder-url.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);
