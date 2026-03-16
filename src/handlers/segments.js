const db = require('../db');
const texts = require('../texts');
const keyboards = require('../keyboards');

const segmentTexts = {
  seg_A: texts.SEGMENT_A,
  seg_B: texts.SEGMENT_B,
  seg_C: texts.SEGMENT_C,
  seg_D: texts.SEGMENT_D,
};

module.exports = (bot) => {
  ['seg_A', 'seg_B', 'seg_C', 'seg_D'].forEach((action) => {
    bot.action(action, (ctx) => {
      const segment = action.replace('seg_', '');
      db.updateSegment(ctx.from.id, segment);

      ctx.answerCbQuery();

      const keyboard = segment === 'D'
        ? keyboards.afterSegmentKeyboard_D
        : keyboards.afterSegmentKeyboard_ABC;

      ctx.reply(segmentTexts[action], keyboard);
    });
  });
};
