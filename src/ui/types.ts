export type CompletionContext = {
  completedAtUTC: string;
  timezone: string;
  completionDurationMinutes: number;
  quality: 'Poor' | 'Standard' | 'Good' | 'Excellent';
  source: 'Manual' | 'VerifiedSensor' | 'ExternalSystem';
  metadataHash: string;
};

export type DiaryEntryRow = {
  entry_id: string;
  user_id: string;
  created_at: string;
  timezone: string;
  content: string;
  mood: string;
  tags: string | null;
};

export type TaskRow = {
  task_id: string;
  owner_id: string;
  title: string;
  description: string;
  difficulty: number;
  status: string;
  is_verified: number;
};

export type WeeklyReflectionPayload = {
  userId: string;
  timezone: string;
  weekStart: string;
  weekEnd: string;
  diaryEntries: Array<{
    entryId: string;
    createdAt: string;
    content: string;
    mood: string;
    tags: string[];
  }>;
  taskSummaries: Array<{
    taskId: string;
    title: string;
    description: string;
    difficulty: number;
    status: string;
    isVerified: boolean;
  }>;
  anonymizationAudit: {
    scrubbedTerms: string[];
    labelCounts: Record<string, number>;
  };
};
