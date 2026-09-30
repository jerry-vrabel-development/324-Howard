import { attempt } from '../../components/attempt';
import { closeDialog, openDialog } from '../../components/dialog';
import { hydrateIcons } from '../../components/icons';
import { sendSignInEmail, signOut, verifySignInCode } from '../../backend/auth';
import { getViewer, onViewerChange, type Viewer } from '../../backend/viewer';
import { byId, formValue } from '../../utils/dom';
import { html, setHtml } from '../../utils/html';

const ROLE_LABEL = { admin: 'Admin', landowner: 'Landowner', visitor: 'No access yet' } as const;

/** Header sign-in button, the email/code sign-in dialog, and the account dialog. */
export function initAccount(): void {
  const button = byId<HTMLButtonElement>('account-button');
  const signInDialog = byId<HTMLDialogElement>('dialog-signin');
  const emailForm = byId<HTMLFormElement>('signin-email-form');
  const codeForm = byId<HTMLFormElement>('signin-code-form');
  const accountDialog = byId<HTMLDialogElement>('dialog-account');
  let email = '';

  function renderButton(viewer: Viewer): void {
    const signedIn = Boolean(viewer.userId);
    setHtml(
      button,
      signedIn
        ? html`<i data-lucide="circle-user-round" class="size-4"></i
            ><span class="hidden max-w-28 truncate sm:inline">${viewer.name}</span>`
        : html`<i data-lucide="log-in" class="size-4"></i
            ><span class="hidden sm:inline">Sign in</span>`,
    );
    button.setAttribute('aria-label', signedIn ? `Account: ${viewer.name}` : 'Sign in');
    hydrateIcons(button);
  }

  function showStep(step: 'email' | 'code'): void {
    emailForm.hidden = step !== 'email';
    codeForm.hidden = step !== 'code';
    (step === 'email' ? byId('signin-email') : byId('signin-code')).focus();
  }

  button.addEventListener('click', () => {
    const viewer = getViewer();
    if (viewer.userId) {
      byId('account-name').textContent = viewer.name;
      byId('account-email').textContent = viewer.email ?? '';
      byId('account-role').textContent = ROLE_LABEL[viewer.role];
      byId('account-no-access').hidden = viewer.role !== 'visitor';
      openDialog(accountDialog);
    } else {
      emailForm.reset();
      codeForm.reset();
      openDialog(signInDialog);
      showStep('email');
    }
  });

  emailForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    email = formValue(emailForm, 'email');
    const submit = emailForm.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (await attempt(() => sendSignInEmail(email), { button: submit })) {
      byId('signin-sent-to').textContent = email;
      showStep('code');
    }
  });

  codeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const code = formValue(codeForm, 'code').replace(/\s+/g, '');
    const submit = codeForm.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (await attempt(() => verifySignInCode(email, code), { button: submit })) {
      closeDialog(signInDialog);
    }
  });

  byId('signin-back').addEventListener('click', () => showStep('email'));

  byId('sign-out').addEventListener('click', async (event) => {
    if (await attempt(signOut, { button: event.currentTarget as HTMLButtonElement })) {
      closeDialog(accountDialog);
    }
  });

  onViewerChange(renderButton);
  renderButton(getViewer());
}
