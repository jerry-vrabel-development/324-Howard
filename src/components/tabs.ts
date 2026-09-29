/**
 * Accessible tabs (WAI-ARIA tab pattern) with the active tab mirrored in the
 * URL hash, so a refresh or a shared link lands on the same view.
 */

export function initTabs(tablist: HTMLElement, onChange?: (id: string) => void): void {
  const tabs = Array.from(tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const ids = tabs.map((t) => t.dataset.tab ?? '');

  function select(id: string, focus = false): void {
    const active = ids.includes(id) ? id : ids[0];
    for (const tab of tabs) {
      const selected = tab.dataset.tab === active;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '');
      if (panel) panel.hidden = !selected;
      if (selected && focus) tab.focus();
    }
    if (active && location.hash.slice(1) !== active) {
      history.replaceState(null, '', `#${active}`);
    }
    if (active) onChange?.(active);
  }

  tablist.addEventListener('click', (event) => {
    const tab = (event.target as HTMLElement).closest<HTMLButtonElement>('[role="tab"]');
    if (tab?.dataset.tab) select(tab.dataset.tab);
  });

  tablist.addEventListener('keydown', (event) => {
    const current = tabs.findIndex((t) => t === document.activeElement);
    if (current < 0) return;
    const moves: Record<string, number> = {
      ArrowRight: current + 1,
      ArrowLeft: current - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const nextIndex = moves[event.key];
    if (nextIndex === undefined) return;
    event.preventDefault();
    const next = tabs[(nextIndex + tabs.length) % tabs.length];
    if (next?.dataset.tab) select(next.dataset.tab, true);
  });

  window.addEventListener('hashchange', () => select(location.hash.slice(1)));
  select(location.hash.slice(1));
}
