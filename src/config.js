require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  ADMIN_CHAT_IDS: (process.env.ADMIN_CHAT_ID || '').split(',').map(id => id.trim()).filter(Boolean),
  QUESTIONS_CHAT_ID: process.env.QUESTIONS_CHAT_ID,
  STATS_CHAT_ID: process.env.STATS_CHAT_ID,
  PAYMENT_URL_STANDARD: process.env.PAYMENT_URL_STANDARD,
  PAYMENT_URL_PREMIUM: process.env.PAYMENT_URL_PREMIUM,
  CHANNEL_URL: process.env.CHANNEL_URL || 'https://t.me/predprinimatel_46',
  TOTAL_SEATS: parseInt(process.env.TOTAL_SEATS, 10) || 150,
  TOTAL_PREMIUM: parseInt(process.env.TOTAL_PREMIUM, 10) || 30,
};
