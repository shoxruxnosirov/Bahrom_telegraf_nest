// import { Update, Ctx, Command, Action } from 'nestjs-telegraf';
// import { Context } from 'telegraf';

// @Update()
// export class BotUpdate {
//   // Bu yerda biz rasm yuboramiz
//   @Command('send')
//   async sendPhoto(@Ctx() ctx: Context) {
//     const sentMessage = await ctx.replyWithPhoto(
//       { url: 'https://picsum.photos/400/300' },
//       {
//         caption: 'Bu birinchi rasm 🖼️',
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: '✏️ Tahrirlash', callback_data: 'edit_photo' }],
//           ],
//         },
//       },
//     );

//     // sentMessage.message_id — keyinchalik o‘sha xabarni tahrirlash uchun kerak
//     console.log('Yuborilgan xabar ID:', sentMessage.message_id);
//   }

//   // Inline tugma bosilganda
//   @Action('edit_photo')
//   async onEditPhoto(@Ctx() ctx: Context) {
//     // Biz edit qilayotgan xabar shu callbackga sabab bo‘lgan xabar
//     const chatId = ctx.callbackQuery.message.chat.id;
//     const messageId = ctx.callbackQuery.message.message_id;

//     await ctx.telegram.editMessageMedia(
//       chatId,
//       messageId,
//       undefined, // inline message id (callback orqali emas)
//       {
//         type: 'photo',
//         media: 'https://picsum.photos/400/301',
//         caption: 'Rasm tahrirlandi ✅',
//       },
//       {
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: '◀️ Orqaga', callback_data: 'back_photo' }],
//           ],
//         },
//       },
//     );

//     await ctx.answerCbQuery('Rasm yangilandi ✅');
//   }

//   @Action('back_photo')
//   async onBackPhoto(@Ctx() ctx: Context) {
//     const chatId = ctx.callbackQuery.message.chat.id;
//     const messageId = ctx.callbackQuery.message.message_id;

//     await ctx.telegram.editMessageMedia(
//       chatId,
//       messageId,
//       undefined,
//       {
//         type: 'photo',
//         media: 'https://picsum.photos/400/300',
//         caption: 'Oldingi rasmga qaytdik 🔙',
//       },
//       {
//         reply_markup: {
//           inline_keyboard: [
//             [{ text: '✏️ Tahrirlash', callback_data: 'edit_photo' }],
//           ],
//         },
//       },
//     );

//     await ctx.answerCbQuery('Orqaga qaytdingiz 🔙');
//   }
// }
