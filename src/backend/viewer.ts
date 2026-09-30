/**
 * Who is looking at the page, and what they're allowed to do.
 *
 * The role only shapes the UI (which buttons appear). The database enforces
 * the real permissions, so a hand-edited page can't do more than its role allows.
 *
 * <body data-role="…" data-mode="…"> lets CSS hide controls by role:
 *   data-requires="admin"   visible to admin only
 *   data-requires="member"  visible to admin and landowner
 *   data-requires="landowner"
 */

export type Role = 'admin' | 'landowner' | 'visitor';

export interface Viewer {
  mode: 'local' | 'remote';
  role: Role;
  userId: string | null;
  email: string | null;
  name: string;
}

type Listener = (viewer: Viewer) => void;

let viewer: Viewer = { mode: 'local', role: 'admin', userId: null, email: null, name: '' };
const listeners = new Set<Listener>();

export const getViewer = (): Viewer => viewer;
export const isAdmin = (): boolean => viewer.role === 'admin';
export const isMember = (): boolean => viewer.role === 'admin' || viewer.role === 'landowner';

export function setViewer(next: Viewer): void {
  viewer = next;
  document.body.dataset.role = next.role;
  document.body.dataset.mode = next.mode;
  document.body.dataset.signedIn = String(Boolean(next.userId));
  listeners.forEach((l) => l(next));
}

export function onViewerChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
