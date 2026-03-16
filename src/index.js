const { Telegraf } = require('telegraf');
const config = require('./config');
const db = require('./db');
const texts = require('./texts');
const { startScheduler } = require('./scheduler');

// Handlers
const startHandler = require('./handlers/start');
const segmentsHandler = require('./handlers/segments');
const programHandler = require('./handlers/program');
const tariffsHandler = require('./handlers/tariffs');
const checkoutHandler = require('./handlers/checkout');
const { handlePaymentMessage } = require('./handlers/checkout');
const objectionsHandler = require('./handlers/objections');
const questionHandler = require('./handlers/question');
const { handleQuestionMessage } = require('./handlers/question');
const statsHandler = require('./handlers/stats');

if (!config.BOT_TOKEN) {
  console.error('BOT_TOKEN not set in .env');
  process.exit(1);
}

const bot = new Telegraf(config.BOT_TOKEN);

// Регистрация обработчиков callback-кнопок
startHandler(bot);
segmentsHandler(bot);
programHandler(bot);
tariffsHandler(bot);
checkoutHandler(bot);
objectionsHandler(bot);
questionHandler(bot);
statsHandler(bot);

// Обработка текстовых сообщений — с приоритетом по state
bot.on('text', async (ctx) => {
  // 1. Если ждём вопрос — перехватываем первым
  const questionHandled = await handleQuestionMessage(ctx);
  if (questionHandled) return;

  // 2. Если ждём подтверждение оплаты
  const paymentHandled = await handlePaymentMessage(ctx);
  if (paymentHandled) return;

  // 3. Всё остальное
  ctx.reply(texts.UNKNOWN_INPUT);
});

// Обработка фото (скриншот оплаты)
bot.on('photo', async (ctx) => {
  const paymentHandled = await handlePaymentMessage(ctx);
  if (paymentHandled) return;

  ctx.reply(texts.UNKNOWN_INPUT);
});

// Запуск scheduler
const { followupJob, dailyStatsJob } = startScheduler(bot);

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n[${signal}] Shutting down...`);
  followupJob.stop();
  dailyStatsJob.stop();
  bot.stop(signal);
  db.close();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Запуск polling
bot.launch()
  .then(() => console.log('Bot started in polling mode'))
  .catch((err) => {
    console.error('Failed to start bot:', err.message);
    process.exit(1);
  });
