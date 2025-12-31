import { createServerClient } from '@supabase/ssr'
import { redirect } from '@sveltejs/kit'
import { env as publicEnv } from '$env/dynamic/public';

/** @type {import('@sveltejs/kit').Handle} */
export const handle = async ({ event, resolve }) => {
  // 1. Initialize Supabase with PUBLIC environment variables
  event.locals.supabase = createServerClient(
    publicEnv.PUBLIC_SUPABASE_URL,
    publicEnv.PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        fetch: (...args) => event.fetch(...args),
      },
      cookies: {
        getAll: () => event.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, { ...options, path: '/' })
          })
        },
      },
    }
  )

  // 2. Helper to safely get the session
  event.locals.safeGetSession = async () => {
    const { data: { session } } = await event.locals.supabase.auth.getSession()
    if (!session) return { session: null, user: null }
    return { session, user: session.user }
  }

  const { session } = await event.locals.safeGetSession()

  // 3. ROUTE PROTECTION
  if (!session && (event.url.pathname.startsWith('/upload'))) {
    throw redirect(303, '/login')
  }

  if (session && event.url.pathname === '/login') {
    throw redirect(303, '/upload')
  }

  return resolve(event, {
    bodySizeLimit: 100 * 1024 * 1024, // 100MB limit
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version'
    },
  })
}