const db = require('../db');
const texts = require('../texts');
const keyboards = require('../keyboards');
const config = require('../config');

module.exports = (bot) => {
  // Выбор тарифа Standard
  bot.action('buy_standard', (ctx) => {
    db.updateTariff(ctx.from.id, 'standard');
    ctx.answerCbQuery();
    ctx.reply(texts.CHECKOUT_STANDARD);
  });

  // Выбор тарифа Premium
  bot.action('buy_premium', (ctx) => {
    db.updateTariff(ctx.from.id, 'premium');
    ctx.answerCbQuery();
    ctx.reply(texts.CHECKOUT_PREMIUM);
  });

  // Подтверждение оплаты админом
  bot.action(/^confirm_payment_(\d+)$/, async (ctx) => {
    const userId = parseInt(ctx.match[1], 10);
    db.markPaid(userId);
    ctx.answerCbQuery('Оплата подтверждена');

    try {
      await ctx.telegram.sendMessage(userId, texts.POST_PURCHASE);
    } catch (err) {
      if (err.response && err.response.error_code === 403) {
        db.markBlocked(userId);
      }
    }

    // Обновить сообщение админа
    ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    ctx.reply(`✅ Оплата пользователя ${userId} подтверждена`);
  });

  // Отклонение оплаты админом
  bot.action(/^reject_payment_(\d+)$/, async (ctx) => {
    const userId = parseInt(ctx.match[1], 10);
    ctx.answerCbQuery('Оплата отклонена');

    try {
      await ctx.telegram.sendMessage(userId, texts.PAYMENT_REJECTED);
    } catch (err) {
      if (err.response && err.response.error_code === 403) {
        db.markBlocked(userId);
      }
    }

    ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    ctx.reply(`❌ Оплата пользователя ${userId} отклонена`);
  });
};

// Обработка текста "оплатил" и фото — вызывается из index.js
module.exports.handlePaymentMessage = async (ctx) => {
  const user = db.getUser(ctx.from.id);
  if (!user) return false;
  if (user.state !== 'awaiting_payment') return false;

  const isPhoto = ctx.message.photo && ctx.message.photo.length > 0;
  const isPaymentText = ctx.message.text &&
    ctx.message.text.toLowerCase().includes('оплатил');

  if (!isPhoto && !isPaymentText) return false;

  const tariffLabel = user.tariff === 'premium' ? 'Premium' : 'Standard';
  const username = user.username ? `@${user.username}` : user.first_name;
  const caption = `💳 Пользователь ${username} (ID: ${ctx.from.id}) заявляет об оплате тарифа ${tariffLabel}`;

  for (const adminId of config.ADMIN_CHAT_IDS) {
    try {
      if (isPhoto) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        await ctx.telegram.sendPhoto(adminId, photo.file_id, {
          caption,
          ...keyboards.adminConfirmKeyboard(ctx.from.id),
        });
      } else {
        await ctx.telegram.sendMessage(adminId, caption,
          keyboards.adminConfirmKeyboard(ctx.from.id)
        );
      }
    } catch (err) {
      console.error(`Failed to forward payment to admin ${adminId}:`, err.message);
    }
  }

  ctx.reply(texts.PAYMENT_FORWARDED);
  return true;
};
