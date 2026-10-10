/**
 * The browser Supabase client, loaded on first use.
 *
 * Shop pages only need Supabase for the login session and the saved cart,
 * neither of which has to be ready before the page is shown. Loading it
 * like this keeps the library (~70 KB) out of the JavaScript every page
 * needs before it becomes interactive.
 *
 * Pages that need it immediately (sign-in, account) import
 * "@/lib/supabase/client" directly; it's the same client either way.
 */
type BrowserClient = (typeof import("./client"))["supabase"];

let loading: Promise<BrowserClient> | null = null;

export function getSupabase(): Promise<BrowserClient> {
  loading ??= import("./client").then((module) => module.supabase);
  return loading;
}
