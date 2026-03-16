const db = require('../db');
const texts = require('../texts');
const keyboards = require('../keyboards');

module.exports = (bot) => {
  bot.action('show_program', (ctx) => {
    db.setProgramViewedAt(ctx.from.id);
    ctx.answerCbQuery();
    ctx.reply(texts.PROGRAM, keyboards.afterProgramKeyboard);
  });
};
