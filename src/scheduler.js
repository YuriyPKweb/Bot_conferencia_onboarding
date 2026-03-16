const cron = require('node-cron');
const db = require('./db');
const texts = require('./texts');
const keyboards = require('./keyboards');
const config = require('./config');

function startScheduler(bot) {
  // Каждые 30 минут
  const job = cron.schedule('*/30 * * * *', async () => {
    console.log('[scheduler] Running followup check...');

    // --- Дожим для неоплативших ---
    const users = db.getUsersForFollowup();

    for (const user of users) {
      try {
        const referenceTime = user.tariff_shown_at || user.last_action_at;
        if (!referenceTime) continue;

        const refMs = new Date(referenceTime + 'Z').getTime();
        const now = Date.now();
        const hoursPassed = (now - refMs) / (1000 * 60 * 60);

        // Дожим через 2 часа
        if (hoursPassed >= 2 && !user.reminded_2h) {
          await bot.telegram.sendMessage(
            user.user_id,
            texts.FOLLOWUP_2H,
            keyboards.followup2hKeyboard
          );
          db.setReminded2h(user.user_id);
          continue; // Не отправлять несколько дожимов за раз
        }

        // Дожим через 24 часа
        if (hoursPassed >= 24 && !user.reminded_24h) {
          const seatsLeft = config.TOTAL_SEATS - db.countPaid();
          const premiumLeft = config.TOTAL_PREMIUM - db.countPaidByTariff('premium');
          await bot.telegram.sendMessage(
            user.user_id,
            texts.FOLLOWUP_24H(seatsLeft, premiumLeft),
            keyboards.followup24hKeyboard
          );
          db.setReminded24h(user.user_id);
          continue;
        }

        // Дожим за 3 дня (26 марта)
        const today = new Date().toISOString().slice(0, 10);
        if (today === '2026-03-26' && !user.reminded_3d) {
          await bot.telegram.sendMessage(
            user.user_id,
            texts.FOLLOWUP_3D,
            keyboards.objectionKeyboard
          );
          db.setReminded3d(user.user_id);
        }
      } catch (err) {
        if (err.response && err.response.error_code === 403) {
          db.markBlocked(user.user_id);
          console.log(`[scheduler] User ${user.user_id} blocked the bot`);
        } else {
          console.error(`[scheduler] Error for user ${user.user_id}:`, err.message);
        }
      }
    }

    // --- Напоминание оплатившим за день (28 марта) ---
    const today = new Date().toISOString().slice(0, 10);
    if (today === '2026-03-28') {
      const paidUsers = db.getPaidUsersForReminder();
      for (const user of paidUsers) {
        try {
          await bot.telegram.sendMessage(user.user_id, texts.REMINDER_DAY_BEFORE);
          db.setRemindedDayBefore(user.user_id);
        } catch (err) {
          if (err.response && err.response.error_code === 403) {
            db.markBlocked(user.user_id);
          } else {
            console.error(`[scheduler] Reminder error for user ${user.user_id}:`, err.message);
          }
        }
      }
    }

    console.log('[scheduler] Done.');
  });

  return job;
}

module.exports = { startScheduler };
