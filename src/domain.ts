export enum DifficultyEnum {
  VeryEasy = 1,
  Easy = 2,
  Medium = 3,
  Hard = 4,
  VeryHard = 5,
}

export enum TaskStatusEnum {
  Pending = 'Pending',
  Completed = 'Completed',
  Skipped = 'Skipped',
}

export enum QualityEnum {
  Poor = 'Poor',
  Standard = 'Standard',
  Good = 'Good',
  Excellent = 'Excellent',
}

export enum CompletionSourceEnum {
  Manual = 'Manual',
  VerifiedSensor = 'VerifiedSensor',
  ExternalSystem = 'ExternalSystem',
}

export enum AchievementCategoryEnum {
  Consistency = 'Consistency',
  Productivity = 'Productivity',
  Reflection = 'Reflection',
}

export type UnlockCondition = {
  minimumLevel: number;
  requiredAchievementCategory?: AchievementCategoryEnum;
  requiredTotalXP?: number;
};

export type CompletionContext = {
  completedAtUTC: Date;
  timezone: string;
  completionDurationMinutes: number;
  quality: QualityEnum;
  source: CompletionSourceEnum;
  metadataHash: string;
};

export const AntiCheatConstants = {
  maxTimestampDriftMinutes: 5,
  streakGraceWindowMinutes: 120,
  minimalEffortMinutes: 5,
  easyTaskXPWindowLimit: 10,
  easyTaskDailyXPCap: 300,
  duplicateTaskWindowMinutes: 30,
  duplicateTaskThreshold: 5,
};

export class CompletionRecord {
  private recordId: string;
  private taskId: string;
  private completedAtUTC: Date;
  private timezone: string;
  private completionQuality: QualityEnum;
  private source: CompletionSourceEnum;
  private metadataHash: string;

  constructor(
    recordId: string,
    taskId: string,
    completedAtUTC: Date,
    timezone: string,
    completionQuality: QualityEnum,
    source: CompletionSourceEnum,
    metadataHash: string,
  ) {
    this.recordId = recordId;
    this.taskId = taskId;
    this.completedAtUTC = completedAtUTC;
    this.timezone = timezone;
    this.completionQuality = completionQuality;
    this.source = source;
    this.metadataHash = metadataHash;
  }

  public isAuthentic(receivedAtUTC: Date): boolean {
    const deltaMs = Math.abs(receivedAtUTC.getTime() - this.completedAtUTC.getTime());
    const deltaMinutes = deltaMs / 60000;
    return deltaMinutes <= AntiCheatConstants.maxTimestampDriftMinutes;
  }

  public normalizeTimestamp(): Date {
    return new Date(this.completedAtUTC.getTime());
  }

  public getSource(): CompletionSourceEnum {
    return this.source;
  }

  public getQuality(): QualityEnum {
    return this.completionQuality;
  }

  public getMetadataHash(): string {
    return this.metadataHash;
  }
}

export class StreakState {
  private currentDays: number;
  private lastCompletionDate: Date | null;
  private graceExpiryDate: Date | null;
  private isBroken: boolean;

  constructor() {
    this.currentDays = 0;
    this.lastCompletionDate = null;
    this.graceExpiryDate = null;
    this.isBroken = false;
  }

  public getCurrentDays(): number {
    return this.currentDays;
  }

  public getLastCompletionDate(): Date | null {
    return this.lastCompletionDate ? new Date(this.lastCompletionDate.getTime()) : null;
  }

  public getGraceExpiryDate(): Date | null {
    return this.graceExpiryDate ? new Date(this.graceExpiryDate.getTime()) : null;
  }

  public getIsBroken(): boolean {
    return this.isBroken;
  }

  public advance(currentDate: Date): void {
    if (this.lastCompletionDate === null) {
      this.currentDays = 1;
      this.isBroken = false;
    } else {
      const hoursSinceLast = (currentDate.getTime() - this.lastCompletionDate.getTime()) / 3600000;
      if (hoursSinceLast <= 24 + AntiCheatConstants.streakGraceWindowMinutes / 60) {
        this.currentDays += 1;
        this.isBroken = false;
      } else {
        this.reset();
      }
    }
    this.lastCompletionDate = new Date(currentDate.getTime());
    this.enterGraceWindow(currentDate, AntiCheatConstants.streakGraceWindowMinutes);
  }

  public reset(): void {
    this.currentDays = 0;
    this.lastCompletionDate = null;
    this.graceExpiryDate = null;
    this.isBroken = true;
  }

  public enterGraceWindow(currentDate: Date, windowMinutes: number): void {
    this.graceExpiryDate = new Date(currentDate.getTime() + windowMinutes * 60000 + 24 * 3600000);
  }

  public isWithinGraceWindow(currentDate: Date): boolean {
    return this.graceExpiryDate !== null && currentDate.getTime() <= this.graceExpiryDate.getTime();
  }
}

export class Task {
  private taskId: string;
  private ownerId: string;
  private title: string;
  private description: string;
  private createdAt: Date;
  private dueAt: Date | null;
  private scheduledAt: Date | null;
  private difficulty: DifficultyEnum;
  private baseXP: number;
  private estimatedDurationMinutes: number;
  private status: TaskStatusEnum;
  private completionRecords: CompletionRecord[];
  private isVerified: boolean;

  constructor(
    taskId: string,
    ownerId: string,
    title: string,
    description: string,
    createdAt: Date,
    difficulty: DifficultyEnum,
    baseXP: number,
    estimatedDurationMinutes: number,
    dueAt: Date | null = null,
    scheduledAt: Date | null = null,
  ) {
    this.taskId = taskId;
    this.ownerId = ownerId;
    this.title = title;
    this.description = description;
    this.createdAt = createdAt;
    this.difficulty = difficulty;
    this.baseXP = baseXP;
    this.estimatedDurationMinutes = estimatedDurationMinutes;
    this.dueAt = dueAt;
    this.scheduledAt = scheduledAt;
    this.status = TaskStatusEnum.Pending;
    this.completionRecords = [];
    this.isVerified = false;
  }

  public getTaskId(): string {
    return this.taskId;
  }

  public getOwnerId(): string {
    return this.ownerId;
  }

  public getCreatedAt(): Date {
    return new Date(this.createdAt.getTime());
  }

  public getDifficulty(): DifficultyEnum {
    return this.difficulty;
  }

  public getBaseXP(): number {
    return this.baseXP;
  }

  public getStatus(): TaskStatusEnum {
    return this.status;
  }

  public calculatePotentialXP(): number {
    return Math.floor(this.baseXP * (1 + 0.2 * (this.difficulty - 1)));
  }

  public markCompleted(record: CompletionRecord): void {
    this.completionRecords.push(record);
    this.status = TaskStatusEnum.Completed;
    this.isVerified = record.getSource() !== CompletionSourceEnum.Manual;
  }

  public validateCompletion(currentTimeUTC: Date, timezone: string): boolean {
    if (currentTimeUTC.getTime() < this.createdAt.getTime()) {
      return false;
    }
    const drift = Math.abs(currentTimeUTC.getTime() - new Date().getTime()) / 60000;
    if (drift > AntiCheatConstants.maxTimestampDriftMinutes) {
      return false;
    }
    return true;
  }
}

export class DiaryEntry {
  private entryId: string;
  private userId: string;
  private createdAt: Date;
  private timezone: string;
  private content: string;
  private mood: AchievementCategoryEnum;
  private tags: Set<string>;

  constructor(
    entryId: string,
    userId: string,
    createdAt: Date,
    timezone: string,
    content: string,
    mood: AchievementCategoryEnum,
    tags: Set<string>,
  ) {
    this.entryId = entryId;
    this.userId = userId;
    this.createdAt = createdAt;
    this.timezone = timezone;
    this.content = content;
    this.mood = mood;
    this.tags = tags;
  }

  public isValid(): boolean {
    return this.content.trim().length > 0;
  }

  public timestampNormalized(): Date {
    return new Date(this.createdAt.getTime());
  }
}

export class Achievement {
  private achievementId: string;
  private name: string;
  private description: string;
  private progress: number;
  private threshold: number;
  private awardedAt: Date | null;
  private category: AchievementCategoryEnum;
  private isActive: boolean;

  constructor(
    achievementId: string,
    name: string,
    description: string,
    threshold: number,
    category: AchievementCategoryEnum,
    initialProgress: number = 0.1,
  ) {
    this.achievementId = achievementId;
    this.name = name;
    this.description = description;
    this.threshold = threshold;
    this.category = category;
    this.progress = Math.min(initialProgress, threshold);
    this.awardedAt = null;
    this.isActive = true;
  }

  public updateProgress(amount: number): void {
    if (!this.isActive) {
      return;
    }
    this.progress = Math.min(this.progress + amount, this.threshold);
    if (this.isUnlocked()) {
      this.awardIfComplete(new Date());
    }
  }

  public isUnlocked(): boolean {
    return this.progress >= this.threshold;
  }

  public awardIfComplete(timestamp: Date): void {
    if (this.isUnlocked() && this.awardedAt === null) {
      this.awardedAt = timestamp;
      this.isActive = false;
    }
  }
}

export class UnlockableFeature {
  private featureId: string;
  private name: string;
  private description: string;
  private unlockCondition: UnlockCondition;
  private isUnlocked: boolean;
  private unlockedAt: Date | null;

  constructor(featureId: string, name: string, description: string, unlockCondition: UnlockCondition) {
    this.featureId = featureId;
    this.name = name;
    this.description = description;
    this.unlockCondition = unlockCondition;
    this.isUnlocked = false;
    this.unlockedAt = null;
  }

  public checkUnlock(user: User): boolean {
    if (this.isUnlocked) {
      return true;
    }
    if (user.getXPSystem().getLevel() < this.unlockCondition.minimumLevel) {
      return false;
    }
    if (this.unlockCondition.requiredTotalXP !== undefined && user.getXPSystem().getTotalXP() < this.unlockCondition.requiredTotalXP) {
      return false;
    }
    if (this.unlockCondition.requiredAchievementCategory !== undefined) {
      const hasCategory = Array.from(user.getAchievements()).some(
        achievement => achievement['category'] === this.unlockCondition.requiredAchievementCategory,
      );
      if (!hasCategory) {
        return false;
      }
    }
    this.activate(user);
    return true;
  }

  public activate(user: User): void {
    this.isUnlocked = true;
    this.unlockedAt = new Date();
    user.addUnlockedFeature(this);
  }
}

export class XPSystem {
  private currentXP: number;
  private level: number;
  private totalXP: number;
  private dailyXP: number;
  private weeklyXP: number;
  private streakMultiplier: number;
  private lastXPUpdate: Date | null;
  private graceWindowMinutes: number;

  constructor() {
    this.currentXP = 0;
    this.level = 1;
    this.totalXP = 0;
    this.dailyXP = 0;
    this.weeklyXP = 0;
    this.streakMultiplier = 1.0;
    this.lastXPUpdate = null;
    this.graceWindowMinutes = AntiCheatConstants.streakGraceWindowMinutes;
  }

  public getLevel(): number {
    return this.level;
  }

  public getTotalXP(): number {
    return this.totalXP;
  }

  public getStreakMultiplier(): number {
    return this.streakMultiplier;
  }

  public awardXP(amount: number, source: string, timestampUTC: Date): void {
    if (!this.validateXPEvent(timestampUTC)) {
      return;
    }
    const xp = Math.max(0, Math.floor(amount));
    this.currentXP += xp;
    this.totalXP += xp;
    this.dailyXP += xp;
    this.weeklyXP += xp;
    this.lastXPUpdate = new Date(timestampUTC.getTime());
    this.level = this.calculateLevel(this.totalXP);
  }

  public calculateLevel(xp: number): number {
    const level = Math.floor(( -1500 + Math.sqrt(1500 * 1500 + 2000 * xp )) / 1000);
    return Math.max(1, level + 1);
  }

  public static xpRequiredForLevel(level: number): number {
    return 500 * level * level + 1500 * level;
  }

  public getXPForTask(
    task: Task,
    completionContext: CompletionContext,
    streakDays: number,
    spamPenalty: number,
  ): number {
    const base = task.getBaseXP();
    const difficultyFactor = 1 + 0.2 * (task.getDifficulty() - 1);
    const streakFactor = Math.min(2.0, 1 + 0.05 * streakDays);
    const qualityBonus = XPSystem.qualityFactor(completionContext.quality, completionContext.source, completionContext.completionDurationMinutes, task);
    const raw = base * difficultyFactor * streakFactor * qualityBonus * spamPenalty;
    return Math.floor(raw);
  }

  public static qualityFactor(
    quality: QualityEnum,
    source: CompletionSourceEnum,
    durationMinutes: number,
    task: Task,
  ): number {
    const qualityMap: Record<QualityEnum, number> = {
      [QualityEnum.Poor]: 0.8,
      [QualityEnum.Standard]: 1.0,
      [QualityEnum.Good]: 1.1,
      [QualityEnum.Excellent]: 1.25,
    };
    let factor = qualityMap[quality];
    if (source === CompletionSourceEnum.Manual) {
      factor *= 0.75;
    }
    if (durationMinutes < AntiCheatConstants.minimalEffortMinutes && task.getDifficulty() >= DifficultyEnum.Medium) {
      factor *= 0.8;
    }
    return factor;
  }

  public validateXPEvent(timestampUTC: Date): boolean {
    const nowUtc = new Date();
    const deltaMinutes = Math.abs(nowUtc.getTime() - timestampUTC.getTime()) / 60000;
    return deltaMinutes <= AntiCheatConstants.maxTimestampDriftMinutes;
  }
}

export class User {
  private userId: string;
  private email: string;
  private timezone: string;
  private createdAt: Date;
  private lastActiveAt: Date;
  private streakState: StreakState;
  private xpProfile: XPSystem;
  private achievements: Set<Achievement>;
  private unlockedFeatures: Set<UnlockableFeature>;
  private tasks: Task[];
  private recentCompletionHashes: string[];

  constructor(userId: string, email: string, timezone: string, createdAt: Date) {
    this.userId = userId;
    this.email = email;
    this.timezone = timezone;
    this.createdAt = createdAt;
    this.lastActiveAt = new Date(createdAt.getTime());
    this.streakState = new StreakState();
    this.xpProfile = new XPSystem();
    this.achievements = new Set();
    this.unlockedFeatures = new Set();
    this.tasks = [];
    this.recentCompletionHashes = [];
  }

  public addTask(task: Task): void {
    this.tasks.push(task);
  }

  public getXPSystem(): XPSystem {
    return this.xpProfile;
  }

  public getAchievements(): Set<Achievement> {
    return this.achievements;
  }

  public addUnlockedFeature(feature: UnlockableFeature): void {
    this.unlockedFeatures.add(feature);
  }

  public completeTask(taskId: string, completionContext: CompletionContext, receivedAtUTC: Date): boolean {
    const task = this.tasks.find(t => t.getTaskId() === taskId);
    if (!task || task.getOwnerId() !== this.userId || task.getStatus() === TaskStatusEnum.Completed) {
      return false;
    }
    if (!task.validateCompletion(completionContext.completedAtUTC, completionContext.timezone)) {
      return false;
    }
    if (!completionContext.completedAtUTC) {
      return false;
    }
    const record = new CompletionRecord(
      `${taskId}-${Date.now()}`,
      taskId,
      completionContext.completedAtUTC,
      completionContext.timezone,
      completionContext.quality,
      completionContext.source,
      completionContext.metadataHash,
    );
    if (!record.isAuthentic(receivedAtUTC)) {
      return false;
    }

    const spamPenalty = this.calculateSpamPenalty(task, completionContext, receivedAtUTC);
    const streakDays = this.streakState.getCurrentDays();
    const xp = this.xpProfile.getXPForTask(task, completionContext, streakDays, spamPenalty);
    task.markCompleted(record);
    this.xpProfile.awardXP(xp, 'TaskCompletion', receivedAtUTC);
    this.updateStreak(completionContext.completedAtUTC);
    this.lastActiveAt = new Date(receivedAtUTC.getTime());
    this.recentCompletionHashes.push(completionContext.metadataHash);
    if (this.recentCompletionHashes.length > 20) {
      this.recentCompletionHashes.shift();
    }
    return true;
  }

  private updateStreak(completedAtUTC: Date): void {
    if (this.streakState.getLastCompletionDate() === null) {
      this.streakState.advance(completedAtUTC);
      return;
    }
    if (this.streakState.isWithinGraceWindow(completedAtUTC)) {
      this.streakState.advance(completedAtUTC);
      return;
    }
    const lastDate = this.streakState.getLastCompletionDate();
    if (lastDate && completedAtUTC.getTime() - lastDate.getTime() > 24 * 3600000 + AntiCheatConstants.streakGraceWindowMinutes * 60000) {
      this.streakState.reset();
      this.streakState.advance(completedAtUTC);
    } else {
      this.streakState.advance(completedAtUTC);
    }
  }

  private calculateSpamPenalty(task: Task, completionContext: CompletionContext, receivedAtUTC: Date): number {
    const easyCompletions = this.tasks.filter(t => t.getDifficulty() <= DifficultyEnum.Easy && t.getStatus() === TaskStatusEnum.Completed).length;
    const easyTasksPast24h = this.tasks.filter(t => t.getDifficulty() <= DifficultyEnum.Easy && t.getStatus() === TaskStatusEnum.Completed && t.getCreatedAt().getTime() >= receivedAtUTC.getTime() - 24 * 3600000).length;
    const duplicateTasks = this.tasks.filter(
      t => t.getTaskId() !== task.getTaskId() && t['title'] === task['title'] && t.getDifficulty() === task.getDifficulty() && t['estimatedDurationMinutes'] === task['estimatedDurationMinutes'] && t.getCreatedAt().getTime() >= receivedAtUTC.getTime() - AntiCheatConstants.duplicateTaskWindowMinutes * 60000,
    ).length;

    if (easyTasksPast24h > AntiCheatConstants.easyTaskXPWindowLimit) {
      return 0.2;
    }
    if (this.xpProfile.getTotalXP() > AntiCheatConstants.easyTaskDailyXPCap && task.getDifficulty() <= DifficultyEnum.Easy) {
      return 0.6;
    }
    if (duplicateTasks >= AntiCheatConstants.duplicateTaskThreshold) {
      return 0.5;
    }
    if (this.recentCompletionHashes.filter(hash => hash === completionContext.metadataHash).length > 3) {
      return 0.4;
    }
    return 1.0;
  }

  public refreshDailyState(currentTimeUTC: Date): void {
    if (this.lastActiveAt === null) {
      return;
    }
    const lastLocalDate = toLocalDateString(this.lastActiveAt, this.timezone);
    const currentLocalDate = toLocalDateString(currentTimeUTC, this.timezone);
    if (lastLocalDate !== currentLocalDate) {
      this.xpProfile['dailyXP'] = 0;
    }
    this.lastActiveAt = new Date(currentTimeUTC.getTime());
  }
}

export function toLocalDateString(timestamp: Date, timezone: string): string {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = dtf.formatToParts(timestamp);
  const year = parts.find(part => part.type === 'year')?.value ?? '0000';
  const month = parts.find(part => part.type === 'month')?.value ?? '01';
  const day = parts.find(part => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}
