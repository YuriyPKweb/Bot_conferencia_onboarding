const { Markup } = require('telegraf');
const config = require('./config');

module.exports = {
  segmentKeyboard: Markup.inlineKeyboard([
    [Markup.button.callback('🚀 Я уже веду бизнес', 'seg_A')],
    [Markup.button.callback('💡 Планирую запустить', 'seg_B')],
    [Markup.button.callback('🎯 Руководитель / топ-менеджер', 'seg_C')],
    [Markup.button.callback('👀 Просто интересно', 'seg_D')],
  ]),

  afterSegmentKeyboard_ABC: Markup.inlineKeyboard([
    [Markup.button.callback('📋 Хочу полную программу', 'show_program')],
    [Markup.button.callback('💰 Сколько стоит?', 'show_tariffs')],
  ]),

  afterSegmentKeyboard_D: Markup.inlineKeyboard([
    [Markup.button.callback('📋 Посмотреть программу', 'show_program')],
    [Markup.button.callback('💰 Узнать стоимость', 'show_tariffs')],
  ]),

  afterProgramKeyboard: Markup.inlineKeyboard([
    [Markup.button.callback('💰 Сколько стоит?', 'show_tariffs')],
    [Markup.button.url('📢 Подписаться на канал', config.CHANNEL_URL)],
  ]),

  tariffKeyboard: Markup.inlineKeyboard([
    [Markup.button.callback('✅ Хочу Standard — 4 990 ₽', 'buy_standard')],
    [Markup.button.callback('✅ Хочу Premium — 6 790 ₽', 'buy_premium')],
    [Markup.button.url('📢 Канал конференции', config.CHANNEL_URL)],
    [Markup.button.callback('🤔 Есть вопрос', 'ask_question')],
  ]),

  followup2hKeyboard: Markup.inlineKeyboard([
    [Markup.button.callback('📋 Посмотреть тарифы', 'show_tariffs')],
  ]),

  followup24hKeyboard: Markup.inlineKeyboard([
    [Markup.button.callback('Забронировать', 'show_tariffs')],
    [Markup.button.callback('Не напоминай', 'stop_reminders')],
  ]),

  objectionKeyboard: Markup.inlineKeyboard([
    [Markup.button.callback('Дорого — есть скидка?', 'obj_expensive')],
    [Markup.button.callback('Не могу 29-го', 'obj_cant')],
    [Markup.button.callback('Не уверен, что мне нужно', 'obj_not_sure')],
    [Markup.button.callback('Ладно, бронирую', 'obj_book')],
  ]),

  adminConfirmKeyboard(userId) {
    return Markup.inlineKeyboard([
      [Markup.button.callback('✅ Подтвердить оплату', `confirm_payment_${userId}`)],
      [Markup.button.callback('❌ Отклонить', `reject_payment_${userId}`)],
    ]);
  },
};
