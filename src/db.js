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
    tariff_shown_at TEXT,
    reminded_2h INTEGER DEFAULT 0,
    reminded_24h INTEGER DEFAULT 0,
    reminded_3d INTEGER DEFAULT 0,
    reminded_day_before INTEGER DEFAULT 0,
    do_not_remind INTEGER DEFAULT 0,
    blocked_bot INTEGER DEFAULT 0
  )
`);

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
  close() {
    db.close();
  },
};
