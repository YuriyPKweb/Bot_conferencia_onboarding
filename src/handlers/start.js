const db = require('../db');
const texts = require('../texts');
const keyboards = require('../keyboards');

module.exports = (bot) => {
  bot.start((ctx) => {
    const source = ctx.startPayload || 'direct';
    const { id, username, first_name } = ctx.from;

    db.upsertUser(id, username || '', first_name || '', source);

    ctx.reply(texts.WELCOME, keyboards.segmentKeyboard);
  });
};
