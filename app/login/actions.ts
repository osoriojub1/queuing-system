'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        return redirect('/login?error=' + encodeURIComponent(error.message))
    }

    revalidatePath('/', 'layout')
    redirect('/operator-a')
}

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}

export async function resetPassword(formData: FormData) {
    const supabase = await createClient()
    const adminEmail = process.env.ADMIN_RESET_EMAIL

    if (!adminEmail) {
        return redirect('/login?error=System configuration error: Admin email not set.')
    }

    // We will use standard Supabase reset which sends a secure link.
    const { error } = await supabase.auth.resetPasswordForEmail(adminEmail, {
        redirectTo: `${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/auth/confirm?type=recovery`,
    })

    if (error) {
        return redirect('/login?error=' + encodeURIComponent(error.message))
    }

    return redirect('/login?message=Check your email for the reset link.')
}
