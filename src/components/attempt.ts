import { errorMessage, showToast } from './toast';

/**
 * Run a data change and report failures as a toast. With Supabase, anything
 * can fail (offline, permission denied), and the UI should say so rather than
 * fail silently. Returns whether it succeeded.
 */
export async function attempt(
  fn: () => Promise<unknown>,
  options: { success?: string; button?: HTMLButtonElement | null } = {},
): Promise<boolean> {
  const { button } = options;
  if (button) button.disabled = true;
  try {
    await fn();
    if (options.success) showToast(options.success);
    return true;
  } catch (err) {
    showToast(errorMessage(err), 'error', 8000);
    return false;
  } finally {
    if (button) button.disabled = false;
  }
}
