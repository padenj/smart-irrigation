// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProgramManager } from '../ProgramManager';
import { ProgramRecurrenceType, type Program } from '../../shared/programs';
import { programRepository } from '../../server/data/repositories';

const { liveQueryMock, zoneFindMock } = vi.hoisted(() => ({
  liveQueryMock: vi.fn(),
  zoneFindMock: vi.fn(),
}));

vi.mock('remult', () => ({
  Entity: () => () => undefined,
  Fields: {
    uuid: () => () => undefined,
    string: () => () => undefined,
    json: () => () => undefined,
    boolean: () => () => undefined,
    object: () => () => undefined,
    date: () => () => undefined,
    number: () => () => undefined,
  },
  Validators: {
    required: vi.fn(),
  },
  remult: {
    repo: vi.fn(() => ({
      find: zoneFindMock,
    })),
  },
}));

vi.mock('../../hooks/StatusContext', () => ({
  useStatusContext: () => ({
    activeProgram: null,
    activeZone: null,
  }),
}));

vi.mock('../../hooks/SettingsContext', () => ({
  useSettingsContext: () => ({
    timezone: 'UTC',
  }),
}));

vi.mock('../../server/controllers/ProgramController', () => ({
  ProgramController: {
    calculateNextScheuleDate: vi.fn(),
    runProgram: vi.fn(),
    stopActiveProgram: vi.fn(),
  },
}));

vi.mock('../../server/data/repositories', () => ({
  programRepository: {
    liveQuery: liveQueryMock,
    update: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ProgramManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders programs delivered by the live query subscription', async () => {
    const program: Program = {
      id: 'program-1',
      name: 'Front Planters',
      startTime: '2026-01-06T06:00:00.000Z',
      endTime: '',
      daysOfWeek: [1, 3, 5],
      schedules: [
        {
          id: 'schedule-1',
          startTime: '06:00',
          isEnabled: true,
          recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
          daysOfWeek: [1, 3, 5],
          intervalDays: null,
          lastScheduledRunTime: null,
          nextScheduledRunTime: '2026-01-06T06:00:00.000Z',
        },
      ],
      zones: [{ zoneId: 'zone-1', duration: 45 }],
      isEnabled: true,
      nextScheduledRunTime: '2026-01-06T06:00:00.000Z',
      lastRunTime: null,
      skipUntil: null,
      conditions: [],
    };

    zoneFindMock.mockResolvedValue([
      { id: 'zone-1', name: 'Front Planters', enabled: true },
    ]);

    liveQueryMock.mockReturnValue({
      subscribe: (callback: (info: { applyChanges: Program[] }) => void) => {
        callback({ applyChanges: [program] });
        return () => {};
      },
    });

    render(<ProgramManager />);

    await waitFor(() => {
      expect(screen.getByText('Front Planters')).toBeTruthy();
    });
  });

  it('renders each schedule entry time for programs with multiple schedules', async () => {
    const program: Program = {
      id: 'program-2',
      name: 'Multi Schedule Program',
      startTime: '',
      endTime: '',
      daysOfWeek: [],
      schedules: [
        {
          id: 'schedule-1',
          startTime: '06:00',
          isEnabled: true,
          recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
          daysOfWeek: [1, 3, 5],
          intervalDays: null,
          lastScheduledRunTime: null,
          nextScheduledRunTime: '2026-01-06T06:00:00.000Z',
        },
        {
          id: 'schedule-2',
          startTime: '19:00',
          isEnabled: true,
          recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
          daysOfWeek: [1, 3, 5],
          intervalDays: null,
          lastScheduledRunTime: null,
          nextScheduledRunTime: '2026-01-06T19:00:00.000Z',
        },
      ],
      zones: [{ zoneId: 'zone-1', duration: 45 }],
      isEnabled: true,
      nextScheduledRunTime: '2026-01-06T06:00:00.000Z',
      lastRunTime: null,
      skipUntil: null,
      conditions: [],
    };

    zoneFindMock.mockResolvedValue([
      { id: 'zone-1', name: 'Front Planters', enabled: true },
    ]);

    liveQueryMock.mockReturnValue({
      subscribe: (callback: (info: { applyChanges: Program[] }) => void) => {
        callback({ applyChanges: [program] });
        return () => {};
      },
    });

    render(<ProgramManager />);

    await waitFor(() => {
      expect(screen.getByText('06:00 AM')).toBeTruthy();
      expect(screen.getByText('07:00 PM')).toBeTruthy();
    });
  });

  it('shows one editable row per schedule entry in edit mode', async () => {
    const user = userEvent.setup();
    const program: Program = {
      id: 'program-3',
      name: 'Editable Program',
      startTime: '',
      endTime: '',
      daysOfWeek: [],
      schedules: [
        {
          id: 'schedule-1',
          startTime: '06:00',
          isEnabled: true,
          recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
          daysOfWeek: [1, 3, 5],
          intervalDays: null,
          lastScheduledRunTime: null,
          nextScheduledRunTime: '2026-01-06T06:00:00.000Z',
        },
        {
          id: 'schedule-2',
          startTime: '19:00',
          isEnabled: true,
          recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
          daysOfWeek: [1, 3, 5],
          intervalDays: null,
          lastScheduledRunTime: null,
          nextScheduledRunTime: '2026-01-06T19:00:00.000Z',
        },
      ],
      zones: [{ zoneId: 'zone-1', duration: 45 }],
      isEnabled: true,
      nextScheduledRunTime: '2026-01-06T06:00:00.000Z',
      lastRunTime: null,
      skipUntil: null,
      conditions: [],
    };

    zoneFindMock.mockResolvedValue([
      { id: 'zone-1', name: 'Front Planters', enabled: true },
    ]);

    liveQueryMock.mockReturnValue({
      subscribe: (callback: (info: { applyChanges: Program[] }) => void) => {
        callback({ applyChanges: [program] });
        return () => {};
      },
    });

    render(<ProgramManager />);

    await user.click(
      await screen.findByRole('button', { name: 'Edit program Editable Program' }),
    );

    const scheduleInputs = screen.getAllByLabelText(/Schedule time/i);
    expect(scheduleInputs).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Add schedule' })).toBeTruthy();
  });

  it('lets a zone duration be cleared while editing and shows a unit selector', async () => {
    const user = userEvent.setup();
    const program: Program = {
      id: 'program-4',
      name: 'Duration Program',
      startTime: '',
      endTime: '',
      daysOfWeek: [],
      schedules: [
        {
          id: 'schedule-1',
          startTime: '06:00',
          isEnabled: true,
          recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
          daysOfWeek: [1, 3, 5],
          intervalDays: null,
          lastScheduledRunTime: null,
          nextScheduledRunTime: '2026-01-06T06:00:00.000Z',
        },
      ],
      zones: [{ zoneId: 'zone-1', duration: 45 }],
      isEnabled: true,
      nextScheduledRunTime: '2026-01-06T06:00:00.000Z',
      lastRunTime: null,
      skipUntil: null,
      conditions: [],
    };

    zoneFindMock.mockResolvedValue([
      { id: 'zone-1', name: 'Front Planters', enabled: true },
    ]);

    liveQueryMock.mockReturnValue({
      subscribe: (callback: (info: { applyChanges: Program[] }) => void) => {
        callback({ applyChanges: [program] });
        return () => {};
      },
    });

    render(<ProgramManager />);

    await user.click(
      await screen.findByRole('button', { name: 'Edit program Duration Program' }),
    );

    const durationInput = screen.getByLabelText('Duration for Front Planters') as HTMLInputElement;
    expect(durationInput.value).toBe('45');

    await user.clear(durationInput);

    expect(durationInput.value).toBe('');
    expect(screen.getByLabelText('Duration unit for Front Planters')).toBeTruthy();
  });

  it('blocks saving an enabled program when all selected zone durations are zero', async () => {
    const user = userEvent.setup();
    const program: Program = {
      id: 'program-5',
      name: 'Validation Program',
      startTime: '',
      endTime: '',
      daysOfWeek: [],
      schedules: [
        {
          id: 'schedule-1',
          startTime: '06:00',
          isEnabled: true,
          recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
          daysOfWeek: [1, 3, 5],
          intervalDays: null,
          lastScheduledRunTime: null,
          nextScheduledRunTime: '2026-01-06T06:00:00.000Z',
        },
      ],
      zones: [{ zoneId: 'zone-1', duration: 45 }],
      isEnabled: true,
      nextScheduledRunTime: '2026-01-06T06:00:00.000Z',
      lastRunTime: null,
      skipUntil: null,
      conditions: [],
    };

    zoneFindMock.mockResolvedValue([
      { id: 'zone-1', name: 'Front Planters', enabled: true },
    ]);

    liveQueryMock.mockReturnValue({
      subscribe: (callback: (info: { applyChanges: Program[] }) => void) => {
        callback({ applyChanges: [program] });
        return () => {};
      },
    });

    render(<ProgramManager />);

    await user.click(
      await screen.findByRole('button', { name: 'Edit program Validation Program' }),
    );

    const durationInput = screen.getByLabelText('Duration for Front Planters');
    await user.clear(durationInput);
    await user.click(screen.getByRole('button', { name: 'Save program Validation Program' }));

    expect(screen.getByText('Enter a duration greater than 0 for at least one selected zone.')).toBeTruthy();
    expect(programRepository.update).not.toHaveBeenCalled();
  });

  it('shows an interval input when a schedule is switched to every N days', async () => {
    const user = userEvent.setup();
    const program: Program = {
      id: 'program-6',
      name: 'Interval Program',
      startTime: '',
      endTime: '',
      daysOfWeek: [],
      schedules: [
        {
          id: 'schedule-1',
          startTime: '06:00',
          isEnabled: true,
          recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
          daysOfWeek: [1, 3, 5],
          intervalDays: null,
          lastScheduledRunTime: null,
          nextScheduledRunTime: '2026-01-06T06:00:00.000Z',
        },
      ],
      zones: [{ zoneId: 'zone-1', duration: 45 }],
      isEnabled: true,
      nextScheduledRunTime: '2026-01-06T06:00:00.000Z',
      lastRunTime: null,
      skipUntil: null,
      conditions: [],
    };

    zoneFindMock.mockResolvedValue([
      { id: 'zone-1', name: 'Front Planters', enabled: true },
    ]);

    liveQueryMock.mockReturnValue({
      subscribe: (callback: (info: { applyChanges: Program[] }) => void) => {
        callback({ applyChanges: [program] });
        return () => {};
      },
    });

    render(<ProgramManager />);

    await user.click(
      await screen.findByRole('button', { name: 'Edit program Interval Program' }),
    );

    await user.selectOptions(screen.getByLabelText('Recurrence type'), 'everyNDays');

    expect(screen.getByLabelText('Repeat every N days')).toBeTruthy();
  });

  it('uses mobile-first layout classes for program cards', async () => {
    const program: Program = {
      id: 'program-7',
      name: 'Mobile Layout Program',
      startTime: '',
      endTime: '',
      daysOfWeek: [],
      schedules: [
        {
          id: 'schedule-1',
          startTime: '06:00',
          isEnabled: true,
          recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
          daysOfWeek: [1, 3, 5],
          intervalDays: null,
          lastScheduledRunTime: null,
          nextScheduledRunTime: '2026-01-06T06:00:00.000Z',
        },
      ],
      zones: [{ zoneId: 'zone-1', duration: 45 }],
      isEnabled: true,
      nextScheduledRunTime: '2026-01-06T06:00:00.000Z',
      lastRunTime: null,
      skipUntil: null,
      conditions: [],
    };

    zoneFindMock.mockResolvedValue([
      { id: 'zone-1', name: 'Front Planters', enabled: true },
    ]);

    liveQueryMock.mockReturnValue({
      subscribe: (callback: (info: { applyChanges: Program[] }) => void) => {
        callback({ applyChanges: [program] });
        return () => {};
      },
    });

    render(<ProgramManager />);

    await waitFor(() => {
      expect(screen.getByText('Mobile Layout Program')).toBeTruthy();
    });

    const actionRow = screen.getByRole('button', { name: 'Edit program Mobile Layout Program' }).parentElement;
    expect(actionRow?.className).toContain('flex-wrap');

    const card = screen.getByText('Mobile Layout Program').closest('div.bg-white');
    const sectionsGrid = card?.querySelector('.grid');
    expect(sectionsGrid?.className).toContain('grid-cols-1');
    expect(sectionsGrid?.className).toContain('lg:grid-cols-2');
  });

  it('blocks saving an enabled every-N-days schedule when the interval is less than 2', async () => {
    const user = userEvent.setup();
    const program: Program = {
      id: 'program-8',
      name: 'Interval Validation Program',
      startTime: '',
      endTime: '',
      daysOfWeek: [],
      schedules: [
        {
          id: 'schedule-1',
          startTime: '06:00',
          isEnabled: true,
          recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
          daysOfWeek: [1, 3, 5],
          intervalDays: null,
          lastScheduledRunTime: null,
          nextScheduledRunTime: '2026-01-06T06:00:00.000Z',
        },
      ],
      zones: [{ zoneId: 'zone-1', duration: 45 }],
      isEnabled: true,
      nextScheduledRunTime: '2026-01-06T06:00:00.000Z',
      lastRunTime: null,
      skipUntil: null,
      conditions: [],
    };

    zoneFindMock.mockResolvedValue([
      { id: 'zone-1', name: 'Front Planters', enabled: true },
    ]);

    liveQueryMock.mockReturnValue({
      subscribe: (callback: (info: { applyChanges: Program[] }) => void) => {
        callback({ applyChanges: [program] });
        return () => {};
      },
    });

    render(<ProgramManager />);

    await user.click(
      await screen.findByRole('button', { name: 'Edit program Interval Validation Program' }),
    );

    await user.selectOptions(screen.getByLabelText('Recurrence type'), 'everyNDays');
    const intervalInput = screen.getByLabelText('Repeat every N days');
    fireEvent.change(intervalInput, { target: { value: '1' } });
    await user.click(screen.getByRole('button', { name: 'Save program Interval Validation Program' }));

    expect(screen.getByText('Repeat every N days must be greater than 1 for enabled schedules.')).toBeTruthy();
    expect(programRepository.update).not.toHaveBeenCalled();
  });

  it('blocks saving an enabled weekly schedule when no days are selected', async () => {
    const user = userEvent.setup();
    const program: Program = {
      id: 'program-9',
      name: 'Weekly Validation Program',
      startTime: '',
      endTime: '',
      daysOfWeek: [],
      schedules: [
        {
          id: 'schedule-1',
          startTime: '06:00',
          isEnabled: true,
          recurrenceType: ProgramRecurrenceType.DAYS_OF_WEEK,
          daysOfWeek: [1],
          intervalDays: null,
          lastScheduledRunTime: null,
          nextScheduledRunTime: '2026-01-06T06:00:00.000Z',
        },
      ],
      zones: [{ zoneId: 'zone-1', duration: 45 }],
      isEnabled: true,
      nextScheduledRunTime: '2026-01-06T06:00:00.000Z',
      lastRunTime: null,
      skipUntil: null,
      conditions: [],
    };

    zoneFindMock.mockResolvedValue([
      { id: 'zone-1', name: 'Front Planters', enabled: true },
    ]);

    liveQueryMock.mockReturnValue({
      subscribe: (callback: (info: { applyChanges: Program[] }) => void) => {
        callback({ applyChanges: [program] });
        return () => {};
      },
    });

    render(<ProgramManager />);

    await user.click(
      await screen.findByRole('button', { name: 'Edit program Weekly Validation Program' }),
    );

    await user.click(screen.getByRole('button', { name: 'Mon' }));
    await user.click(screen.getByRole('button', { name: 'Save program Weekly Validation Program' }));

    expect(screen.getByText('Select at least one day for each enabled weekly schedule.')).toBeTruthy();
    expect(programRepository.update).not.toHaveBeenCalled();
  });
});
