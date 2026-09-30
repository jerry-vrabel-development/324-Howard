import type { Session } from '@supabase/supabase-js';
import { setViewer, type Role } from './viewer';
import { check, supabase } from './supabase';

/**
 * Email sign-in. Supabase emails a link and (if the email template includes
 * {{ .Token }}) a code. The link signs in the browser that opens it; the code
 * can be typed into whichever device asked for it.
 *
 * shouldCreateUser: false — only people you've invited can sign in.
 */

async function viewerFor(session: Session | null): Promise<void> {
  if (!session) {
    setViewer({ mode: 'remote', role: 'visitor', userId: null, email: null, name: '' });
    return;
  }
  const { user } = session;
  const { data } = await supabase()
    .from('profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .maybeSingle();
  const role: Role = data?.role === 'admin' || data?.role === 'landowner' ? data.role : 'visitor';
  setViewer({
    mode: 'remote',
    role,
    userId: user.id,
    email: user.email ?? null,
    name: data?.display_name || user.email || '',
  });
}

/**
 * Resolves as soon as any session in the URL (from an email link) has been
 * picked up. Looking up the member's role happens in the background and calls
 * `onChange` when done, so a slow network never blocks the page from appearing.
 */
export async function initAuth(onChange: () => void): Promise<void> {
  const { data } = await supabase().auth.getSession();
  const user = data.session?.user;
  setViewer({
    mode: 'remote',
    role: 'visitor',
    userId: user?.id ?? null,
    email: user?.email ?? null,
    name: user?.email ?? '',
  });
  if (data.session) void viewerFor(data.session).then(onChange);

  let lastUserId = user?.id ?? null;
  supabase().auth.onAuthStateChange((_event, session) => {
    const userId = session?.user.id ?? null;
    if (userId === lastUserId) return; // token refreshes don't change who's signed in
    lastUserId = userId;
    // Supabase recommends not awaiting other Supabase calls inside this callback.
    setTimeout(() => void viewerFor(session).then(onChange), 0);
  });
}

export async function sendSignInEmail(email: string): Promise<void> {
  const redirect = new URL(import.meta.env.BASE_URL, window.location.origin).href;
  const { error } = await supabase().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: redirect },
  });
  if (error) {
    // With sign-ups off, unknown addresses are rejected. Say so plainly.
    throw new Error(
      /signups? not allowed|not found|otp_disabled/i.test(error.message)
        ? "That email isn't on the project. Ask Jerry for an invitation."
        : error.message,
    );
  }
}

export async function verifySignInCode(email: string, token: string): Promise<void> {
  check(await supabase().auth.verifyOtp({ email, token, type: 'email' }));
}

export async function signOut(): Promise<void> {
  await supabase().auth.signOut();
}

/**
 * A used or expired email link comes back as #error=…&error_description=….
 * Returns a readable message (and clears the URL), or null if there's no error.
 */
export function takeSignInErrorFromUrl(): string | null {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const code = params.get('error_code');
  const description = params.get('error_description');
  if (!code && !description && !params.get('error')) return null;
  history.replaceState(null, '', window.location.pathname + window.location.search);
  return code === 'otp_expired'
    ? 'That sign-in link has expired or was already used. Request a new one, or type the code from the email.'
    : (description ?? 'Sign-in failed. Please try again.');
}
