import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type {
  members,
  rulePresets,
  sessions,
  sessionMembers,
  hanchan,
  hanchanScores,
  settlements,
  settlementTransfers,
  ratings,
  operationLogs,
  yakumanRecords,
} from '@/db/schema';

// Select types (read from DB)
export type Member = InferSelectModel<typeof members>;
export type RulePreset = InferSelectModel<typeof rulePresets>;
export type Session = InferSelectModel<typeof sessions>;
export type SessionMember = InferSelectModel<typeof sessionMembers>;
export type Hanchan = InferSelectModel<typeof hanchan>;
export type HanchanScore = InferSelectModel<typeof hanchanScores>;
export type Settlement = InferSelectModel<typeof settlements>;
export type SettlementTransfer = InferSelectModel<typeof settlementTransfers>;
export type Rating = InferSelectModel<typeof ratings>;
export type OperationLog = InferSelectModel<typeof operationLogs>;
export type YakumanRecord = InferSelectModel<typeof yakumanRecords>;

// Insert types (write to DB)
export type NewMember = InferInsertModel<typeof members>;
export type NewRulePreset = InferInsertModel<typeof rulePresets>;
export type NewSession = InferInsertModel<typeof sessions>;
export type NewSessionMember = InferInsertModel<typeof sessionMembers>;
export type NewHanchan = InferInsertModel<typeof hanchan>;
export type NewHanchanScore = InferInsertModel<typeof hanchanScores>;
export type NewSettlement = InferInsertModel<typeof settlements>;
export type NewSettlementTransfer = InferInsertModel<typeof settlementTransfers>;
export type NewRating = InferInsertModel<typeof ratings>;
export type NewOperationLog = InferInsertModel<typeof operationLogs>;
export type NewYakumanRecord = InferInsertModel<typeof yakumanRecords>;

// Score input type (used in UI before saving) - raw score mode
export interface ScoreInput {
  memberId: string;
  rawScore: number;
  chips?: number;
}

// Point input type (used in point input mode)
export interface PointInput {
  memberId: string;
  point: number;
  isAutoCalculated: boolean;
  chips?: number;
}

// Settlement transfer result
export interface TransferInstruction {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amount: number;
}

// Session with members for display
export interface SessionWithMembers extends Session {
  members: (SessionMember & { member: Member })[];
}

// Hanchan with scores for display
export interface HanchanWithScores extends Hanchan {
  scores: (HanchanScore & { member: Member })[];
}
