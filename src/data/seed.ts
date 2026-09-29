import { SCHEMA_VERSION } from '../config/constants';
import type { AppData } from '../types';

/**
 * Demo content, only added when you choose "Load sample data".
 * Every record is flagged `sample: true` and shows a "Sample" badge, so it can
 * never be mistaken for real project history and can be removed in one step.
 *
 * The photos are Unsplash stock images, not this house.
 * Ids match the v1 demo records so loading samples twice never duplicates them.
 */
export function sampleData(): AppData {
  const unsplash = (id: string) =>
    `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

  return {
    schemaVersion: SCHEMA_VERSION,
    activeTimer: null,
    photos: [
      {
        id: 'p1',
        room: 'living-room',
        title: 'Living room floor restoration',
        description:
          'Pulled the carpet to expose the original subfloor, refinished the boards, sealed the walls and brought the outlets up to code.',
        beforeUrl: unsplash('photo-1513694203232-719a280e022f'),
        afterUrl: unsplash('photo-1600585154340-be6161a56a0c'),
        date: '2026-03-12',
        sample: true,
      },
      {
        id: 'p2',
        room: 'exterior',
        title: 'Front porch and siding',
        description:
          'Replaced rotted trim, painted in sage and sand, and rebuilt the front entry steps.',
        beforeUrl: unsplash('photo-1505843513577-22bb7d21e455'),
        afterUrl: unsplash('photo-1512917774080-9991f1c4c750'),
        date: '2026-02-28',
        sample: true,
      },
      {
        id: 'p3',
        room: 'kitchen',
        title: 'Kitchen remodel',
        description:
          'Swapped damaged cabinets for shaker millwork, added quartz counters and brass fixtures.',
        beforeUrl: unsplash('photo-1507089947368-19c1da9775ae'),
        afterUrl: unsplash('photo-1556911220-e15b29be8c8f'),
        date: '2026-01-15',
        sample: true,
      },
    ],
    tasks: [
      {
        id: 't1',
        title: 'Inspect and sister basement floor joists',
        room: 'basement',
        status: 'in-progress',
        priority: 'high',
        estimatedHours: 12,
        loggedHours: 6.5,
        notes: 'Check header joists for old moisture damage and sister where needed.',
        sample: true,
      },
      {
        id: 't2',
        title: 'Tile the walk-in shower',
        room: 'bathroom',
        status: 'todo',
        priority: 'high',
        estimatedHours: 16,
        loggedHours: 0,
        notes: 'Subway tile over a waterproof membrane.',
        sample: true,
      },
      {
        id: 't3',
        title: 'Refinish original interior doors',
        room: 'master-bedroom',
        status: 'completed',
        priority: 'medium',
        estimatedHours: 8,
        loggedHours: 8.5,
        notes: 'Stripped four layers of paint, oiled the brass mortise locksets.',
        sample: true,
      },
      {
        id: 't4',
        title: 'Replace drafty living room windows',
        room: 'living-room',
        status: 'completed',
        priority: 'high',
        estimatedHours: 10,
        loggedHours: 11,
        notes: 'New double-pane units; original casing trim kept.',
        sample: true,
      },
    ],
    journal: [
      {
        id: 'j1',
        title: 'Found 1925 newspaper behind the baseboard',
        tag: 'historical-finding',
        content:
          'A fragment of the Chicago Tribune from October 1925 was tucked behind the living room baseboard during drywall removal. Framing it for the house.',
        date: '2026-09-15',
        sample: true,
      },
      {
        id: 'j2',
        title: 'First storm off the lake',
        tag: 'live-in-reflection',
        content: 'Strong north winds tonight. The newly insulated north wall held heat well.',
        date: '2026-08-28',
        sample: true,
      },
    ],
  };
}
