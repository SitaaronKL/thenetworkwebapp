import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Do not remove this. It refreshes the user's session
    // and must be called before any Server Component that requires auth.
    // Calling getUser() instead of getSession() ensures token refresh.
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    // Handle auth errors gracefully by clearing invalid sessions
    if (error && error.message?.includes('Refresh Token')) {
        // Clear the invalid session cookies
        const response = NextResponse.redirect(new URL('/', request.url))
        response.cookies.delete('sb-access-token')
        response.cookies.delete('sb-refresh-token')
        // Also clear Supabase auth cookies (they use project ref in the name)
        request.cookies.getAll().forEach((cookie) => {
            if (cookie.name.includes('supabase') || cookie.name.includes('sb-')) {
                response.cookies.delete(cookie.name)
            }
        })
        return response
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
