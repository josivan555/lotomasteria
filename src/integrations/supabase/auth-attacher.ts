// This file is customized to avoid unnecessary session calls.
import { createMiddleware } from '@tanstack/react-start'
import { supabase } from './client'

// Must be registered as a global `functionMiddleware` in `src/start.ts`; otherwise
// the browser never attaches the bearer token to serverFn RPCs.
export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    // We try to get the session from storage without a full network/refresh cycle if possible,
    // though getSession() usually handles local storage efficiently.
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    
    // Only attach header if token exists to avoid triggerring Unauthorized errors 
    // in middlewares like requireSupabaseAuth when not strictly needed (though TanStack handles this).
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },
)
