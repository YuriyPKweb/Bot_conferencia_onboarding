const texts = require('../texts');
const keyboards = require('../keyboards');

module.exports = (bot) => {
  bot.action('show_program', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply(texts.PROGRAM, keyboards.afterProgramKeyboard);
  });
};
