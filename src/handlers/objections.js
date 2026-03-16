const db = require('../db');
const texts = require('../texts');
const keyboards = require('../keyboards');

module.exports = (bot) => {
  bot.action('obj_expensive', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply(texts.OBJECTION_EXPENSIVE);
  });

  bot.action('obj_cant', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply(texts.OBJECTION_CANT);
  });

  bot.action('obj_not_sure', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply(texts.OBJECTION_NOT_SURE);
  });

  bot.action('obj_book', (ctx) => {
    ctx.answerCbQuery();

    const user = db.getUser(ctx.from.id);
    if (user && user.tariff) {
      // Тариф уже выбран — сразу на оплату
      const checkoutText = user.tariff === 'premium'
        ? texts.CHECKOUT_PREMIUM
        : texts.CHECKOUT_STANDARD;
      db.updateState(ctx.from.id, 'awaiting_payment');
      ctx.reply(checkoutText);
    } else {
      // Тариф не выбран — показать тарифы
      db.setTariffShownAt(ctx.from.id);
      ctx.reply(texts.TARIFFS, keyboards.tariffKeyboard);
    }
  });

  // Остановка напоминаний
  bot.action('stop_reminders', (ctx) => {
    db.stopReminders(ctx.from.id);
    ctx.answerCbQuery();
    ctx.reply('Хорошо, больше не буду напоминать. Если передумаешь — просто напиши /start');
  });
};
