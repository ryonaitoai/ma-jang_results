import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ─── Members ─────────────────────────────────────────
export const members = sqliteTable('members', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  avatarEmoji: text('avatar_emoji').notNull().default('🀄'),
  createdAt: text('created_at').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  memo: text('memo'),
});

export const membersRelations = relations(members, ({ many }) => ({
  sessionMembers: many(sessionMembers),
  hanchanScores: many(hanchanScores),
  settlements: many(settlements),
  ratings: many(ratings),
  yakumanRecords: many(yakumanRecords),
}));

// ─── Rule Presets ────────────────────────────────────
export const rulePresets = sqliteTable('rule_presets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  startingPoints: integer('starting_points').notNull().default(25000),
  returnPoints: integer('return_points').notNull().default(30000),
  umaFirst: integer('uma_first').notNull().default(30),
  umaSecond: integer('uma_second').notNull().default(10),
  umaThird: integer('uma_third').notNull().default(-10),
  umaFourth: integer('uma_fourth').notNull().default(-30),
  chipEnabled: integer('chip_enabled', { mode: 'boolean' }).notNull().default(false),
  chipValue: integer('chip_value').default(100),
  rate: text('rate').default('点ピン'),
  rateValue: integer('rate_value').default(100),
  createdAt: text('created_at').notNull(),
});

export const rulePresetsRelations = relations(rulePresets, ({ many }) => ({
  sessions: many(sessions),
}));

// ─── Sessions ────────────────────────────────────────
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  rulePresetId: text('rule_preset_id').references(() => rulePresets.id),
  status: text('status', { enum: ['active', 'settled', 'cancelled'] }).notNull().default('active'),
  // Inline rule snapshot (so changes to preset don't affect past sessions)
  startingPoints: integer('starting_points').notNull().default(25000),
  returnPoints: integer('return_points').notNull().default(30000),
  umaFirst: integer('uma_first').notNull().default(30),
  umaSecond: integer('uma_second').notNull().default(10),
  umaThird: integer('uma_third').notNull().default(-10),
  umaFourth: integer('uma_fourth').notNull().default(-30),
  chipEnabled: integer('chip_enabled', { mode: 'boolean' }).notNull().default(false),
  chipValue: integer('chip_value').default(100),
  rate: text('rate').default('点ピン'),
  rateValue: integer('rate_value').default(100),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  memo: text('memo'),
  createdAt: text('created_at').notNull(),
});

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  rulePreset: one(rulePresets, {
    fields: [sessions.rulePresetId],
    references: [rulePresets.id],
  }),
  sessionMembers: many(sessionMembers),
  hanchan: many(hanchan),
  settlements: many(settlements),
  settlementTransfers: many(settlementTransfers),
  operationLogs: many(operationLogs),
}));

// ─── Session Members ─────────────────────────────────
export const sessionMembers = sqliteTable('session_members', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  memberId: text('member_id').notNull().references(() => members.id),
  seatOrder: integer('seat_order').notNull(),
});

export const sessionMembersRelations = relations(sessionMembers, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionMembers.sessionId],
    references: [sessions.id],
  }),
  member: one(members, {
    fields: [sessionMembers.memberId],
    references: [members.id],
  }),
}));

// ─── Hanchan (半荘) ──────────────────────────────────
export const hanchan = sqliteTable('hanchan', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  hanchanNumber: integer('hanchan_number').notNull(),
  topMemberId: text('top_member_id').references(() => members.id),
  startedAt: text('started_at'),
  endedAt: text('ended_at'),
  isVoid: integer('is_void', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
});

export const hanchanRelations = relations(hanchan, ({ one, many }) => ({
  session: one(sessions, {
    fields: [hanchan.sessionId],
    references: [sessions.id],
  }),
  scores: many(hanchanScores),
  yakumanRecords: many(yakumanRecords),
  ratings: many(ratings),
}));

// ─── Hanchan Scores ──────────────────────────────────
export const hanchanScores = sqliteTable('hanchan_scores', {
  id: text('id').primaryKey(),
  hanchanId: text('hanchan_id').notNull().references(() => hanchan.id),
  memberId: text('member_id').notNull().references(() => members.id),
  rawScore: integer('raw_score'), // nullable for point input mode
  rank: integer('rank').notNull(),
  point: real('point').notNull(), // final point (uma+oka included or directly entered)
  umaPoint: real('uma_point'), // kept for backward compat, same as point
  inputMode: text('input_mode', { enum: ['point', 'raw_score'] }).notNull().default('point'),
  isAutoCalculated: integer('is_auto_calculated', { mode: 'boolean' }).notNull().default(false),
  chips: integer('chips'),
  createdAt: text('created_at').notNull(),
});

export const hanchanScoresRelations = relations(hanchanScores, ({ one }) => ({
  hanchan: one(hanchan, {
    fields: [hanchanScores.hanchanId],
    references: [hanchan.id],
  }),
  member: one(members, {
    fields: [hanchanScores.memberId],
    references: [members.id],
  }),
}));

// ─── Settlements (清算) ──────────────────────────────
export const settlements = sqliteTable('settlements', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  memberId: text('member_id').notNull().references(() => members.id),
  totalPoint: real('total_point').notNull(),
  totalChips: integer('total_chips').notNull().default(0),
  totalAmount: integer('total_amount').notNull(),
  createdAt: text('created_at').notNull(),
});

export const settlementsRelations = relations(settlements, ({ one }) => ({
  session: one(sessions, {
    fields: [settlements.sessionId],
    references: [sessions.id],
  }),
  member: one(members, {
    fields: [settlements.memberId],
    references: [members.id],
  }),
}));

// ─── Settlement Transfers (送金指示) ─────────────────
export const settlementTransfers = sqliteTable('settlement_transfers', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  fromMemberId: text('from_member_id').notNull().references(() => members.id),
  toMemberId: text('to_member_id').notNull().references(() => members.id),
  amount: integer('amount').notNull(),
  createdAt: text('created_at').notNull(),
});

export const settlementTransfersRelations = relations(settlementTransfers, ({ one }) => ({
  session: one(sessions, {
    fields: [settlementTransfers.sessionId],
    references: [sessions.id],
  }),
  fromMember: one(members, {
    fields: [settlementTransfers.fromMemberId],
    references: [members.id],
  }),
  toMember: one(members, {
    fields: [settlementTransfers.toMemberId],
    references: [members.id],
  }),
}));

// ─── Ratings ─────────────────────────────────────────
export const ratings = sqliteTable('ratings', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id),
  hanchanId: text('hanchan_id').references(() => hanchan.id),
  rating: real('rating').notNull().default(1500),
  ratingDeviation: real('rating_deviation').notNull().default(350),
  volatility: real('volatility').notNull().default(0.06),
  calculatedAt: text('calculated_at').notNull(),
  createdAt: text('created_at').notNull(),
});

export const ratingsRelations = relations(ratings, ({ one }) => ({
  member: one(members, {
    fields: [ratings.memberId],
    references: [members.id],
  }),
  hanchan: one(hanchan, {
    fields: [ratings.hanchanId],
    references: [hanchan.id],
  }),
}));

// ─── Operation Logs (操作ログ) ───────────────────────
export const operationLogs = sqliteTable('operation_logs', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  operationType: text('operation_type', {
    enum: ['create_hanchan', 'update_score', 'delete_hanchan', 'settle'],
  }).notNull(),
  payload: text('payload').notNull(), // JSON string
  createdAt: text('created_at').notNull(),
  clientTimestamp: text('client_timestamp'),
});

export const operationLogsRelations = relations(operationLogs, ({ one }) => ({
  session: one(sessions, {
    fields: [operationLogs.sessionId],
    references: [sessions.id],
  }),
}));

// ─── Yakuman Records (役満記録) ──────────────────────
export const yakumanRecords = sqliteTable('yakuman_records', {
  id: text('id').primaryKey(),
  hanchanId: text('hanchan_id').notNull().references(() => hanchan.id),
  memberId: text('member_id').notNull().references(() => members.id),
  yakumanType: text('yakuman_type').notNull(),
  memo: text('memo'),
  createdAt: text('created_at').notNull(),
});

export const yakumanRecordsRelations = relations(yakumanRecords, ({ one }) => ({
  hanchan: one(hanchan, {
    fields: [yakumanRecords.hanchanId],
    references: [hanchan.id],
  }),
  member: one(members, {
    fields: [yakumanRecords.memberId],
    references: [members.id],
  }),
}));
