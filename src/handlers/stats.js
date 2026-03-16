const db = require('../db');
const config = require('../config');

const segmentEmojis = { A: '🚀', B: '💡', C: '🎯', D: '👀' };

function pct(part, total) {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

function formatStats() {
  const s = db.getStats();
  const now = new Date().toLocaleDateString('ru-RU');

  const segmentLines = s.bySegment
    .map(r => `  ${segmentEmojis[r.segment] || '•'} ${r.segment}: ${r.count}`)
    .join('\n');

  const chosenLines = s.tariffChosenByType
    .map(r => `  ${r.tariff === 'premium' ? 'Premium' : 'Standard'}: ${r.count}`)
    .join('\n');

  const paidLines = s.paidByTariff
    .map(r => `  ${r.tariff === 'premium' ? 'Premium' : 'Standard'}: ${r.count}`)
    .join('\n');

  // Выручка
  const paidStandard = s.paidByTariff.find(r => r.tariff === 'standard');
  const paidPremium = s.paidByTariff.find(r => r.tariff === 'premium');
  const revenue = (paidStandard ? paidStandard.count * 4990 : 0)
    + (paidPremium ? paidPremium.count * 6790 : 0);

  // Самая большая потеря
  const steps = [
    { name: '/start → сегмент', from: s.total, to: s.segmented },
    { name: 'сегмент → программа', from: s.segmented, to: s.programViewed },
    { name: 'сегмент → тарифы', from: s.segmented, to: s.tariffViewed },
    { name: 'тарифы → выбор', from: s.tariffViewed, to: s.tariffChosen },
    { name: 'выбор → оплата', from: s.tariffChosen, to: s.paid },
  ];

  let worstStep = null;
  let worstDrop = 0;
  for (const step of steps) {
    if (step.from > 0) {
      const drop = step.from - step.to;
      if (drop > worstDrop) {
        worstDrop = drop;
        worstStep = step;
      }
    }
  }

  let worstLine = '';
  if (worstStep) {
    const dropPct = pct(worstDrop, worstStep.from);
    worstLine = `\n📉 Главная потеря: ${worstStep.name} (${dropPct} уходят, ${worstDrop} чел.)`;
  }

  return `📊 Воронка на ${now}

Новых сегодня:         ${s.todayNew}

━━━━━━━━━━━━━━━━━━━━

Всего /start:          ${s.total}
Выбрали сегмент:       ${s.segmented} (${pct(s.segmented, s.total)})
${segmentLines}
Смотрели программу:    ${s.programViewed} (${pct(s.programViewed, s.segmented)})
Смотрели тарифы:       ${s.tariffViewed} (${pct(s.tariffViewed, s.segmented)})
Выбрали тариф:         ${s.tariffChosen} (${pct(s.tariffChosen, s.tariffViewed)})
${chosenLines}
Оплатили:              ${s.paid} (${pct(s.paid, s.tariffChosen)})
${paidLines}

━━━━━━━━━━━━━━━━━━━━

💰 Выручка: ~${revenue.toLocaleString('ru-RU')} ₽
🚫 Заблокировали бота: ${s.blocked}
🔕 Отказались от напоминаний: ${s.doNotRemind}${worstLine}`;
}

function formatUserLine(u) {
  const name = u.username ? `@${u.username}` : (u.first_name || `ID:${u.user_id}`);
  const seg = u.segment ? ` · сегмент ${segmentEmojis[u.segment] || u.segment}` : '';
  const tariff = u.tariff ? ` · ${u.tariff}` : '';
  const lastAction = u.last_action_at || u.tariff_shown_at || '';
  const ago = lastAction ? formatAgo(lastAction) : '?';
  return `${name}${seg}${tariff} · ${ago} назад`;
}

function formatAgo(dateStr) {
  const ms = Date.now() - new Date(dateStr + 'Z').getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return '<1ч';
  if (hours < 24) return `${hours}ч`;
  const days = Math.floor(hours / 24);
  return `${days}д`;
}

function formatStuck() {
  const stuck = db.getStuckUsers();

  let text = '⏳ Застрявшие пользователи\n';

  if (stuck.atTariffChosen.length > 0) {
    text += `\n━━ Выбрали тариф, не оплатили (${stuck.atTariffChosen.length}) ━━\n`;
    text += stuck.atTariffChosen.slice(0, 15).map((u, i) => `${i + 1}. ${formatUserLine(u)}`).join('\n');
  }

  if (stuck.atTariffs.length > 0) {
    text += `\n\n━━ Смотрели тарифы, не выбрали (${stuck.atTariffs.length}) ━━\n`;
    text += stuck.atTariffs.slice(0, 15).map((u, i) => `${i + 1}. ${formatUserLine(u)}`).join('\n');
  }

  if (stuck.atSegment.length > 0) {
    text += `\n\n━━ Выбрали сегмент, дальше не пошли (${stuck.atSegment.length}) ━━\n`;
    text += stuck.atSegment.slice(0, 15).map((u, i) => `${i + 1}. ${formatUserLine(u)}`).join('\n');
  }

  if (stuck.atTariffChosen.length === 0 && stuck.atTariffs.length === 0 && stuck.atSegment.length === 0) {
    text += '\nВсе движутся по воронке 👍';
  }

  return text;
}

function isStatsAdmin(userId) {
  return String(userId) === config.STATS_CHAT_ID;
}

module.exports = (bot) => {
  bot.command('stats', (ctx) => {
    if (!isStatsAdmin(ctx.from.id)) return;
    ctx.reply(formatStats());
  });

  bot.command('stuck', (ctx) => {
    if (!isStatsAdmin(ctx.from.id)) return;
    ctx.reply(formatStuck());
  });
};

module.exports.formatStats = formatStats;
