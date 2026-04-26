# Life Operating System Domain Model

## Behavioral Psychology Framework

1. **Loss Aversion**
   - Penalize missed streaks with immediate multiplier reduction.
   - Streak continuity is preserved only inside a strict grace window.

2. **Endowed Progress**
   - Achievement progress starts at a non-zero baseline.
   - New goals begin partially pre-filled to increase motivation.

3. **Variable Ratio Reinforcement**
   - XP rewards vary by task difficulty and quality.
   - Verified completions may yield unpredictable bonus factors.

---

## Strict UML Class Diagram

```text
+---------------------------+
|         User              |
+---------------------------+
| -userId : String          |
| -email : String           |
| -timezone : String        |
| -createdAt : Date         |
| -lastActiveAt : Date      |
| -streakState : StreakState |
| -xpProfile : XPSystem     |
| -achievements : Set<Achievement> |
| -unlockedFeatures : Set<UnlockableFeature> |
+---------------------------+
| +completeTask(taskId : String, completionContext : CompletionContext, receivedAtUTC : Date) : Boolean |
| +refreshDailyState(currentTimeUTC : Date) : void |
+---------------------------+

+---------------------------+
|         Task              |
+---------------------------+
| -taskId : String          |
| -ownerId : String         |
| -title : String           |
| -description : String     |
| -createdAt : Date         |
| -dueAt : Date             |
| -scheduledAt : Date       |
| -difficulty : DifficultyEnum |
| -baseXP : Int             |
| -estimatedDurationMinutes : Int |
| -status : TaskStatusEnum  |
| -completionRecords : List<CompletionRecord> |
| -isVerified : Boolean     |
+---------------------------+
| +calculatePotentialXP() : Int |
| +markCompleted(record : CompletionRecord) : void |
| +validateCompletion(currentTime : Date, timezone : String) : Boolean |
+---------------------------+

+---------------------------+
|       DiaryEntry          |
+---------------------------+
| -entryId : String         |
| -userId : String          |
| -createdAt : Date         |
| -timezone : String        |
| -content : String         |
| -mood : MoodEnum         |
| -tags : Set<String>       |
+---------------------------+
| +isValid() : Boolean      |
| +timestampNormalized() : Date |
+---------------------------+

+---------------------------+
|        XPSystem           |
+---------------------------+
| -currentXP : Int          |
| -level : Int              |
| -totalXP : Int            |
| -dailyXP : Int            |
| -weeklyXP : Int           |
| -streakMultiplier : Decimal |
| -lastXPUpdate : Date      |
| -graceWindowMinutes : Int |
+---------------------------+
| +awardXP(amount : Int, source : String, timestamp : Date) : void |
| +calculateLevel(xp : Int) : Int |
| +getXPForTask(task : Task, completionContext : CompletionContext, streakDays : Int, spamPenalty : Decimal) : Int |
| +validateXPEvent(timestamp : Date) : Boolean |
+---------------------------+

+---------------------------+
|      Achievement          |
+---------------------------+
| -achievementId : String   |
| -name : String            |
| -description : String     |
| -progress : Decimal       |
| -threshold : Decimal      |
| -awardedAt : Date         |
| -category : AchievementCategoryEnum |
| -isActive : Boolean       |
+---------------------------+
| +updateProgress(amount : Decimal) : void |
| +isUnlocked() : Boolean   |
| +awardIfComplete(timestamp : Date) : void |
+---------------------------+

+---------------------------+
|   UnlockableFeature       |
+---------------------------+
| -featureId : String       |
| -name : String            |
| -description : String     |
| -unlockCondition : UnlockCondition |
| -isUnlocked : Boolean     |
| -unlockedAt : Date        |
+---------------------------+
| +checkUnlock(user : User) : Boolean |
| +activate(user : User) : void     |
+---------------------------+

+---------------------------+
|   CompletionRecord        |
+---------------------------+
| -recordId : String        |
| -taskId : String          |
| -completedAt : Date       |
| -timezone : String        |
| -completionQuality : QualityEnum |
| -source : CompletionSourceEnum |
| -metadataHash : String     |
+---------------------------+
| +isAuthentic(receivedAtUTC : Date) : Boolean |
| +normalizeTimestamp() : Date |
+---------------------------+

+---------------------------+
|         StreakState       |
+---------------------------+
| -currentDays : Int        |
| -lastCompletionDate : Date|
| -graceExpiryDate : Date   |
| -isBroken : Boolean       |
+---------------------------+
| +advance(currentDate : Date) : void |
| +reset() : void           |
| +enterGraceWindow(currentDate : Date, windowMinutes : Int) : void |
+---------------------------+
```

---

## Mathematical Gamification Model

### XP Calculation Formula

Let:
- `D ∈ {1,2,3,4,5}` from `DifficultyEnum`
- `B = task.baseXP`
- `S = min(2.0, 1 + 0.05 * streakDays)`
- `Q = qualityFactor`
- `P = spamPenalty`

Exact formula:

```text
XP = floor(B * (1 + 0.20 * (D - 1)) * S * Q * P)
```

Where:
- difficulty factor = `[1.0, 1.2, 1.4, 1.6, 1.8]`
- `S` is capped at `2.0`
- `Q` is reduced for manual-only completions and minimal-duration completions
- `P` is `1.0` normally, `0.2-0.6` when spam constraints apply

### Leveling Curve Equation

```text
XP_required(level) = 500 * level^2 + 1500 * level
```

Inverse level from XP:

```text
level = floor((-1500 + sqrt(1500^2 + 2000 * currentXP)) / 1000) + 1
```

### Streak Grace Period Rules

- grace window = `24h + 120m`
- streak is preserved when completion occurs before `lastCompletionDate + 24h + 120m`
- completion after grace expiry resets streak to `0`
- grace window can be used only once per missed day

### Timezone Handling

- `User.timezone` is authoritative
- store all event timestamps in UTC with explicit timezone metadata
- local day boundary uses user timezone
- reject completion if `completedAtUTC < task.createdAtUTC`
- reject if timestamp drift exceeds `±5 minutes`

---

## Anti-Cheat Logic Engine

### OS Clock Manipulation

- Compare event timestamp to received UTC time
- reject if `|eventReceivedAtUTC - eventTimestampUTC| > 5 minutes`
- reject if completion timestamp is older than task creation timestamp
- reject if completion timestamp is older than the user's last recorded event by more than `5 minutes`

### Task-Spamming

- limit XP-earning completions for `Easy` or lower to `10` within rolling 24h
- additional easy tasks receive penalty `P = 0.2`
- daily easy XP beyond `300` uses `P = 0.6`
- duplicate task creation with identical title/difficulty/duration within 30 minutes applies `P = 0.5`
- repeated identical metadata hashes apply `P = 0.4`
- minimal effort completions on medium/hard tasks reduce quality factor by `0.8`

### Verification Rules

- `CompletionRecord.metadataHash` binds `taskId`, `deviceId`, `completionDuration`, and `lastModifiedAtUTC`
- manual-only source caps XP at `75%`
- sensor-verified or external system completions remove the manual cap

### Core Execution Rules

- `awardXP(...)` executes only when validation passes
- `Task.markCompleted(...)` records authentic completion
- `User.refreshDailyState(...)` resets counters at local midnight
- `UnlockableFeature.checkUnlock(...)` validates level, achievement category, and total XP
