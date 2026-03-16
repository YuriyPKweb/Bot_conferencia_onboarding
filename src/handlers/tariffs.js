const db = require('../db');
const texts = require('../texts');
const keyboards = require('../keyboards');

module.exports = (bot) => {
  bot.action('show_tariffs', (ctx) => {
    db.setTariffShownAt(ctx.from.id);
    ctx.answerCbQuery();
    ctx.reply(texts.TARIFFS, keyboards.tariffKeyboard);
  });
};
