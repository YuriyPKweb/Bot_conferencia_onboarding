const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'bot.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    segment TEXT,
    tariff TEXT,
    paid INTEGER DEFAULT 0,
    state TEXT DEFAULT 'new',
    source TEXT,
    created_at TEXT,
    last_action_at TEXT,
    program_viewed_at TEXT,
    tariff_shown_at TEXT,
    reminded_2h INTEGER DEFAULT 0,
    reminded_24h INTEGER DEFAULT 0,
    reminded_3d INTEGER DEFAULT 0,
    reminded_day_before INTEGER DEFAULT 0,
    do_not_remind INTEGER DEFAULT 0,
    blocked_bot INTEGER DEFAULT 0
  )
`);

// Миграции — безопасное добавление новых колонок
const migrations = [
  'ALTER TABLE users ADD COLUMN program_viewed_at TEXT',
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (e) { /* колонка уже существует */ }
}

const stmts = {
  upsert: db.prepare(`
    INSERT INTO users (user_id, username, first_name, source, state, created_at, last_action_at)
    VALUES (?, ?, ?, ?, 'new', datetime('now'), datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      username = excluded.username,
      first_name = excluded.first_name,
      state = 'new',
      last_action_at = datetime('now')
  `),
  updateSegment: db.prepare(`
    UPDATE users SET segment = ?, state = 'segmented', last_action_at = datetime('now') WHERE user_id = ?
  `),
  updateTariff: db.prepare(`
    UPDATE users SET tariff = ?, state = 'awaiting_payment', last_action_at = datetime('now') WHERE user_id = ?
  `),
  updateState: db.prepare(`
    UPDATE users SET state = ?, last_action_at = datetime('now') WHERE user_id = ?
  `),
  setProgramViewedAt: db.prepare(`
    UPDATE users SET program_viewed_at = datetime('now'), last_action_at = datetime('now') WHERE user_id = ?
  `),
  setTariffShownAt: db.prepare(`
    UPDATE users SET tariff_shown_at = datetime('now'), last_action_at = datetime('now') WHERE user_id = ?
  `),
  markPaid: db.prepare(`
    UPDATE users SET paid = 1, state = 'paid', last_action_at = datetime('now') WHERE user_id = ?
  `),
  markBlocked: db.prepare(`
    UPDATE users SET blocked_bot = 1 WHERE user_id = ?
  `),
  stopReminders: db.prepare(`
    UPDATE users SET do_not_remind = 1 WHERE user_id = ?
  `),
  setReminded2h: db.prepare(`
    UPDATE users SET reminded_2h = 1 WHERE user_id = ?
  `),
  setReminded24h: db.prepare(`
    UPDATE users SET reminded_24h = 1 WHERE user_id = ?
  `),
  setReminded3d: db.prepare(`
    UPDATE users SET reminded_3d = 1 WHERE user_id = ?
  `),
  setRemindedDayBefore: db.prepare(`
    UPDATE users SET reminded_day_before = 1 WHERE user_id = ?
  `),
  getUser: db.prepare(`
    SELECT * FROM users WHERE user_id = ?
  `),
  getUsersForFollowup: db.prepare(`
    SELECT * FROM users
    WHERE paid = 0 AND do_not_remind = 0 AND blocked_bot = 0
      AND tariff_shown_at IS NOT NULL
  `),
  getPaidUsersForReminder: db.prepare(`
    SELECT * FROM users WHERE paid = 1 AND reminded_day_before = 0 AND blocked_bot = 0
  `),
  countPaid: db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE paid = 1
  `),
  countPaidByTariff: db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE paid = 1 AND tariff = ?
  `),

  // --- Статистика ---
  statsTotal: db.prepare(`SELECT COUNT(*) as count FROM users`),
  statsSegmented: db.prepare(`SELECT COUNT(*) as count FROM users WHERE segment IS NOT NULL`),
  statsBySegment: db.prepare(`
    SELECT segment, COUNT(*) as count FROM users
    WHERE segment IS NOT NULL GROUP BY segment ORDER BY count DESC
  `),
  statsProgramViewed: db.prepare(`SELECT COUNT(*) as count FROM users WHERE program_viewed_at IS NOT NULL`),
  statsTariffViewed: db.prepare(`SELECT COUNT(*) as count FROM users WHERE tariff_shown_at IS NOT NULL`),
  statsTariffChosen: db.prepare(`SELECT COUNT(*) as count FROM users WHERE tariff IS NOT NULL`),
  statsTariffChosenByType: db.prepare(`
    SELECT tariff, COUNT(*) as count FROM users
    WHERE tariff IS NOT NULL GROUP BY tariff
  `),
  statsPaidByTariff: db.prepare(`
    SELECT tariff, COUNT(*) as count FROM users
    WHERE paid = 1 GROUP BY tariff
  `),
  statsBlocked: db.prepare(`SELECT COUNT(*) as count FROM users WHERE blocked_bot = 1`),
  statsDoNotRemind: db.prepare(`SELECT COUNT(*) as count FROM users WHERE do_not_remind = 1`),
  statsTodayNew: db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE date(created_at) = date('now')
  `),
  stuckAtTariffs: db.prepare(`
    SELECT user_id, username, first_name, segment, tariff_shown_at, last_action_at
    FROM users
    WHERE tariff_shown_at IS NOT NULL AND tariff IS NULL AND paid = 0
      AND blocked_bot = 0 AND do_not_remind = 0
    ORDER BY tariff_shown_at ASC
  `),
  stuckAtSegment: db.prepare(`
    SELECT user_id, username, first_name, segment, last_action_at
    FROM users
    WHERE segment IS NOT NULL AND program_viewed_at IS NULL AND tariff_shown_at IS NULL
      AND paid = 0 AND blocked_bot = 0 AND do_not_remind = 0
    ORDER BY last_action_at ASC
  `),
  stuckAtTariffChosen: db.prepare(`
    SELECT user_id, username, first_name, segment, tariff, last_action_at
    FROM users
    WHERE tariff IS NOT NULL AND paid = 0
      AND blocked_bot = 0 AND do_not_remind = 0
    ORDER BY last_action_at ASC
  `),
};

module.exports = {
  upsertUser(userId, username, firstName, source) {
    stmts.upsert.run(userId, username, firstName, source);
  },
  updateSegment(userId, segment) {
    stmts.updateSegment.run(segment, userId);
  },
  updateTariff(userId, tariff) {
    stmts.updateTariff.run(tariff, userId);
  },
  updateState(userId, state) {
    stmts.updateState.run(state, userId);
  },
  setProgramViewedAt(userId) {
    stmts.setProgramViewedAt.run(userId);
  },
  setTariffShownAt(userId) {
    stmts.setTariffShownAt.run(userId);
  },
  markPaid(userId) {
    stmts.markPaid.run(userId);
  },
  markBlocked(userId) {
    stmts.markBlocked.run(userId);
  },
  stopReminders(userId) {
    stmts.stopReminders.run(userId);
  },
  setReminded2h(userId) {
    stmts.setReminded2h.run(userId);
  },
  setReminded24h(userId) {
    stmts.setReminded24h.run(userId);
  },
  setReminded3d(userId) {
    stmts.setReminded3d.run(userId);
  },
  setRemindedDayBefore(userId) {
    stmts.setRemindedDayBefore.run(userId);
  },
  getUser(userId) {
    return stmts.getUser.get(userId);
  },
  getUsersForFollowup() {
    return stmts.getUsersForFollowup.all();
  },
  getPaidUsersForReminder() {
    return stmts.getPaidUsersForReminder.all();
  },
  countPaid() {
    return stmts.countPaid.get().count;
  },
  countPaidByTariff(tariff) {
    return stmts.countPaidByTariff.get(tariff).count;
  },
  // --- Статистика ---
  getStats() {
    const total = stmts.statsTotal.get().count;
    const segmented = stmts.statsSegmented.get().count;
    const bySegment = stmts.statsBySegment.all();
    const programViewed = stmts.statsProgramViewed.get().count;
    const tariffViewed = stmts.statsTariffViewed.get().count;
    const tariffChosen = stmts.statsTariffChosen.get().count;
    const tariffChosenByType = stmts.statsTariffChosenByType.all();
    const paid = stmts.countPaid.get().count;
    const paidByTariff = stmts.statsPaidByTariff.all();
    const blocked = stmts.statsBlocked.get().count;
    const doNotRemind = stmts.statsDoNotRemind.get().count;
    const todayNew = stmts.statsTodayNew.get().count;
    return { total, segmented, bySegment, programViewed, tariffViewed, tariffChosen, tariffChosenByType, paid, paidByTariff, blocked, doNotRemind, todayNew };
  },
  getStuckUsers() {
    return {
      atSegment: stmts.stuckAtSegment.all(),
      atTariffs: stmts.stuckAtTariffs.all(),
      atTariffChosen: stmts.stuckAtTariffChosen.all(),
    };
  },
  close() {
    db.close();
  },
};
