import { describe, expect, it } from 'vitest';
import { XPSystem, DifficultyEnum, CompletionSourceEnum, QualityEnum, Task, CompletionRecord, CompletionContext, User, StreakState } from './domain';

function createTask(): Task {
  return new Task(
    'task-1',
    'user-1',
    'Write report',
    'Write the weekly life OS reflection report.',
    new Date('2026-04-26T08:00:00Z'),
    DifficultyEnum.Medium,
    100,
    30,
  );
}

const completionContext: CompletionContext = {
  completedAtUTC: new Date('2026-04-26T09:00:00Z'),
  timezone: 'UTC',
  completionDurationMinutes: 30,
  quality: QualityEnum.Good,
  source: CompletionSourceEnum.Manual,
  metadataHash: 'hash-123',
};

describe('XPSystem', () => {
  it('calculates level thresholds consistently', () => {
    const xp = new XPSystem();
    expect(xp.calculateLevel(0)).toBe(1);
    expect(xp.calculateLevel(500)).toBeGreaterThanOrEqual(1);
    expect(XPSystem.xpRequiredForLevel(2)).toBe(2500);
  });

  it('applies quality and streak factors', () => {
    const xp = new XPSystem();
    const task = createTask();
    const score = xp.getXPForTask(task, completionContext, 3, 1.0);
    expect(score).toBeGreaterThan(0);
    expect(score).toBe(Math.floor(task.getBaseXP() * 1.2 * Math.min(2.0, 1 + 0.05 * 3) * XPSystem.qualityFactor(QualityEnum.Good, CompletionSourceEnum.Manual, 30, task)));
  });
});

describe('StreakState', () => {
  it('extends streak within grace window', () => {
    const streak = new StreakState();
    const now = new Date('2026-04-26T10:00:00Z');
    streak.advance(now);
    expect(streak.getCurrentDays()).toBe(1);
    const later = new Date(now.getTime() + 23 * 3600000);
    expect(streak.isWithinGraceWindow(later)).toBe(true);
    streak.advance(later);
    expect(streak.getCurrentDays()).toBe(2);
  });
});

describe('User task completion', () => {
  it('awards XP for a valid completion', () => {
    const user = new User('user-1', 'test@example.com', 'UTC', new Date('2026-04-26T00:00:00Z'));
    const task = createTask();
    user.addTask(task);
    const result = user.completeTask('task-1', completionContext, new Date('2026-04-26T09:05:00Z'));

    expect(result).toBe(true);
    expect(user.getXPSystem().getTotalXP()).toBeGreaterThan(0);
    expect(task.getStatus()).toBe('Completed');
  });
});
