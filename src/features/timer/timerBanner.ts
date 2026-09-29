import { elapsedMs, stopTimer } from '../../store/actions';
import type { Store } from '../../store/store';
import type { AppData } from '../../types';
import { roomLabel } from '../../config/constants';
import { byId } from '../../utils/dom';
import { formatDuration } from '../../utils/format';

/**
 * The live "work session" banner. The interval only repaints the clock; the
 * elapsed time is always computed from the persisted start timestamp, so a
 * throttled background tab or a page reload never loses time.
 */
export function initTimerBanner(store: Store): void {
  const banner = byId('active-timer');
  const title = byId('active-timer-task');
  const display = byId('active-timer-display');
  let interval: number | undefined;

  function tick(state: AppData = store.getState()): void {
    display.textContent = formatDuration(elapsedMs(state, Date.now()));
  }

  function render(state: AppData): void {
    const task = state.tasks.find((t) => t.id === state.activeTimer?.taskId);
    window.clearInterval(interval);
    interval = undefined;

    banner.hidden = !task;
    if (!task) return;
    title.textContent = `${roomLabel(task.room)}: ${task.title}`;
    tick(state);
    interval = window.setInterval(() => tick(), 1000);
  }

  byId('stop-timer').addEventListener('click', () => {
    store.update((s) => stopTimer(s, Date.now()));
  });

  store.subscribe((state, previous) => {
    if (state.activeTimer !== previous.activeTimer || state.tasks !== previous.tasks) render(state);
  });
  render(store.getState());
}
