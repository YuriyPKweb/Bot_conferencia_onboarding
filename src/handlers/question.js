const db = require('../db');
const texts = require('../texts');
const config = require('../config');

module.exports = (bot) => {
  bot.action('ask_question', (ctx) => {
    db.updateState(ctx.from.id, 'awaiting_question');
    ctx.answerCbQuery();
    ctx.reply(texts.AWAITING_QUESTION);
  });
};

// Обработка текста вопроса — вызывается из index.js
module.exports.handleQuestionMessage = async (ctx) => {
  const user = db.getUser(ctx.from.id);
  if (!user) return false;
  if (user.state !== 'awaiting_question') return false;

  const username = user.username ? `@${user.username}` : user.first_name;
  const questionText = `❓ Вопрос от ${username} (ID: ${ctx.from.id}):\n\n${ctx.message.text}`;

  try {
    await ctx.telegram.sendMessage(config.QUESTIONS_CHAT_ID, questionText);
  } catch (err) {
    console.error('Failed to forward question to admin:', err.message);
  }

  db.updateState(ctx.from.id, 'segmented');
  ctx.reply(texts.QUESTION_RECEIVED);
  return true;
};
