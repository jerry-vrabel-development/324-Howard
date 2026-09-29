/** getElementById that fails loudly if the markup and the code drift apart. */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

export function formValue(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value.trim() : '';
}

/** Fill a <select> from a list of {id, label}, optionally with an "All" option first. */
export function fillSelect(
  select: HTMLSelectElement,
  options: readonly { id: string; label: string }[],
  allLabel?: string,
): void {
  select.replaceChildren();
  if (allLabel) select.add(new Option(allLabel, 'all'));
  for (const o of options) select.add(new Option(o.label, o.id));
}
