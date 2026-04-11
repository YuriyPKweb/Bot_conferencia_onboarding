const path = require('path');
const { Input } = require('telegraf');
const db = require('../db');
const texts = require('../texts');
const keyboards = require('../keyboards');

module.exports = (bot) => {
  bot.start((ctx) => {
    const source = ctx.startPayload || 'direct';
    const { id, username, first_name } = ctx.from;

    db.upsertUser(id, username || '', first_name || '', source);

    ctx.replyWithPhoto(
      Input.fromLocalFile(path.join(__dirname, '../../image/LOGO_29 mart.jpg')),
      { caption: texts.WELCOME, ...keyboards.segmentKeyboard }
    );
  });
};
