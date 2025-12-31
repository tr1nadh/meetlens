import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr'
import { env } from '$env/dynamic/public'

/** @type {import('./$types').LayoutLoad} */
export const load = async ({ fetch, data, depends }) => {
  depends('supabase:auth')

  const supabase = isBrowser()
    ? createBrowserClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY)
    : createServerClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
        global: { fetch },
        cookies: {
          getAll() {
            return data.cookies
          },
        },
      })

  /**
   * We get the session from the server-side layout data 
   * and the user from the supabase client we just created
   */
  const { data: { session } } = await supabase.auth.getSession()

  return { supabase, session, user: session?.user }
}