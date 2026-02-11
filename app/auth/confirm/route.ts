import { type NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in search params, use it as the redirection URL
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            const isRecovery = searchParams.get('type') === 'recovery'
            if (isRecovery) {
                return redirect('/reset-password')
            }
            return redirect(next)
        }
    }

    // return the user to an error page with instructions
    return redirect('/login?error=Could not authenticate user')
}
