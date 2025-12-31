

import { createServerClient } from '@supabase/ssr'
import { redirect } from '@sveltejs/kit'
import { env } from '$env/dynamic/private';

/** @type {import('@sveltejs/kit').Handle} */
export const handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          event.cookies.set(name, value, { ...options, path: '/' })
        })
      },
    },
  })

  // Helper to safely get the session
  event.locals.safeGetSession = async () => {
    const { data: { session } } = await event.locals.supabase.auth.getSession()
    if (!session) return { session: null, user: null }
    return { session, user: session.user }
  }

  const { session } = await event.locals.safeGetSession()

  // ROUTE PROTECTION
  // If no session and trying to access /upload, send to login
  if (!session && (event.url.pathname === '/upload' || event.url.pathname === '/upload/report')) {
    throw redirect(303, '/login')
  }

  // If logged in and trying to access /login, send to upload
  if (session && event.url.pathname === '/login') {
    throw redirect(303, '/upload')
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version'
    },
  })
}