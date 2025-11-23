import { Update, Start, Ctx, On, Command, Action, Message } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';
import { Criterion, Role } from 'src/comman/types';
import { ProductTypeService } from '../product-types/product-type.service';
import { ProductService } from '../products/product.service';
import { ProductBrandService } from '../product-brend/product-brend.sevice';

const manageAdmin = [
    Markup.button.callback('add admin', 'addAdmin'),
    Markup.button.callback('remove admin', 'removeAdmin'),
];


const adminPanel = [
    Markup.button.callback('maxsulot turlari', 'productTypes')
];

const adminAction = new Map();
const userAction = new Map();
const baskets = new Map();
const basketsTemp = new Map();
const messageId_chatId = new Map();
type AdminOrUser = {
    chatId: number,
    adminOrUser: AdminOrUser | null,
    messageId?: number,
    name: string;
}
const adminsendMessageUser = new Map<number, AdminOrUser>();

let isworkTime = true;
let reasonOfPause = '';

// const rurnWorkTime = [
//     Markup.button.callback('ishlashni boshlash', 'markWorkingTime'),
//     Markup.button.callback('ishlashni to\'xtatish', 'markNotWorkingTime'),
// ];

@Update()
export class BotUpdate {
    constructor(
        private readonly userService: UserService,
        private readonly productTypeService: ProductTypeService,
        private readonly productService: ProductService,
        private readonly productBrandService: ProductBrandService
    ) { }

    @Start()
    async start(@Ctx() ctx: Context) {
        console.log('ctx: ', ctx);
        if (!ctx.from) return ctx.reply('Xatolik: foydalanuvchi aniqlanmadi.');

        const chatId = ctx.chat?.id;
        if (!chatId) {
            await ctx.reply('❌ Chat aniqlanmadi.');
            return;
        }

        const username = ctx.from?.username || null;
        const name = ctx.from?.first_name || 'Foydalanuvchi';
        const phone = null;

        const user = await this.userService.createOrUpdate({ chatId, username, name, phone });

        if (user.role !== 'user') {
            await ctx.telegram.sendPhoto(
                chatId,
                'AgACAgIAAxkBAAMVaSCfPYB3syH4lR-3vyAIZ1bEez0AAjIQaxuawQhJvFUkwxgL5HoBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAMcaOD_qPNZStYzYagYsKOuRyrkfGEAAon6MRsNbglL1Tu3OUInRkEBAAMCAAN4AAM2BA',
                {
                    caption: "adminlar qo'shing yoki o'chiring",
                    parse_mode: 'HTML',
                    reply_markup: Markup.inlineKeyboard(menu_admin_inline_keybord(user)).reply_markup
                },
            )
        } else {

            await clearChat(chatId, ctx);

            const basket = baskets.get(chatId);
            let message;
            if (basket && basket.length > 0) {

                let priceAll = 0;

                const chunkSize = 10;

                for (let i = 0; i < basket.length; i += chunkSize) {
                    const chunk = basket.slice(i, i + chunkSize); // har 10 tadan bo‘lib olamiz


                    const mediaGroup = chunk.map(p => {

                        priceAll += p.product.price * p.amount;
                        let criterion = '';

                        if (p.product.criterion === Criterion.dona) {
                            criterion = 'Soni';
                        } else if (p.product.criterion === Criterion.kg) {
                            criterion = 'Kg';
                        } else if (p.product.criterion === Criterion.l) {
                            criterion = 'L';
                        }

                        return {
                            type: 'photo',
                            media: p.product.photo,
                            caption: `\n<b>${p.product.name}</b>\nNarxi: ${p.product.price} so'm\n${criterion}: ${p.product.criterion !== Criterion.dona ? p.amount.toFixed(2) : p.amount}\nUmumiy: ${(p.product.price * p.amount).toFixed(2)} so'm`,
                            parse_mode: 'HTML',
                        }
                    });

                    try {
                        const messages = await ctx.replyWithMediaGroup(mediaGroup);

                        // Har bir mahsulotga message_id ni biriktiramiz
                        messages.forEach((msg, j) => {
                            chunk[j].message_id = msg.message_id;
                        });

                    } catch (err) {
                        console.error('MediaGroup xatosi:', err);
                        // Xatoni foydalanuvchiga yuborishingiz mumkin:
                        await ctx.reply('Rasmlarni yuborishda xatolik yuz berdi. Iltimos, keyinroq urinib ko‘ring.');
                    }
                }

                const buttons = [
                    [Markup.button.callback('🛍️🛒𝑿𝒂𝒓𝒊𝒅𝒍𝒂𝒓𝒏𝒊 𝑩𝒆𝒌𝒐𝒓 𝑸𝒊𝒍𝒊𝒔𝒉❌', `userProductsDeleteButton`)],

                    [
                        Markup.button.callback('🛒 𝙔𝙖𝙣𝙖 𝙢𝙖𝙭𝙨𝙪𝙡𝙤𝙩 𝙤𝙡𝙞𝙨𝙝', `userStart`),
                    ]

                ]
                if (priceAll >= 40000) {
                    buttons.push(
                        [
                            Markup.button.callback('🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛', `userProductsBuyGetContact`)
                        ]
                    )
                }

                message = await ctx.replyWithPhoto(
                    'AgACAgIAAxkBAAMQaSCeX8O-C7VDELEkGyuGEuk-EtoAAigQaxuawQhJKrUz_ZtgebsBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ', // bu yerda product.photoFileId — bu oldin saqlangan file_id
                    {
                        caption: basket.map(p => `\n<b>${p.product.name}</b>\n ${p.product.price} ${p.product.criterion} / so'm\n${p.product.criterion === Criterion.kg ? `Kgmi: ${p.amount.toFixed(2)}` : p.product.criterion === Criterion.dona ? `Soni: ${p.amount}` : `Litri: ${p.amount}`}\nUmumiy: ${(p.product.price * p.amount).toFixed(2)} so'm`).join('\n') + `\n\n hozirda umumiy xarid narxi ${priceAll.toFixed(2)} so'm ${priceAll < 40_000 ? `\n eng kamida 40 000 so\'mlik maxsulotlar olinsa buyutrmani tasdiqlash imkoni ochiladi iltimos yana ${40000 - priceAll} so'mlik haxsulot qo'shing` : ''}`,
                        parse_mode: 'HTML',
                        reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
                    }
                );

            } else {
                message = await ctx.replyWithPhoto(
                    'AgACAgIAAxkBAAMQaSCeX8O-C7VDELEkGyuGEuk-EtoAAigQaxuawQhJKrUz_ZtgebsBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ', // bu yerda product.photoFileId — bu oldin saqlangan file_id
                    {
                        caption: '𝑺𝑨𝑽𝑨𝑻🛒',
                        parse_mode: 'HTML',
                        reply_markup: Markup.inlineKeyboard([
                            [
                                Markup.button.callback('𝐗𝐀𝐑𝐈𝐃𝐋𝐀𝐑𝐍𝐈 𝐁𝐎𝐒𝐇𝐋𝐀𝐒𝐇🛍️', `userStart`),
                            ]
                        ]).reply_markup,
                    }
                );
            }

            messageId_chatId.set(chatId, message.message_id);

            // const productType = await this.productTypeService.findAll();
            // const buttons = productType.map(pT => [
            //     Markup.button.callback(`${pT.name}`, `userProductType_${pT.id}`)
            // ])

            // await ctx.telegram.sendPhoto(
            //     chatId,
            //     'AgACAgIAAxkBAAMcaOD_qPNZStYzYagYsKOuRyrkfGEAAon6MRsNbglL1Tu3OUInRkEBAAMCAAN4AAM2BA',
            //     {
            //         caption: "harid qilinadigan maxsulotlarni tanlang",
            //         parse_mode: 'HTML',
            //         reply_markup: Markup.inlineKeyboard(buttons).reply_markup
            //     },
            // )
        }
    }

    @Action('addAdmin')
    async addAdmin(@Ctx() ctx: Context) {
        addOrRemoveAdmin(ctx, true, this.userService);
    }

    @Action('removeAdmin')
    async removeAdmin(@Ctx() ctx: Context) {
        addOrRemoveAdmin(ctx, false, this.userService);
    }


    @Action(/addAdmin_(.+)/)
    async onAddAdmin(@Ctx() ctx: Context) {
        addOrRemoveAdminChatId(ctx, this.userService)
    }

    @Action(/removeAdmin_(.+)/)
    async onRemoveAdmin(@Ctx() ctx: Context) {
        addOrRemoveAdminChatId(ctx, this.userService)
    }

    @Action('homeMenu')
    async passHomeMenu(@Ctx() ctx: Context) {
        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId topilmadi');
            return;
        }
        const user = await this.userService.findByChatId(chatId);
        if (!user) {
            console.log('user topilmadi');
            return;
        }
        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: 'AgACAgIAAxkBAAMVaSCfPYB3syH4lR-3vyAIZ1bEez0AAjIQaxuawQhJvFUkwxgL5HoBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAMcaOD_qPNZStYzYagYsKOuRyrkfGEAAon6MRsNbglL1Tu3OUInRkEBAAMCAAN4AAM2BA',
                caption: "adminlar qo'shing yoki o'chiring",
                parse_mode: 'HTML',
            },
            {
                reply_markup: Markup.inlineKeyboard(menu_admin_inline_keybord(user)).reply_markup,
            }
        );
    }

    @Action('markWorkingTimeOrNot')
    async markWorkingTimeOrNot(@Ctx() ctx: Context) {
        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId topilmadi');
            return;
        }
        const user = await this.userService.findByChatId(chatId);
        if (!user) {
            console.log('user topilmadi');
            return;
        }

        isworkTime = !isworkTime;

        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: 'AgACAgIAAxkBAAMVaSCfPYB3syH4lR-3vyAIZ1bEez0AAjIQaxuawQhJvFUkwxgL5HoBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAMcaOD_qPNZStYzYagYsKOuRyrkfGEAAon6MRsNbglL1Tu3OUInRkEBAAMCAAN4AAM2BA',
                caption: "adminlar qo'shing yoki o'chiring",
                parse_mode: 'HTML',
            },
            {
                reply_markup: Markup.inlineKeyboard(menu_admin_inline_keybord(user)).reply_markup,
            }
        );
    }

    @Action('askReasonOfPause')
    async askReasonOfPause(@Ctx() ctx: Context) {
        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId topilmadi');
            return;
        }

        userAction.set(chatId, {
            chatId,
            // productId: +productId,
            method: 'markNotWorking'
        });

        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: 'AgACAgIAAxkBAAMZaSCoSNdXUwtmmJHzqpoQF55uffcAAm4QaxuawQhJsGyk64sjpBkBAAMCAANtAAM2BA',//'AgACAgIAAxkBAAMcaOD_qPNZStYzYagYsKOuRyrkfGEAAon6MRsNbglL1Tu3OUInRkEBAAMCAAN4AAM2BA',
                caption: "foydalanuvchilar botni ishlatmoqchi bo'lganda ularga bot faoliyatni nimaga to'xtatib turganining sababini kiriting:",
                parse_mode: 'HTML',
            },
            {
                reply_markup: Markup.inlineKeyboard([
                    [Markup.button.callback('orqaga', 'homeMenu')]
                ]).reply_markup,
            }
        );
    }

    @Action('productTypes')
    async productTypes(@Ctx() ctx: Context) {
        await productTypesMenu(ctx, this.productTypeService, true);
        const chatId = ctx.chat?.id;
        if (chatId) {
            adminAction.delete(chatId);
        } else {
            console.log('chatId aniqlanmadi');
        }
    }

    @Action(/productType_\d+/)
    async onProductTypeSelected(@Ctx() ctx: Context) {
        await productTypeId(ctx, this.productTypeService, this.productBrandService, true, null);
    }

    @Action('productTypeAdd')
    async onProductTypeAdd(@Ctx() ctx: Context) {
        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }
        adminAction.set(chatId, {
            chatId: chatId,
            method: 'addProductType'
        });

        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: 'AgACAgIAAxkBAAMXaSCg81DWb003njYCfm6HmY5X5I0AAksQaxuawQhJ_5u43OV4x8IBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAANeaOEiwARWvDf4sPIJ0V-7xgbQkFcAAtT7MRsNbglLPC70gxWhpkQBAAMCAAN4AAM2BA',
                caption: 'maxsulotlar uchun tur rasmini va izohda nomini kiriting:',
                parse_mode: 'HTML', // kerak bo‘lsa
            },
            {
                reply_markup: Markup.inlineKeyboard([
                    [Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', 'productTypes')]
                ]).reply_markup,
            }
        );
    }

    @Action(/productTypeRemove_(.+)/)
    async onRemoveProductTy(@Ctx() ctx: Context) {
        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const parts = callback.data.split('_');
        const id = parts.length === 2 ? parts[1] : null;

        if (!id) {
            await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
            return;
        }
        await this.productTypeService.remove(+id);
        await productTypesMenu(ctx, this.productTypeService, true);
    }

    @Action(/productTypeTempRemove_(.+)/)
    async _onRemoveProductTy(@Ctx() ctx: Context) {
        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const parts = callback.data.split('_');
        const id = parts.length === 2 ? parts[1] : null;

        if (!id) {
            await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
            return;
        }
        await ctx.editMessageReplyMarkup(
            Markup.inlineKeyboard([
                [Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `productType_${id}`)],
                [Markup.button.callback('❌ o\'chirishni tasdiqlash', `productTypeRemove_${id}`)]
            ]).reply_markup
        );
    }

    @Action(/productBrand_\d+/)
    async onProductBradSelected(@Ctx() ctx: Context) {
        await productBrandId(ctx, this.productService, this.productBrandService, true, null);
    }

    @Action(/productBrandAdd_\d+/)
    async onProductBrandAdd(@Ctx() ctx: Context) {
        const id = await checkCallbackQuery(ctx);

        if (!id) {
            return;
        }
        const productType = await this.productTypeService.findOne(+id);

        if (!productType) {
            console.log('product type topilmadi');
            return;
        }

        const chatId = ctx.chat?.id;
        if (!chatId) {
            await ctx.reply('❌ Chat aniqlanmadi.');
            return;
        }

        adminAction.set(chatId, {
            chatId: chatId,
            method: 'addProductBrand',
            productTypeId: id
        });

        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: productType?.photo,
                caption: `${productType.name} turga mansub maxsulot brend rasmini va izohda nomini kiriting`,
                parse_mode: 'HTML', // kerak bo‘lsa
            },
            {
                reply_markup: Markup.inlineKeyboard([
                    [Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `productType_${id}`)]
                ]).reply_markup,
            }
        );
    }

    @Action(/productBrandRemove_\d+/)
    async onProductBrandRemove(@Ctx() ctx: Context) {
        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const parts = callback.data.split('_');
        const brandId = parts.length === 2 ? +parts[1] : null;

        if (!brandId) {
            await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
            return;
        }

        const productBrand = await this.productBrandService.findOne(brandId);
        if (!productBrand) {
            console.log('productbrand topilmadi id: ', brandId);
            return;
        }
        await this.productBrandService.remove(brandId);
        await productTypeId(ctx, this.productTypeService, this.productBrandService, true, productBrand.productType.id);
    }

    @Action(/productBrandTempRemove_(.+)/)
    async _onProductBrandRemove(@Ctx() ctx: Context) {
        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const parts = callback.data.split('_');
        const id = parts.length === 2 ? parts[1] : null;

        if (!id) {
            await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
            return;
        }
        await ctx.editMessageReplyMarkup(
            Markup.inlineKeyboard([
                [Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `productBrand_${id}`)],
                [Markup.button.callback('❌ o\'chirishni tasdiqlash', `productBrandRemove_${id}`)]
            ]).reply_markup
        );
    }

    @Action(/productAdd_\d+/)
    async onProductAdd(@Ctx() ctx: Context) {
        const id = await checkCallbackQuery(ctx);

        if (!id) {
            return;
        }
        const productBrand = await this.productBrandService.findOne(+id);

        if (!productBrand) {
            console.log('product type topilmadi');
            return;
        }

        const chatId = ctx.chat?.id;
        if (!chatId) {
            await ctx.reply('❌ Chat aniqlanmadi.');
            return;
        }

        adminAction.set(chatId, {
            chatId: chatId,
            method: 'addProduct',
            productBrandId: id
        });

        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: productBrand?.photo,
                caption: `${productBrand.name} turga mansub maxsulot rasmini va izohda nomini kiriting:
                [nomi:] olma
                [narxi(so\'m):] 8000
                [o'lchov turi(kg/dona/L):] dona
                [tarif(ixtiyoriy):] istemol uchun`,
                parse_mode: 'HTML', // kerak bo‘lsa
            },
            {
                reply_markup: Markup.inlineKeyboard([
                    [Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `productBrand_${id}`)]
                ]).reply_markup,
            }
        );
    }

    @Action(/product_\d+/)
    async onProductSelected(@Ctx() ctx: Context) {
        await productId(ctx, this.productService, true, null);
    }

    @Action(/productEdit_\d+/)
    async onProductEdit(@Ctx() ctx: Context) {
        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const parts = callback.data.split('_');
        const id = parts.length === 2 ? parts[1] : null;

        if (!id) {
            await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
            return;
        }
        const product = await this.productService.findOne(+id);
        if (!product) {
            console.log('product topilmadi');
            return;
        }

        const chatId = ctx.chat?.id;
        if (!chatId) {
            await ctx.reply('❌ Chat aniqlanmadi.');
            return;
        }

        adminAction.set(chatId, {
            chatId,
            method: 'productEdit',
            productId: product.id
        });

        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: product.photo,
                caption: `edit qilish uchun nomi narxi tasnif yoz\n\nnomi: ${product.name}\nnarxi(so\'m): ${product.price}\no'lchov turi: ${product.criterion}\ntarif: ${product.description}\n\ndokonda ${product.isAvailable ? 'mavjud' : 'mavjud emas'}`,
                parse_mode: 'HTML', // kerak bo‘lsa
            },
            {
                reply_markup: Markup.inlineKeyboard([
                    [Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `product_${product.id}`)]
                ]).reply_markup,
            }
        );
    }

    @Action(/productDelete_\d+/)
    async onProductDelete(@Ctx() ctx: Context) {
        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const parts = callback.data.split('_');
        const id = parts.length === 2 ? parts[1] : null;

        if (!id) {
            await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
            return;
        }
        const product = await this.productService.findOne(+id);
        if (!product) {
            console.log('product topilmadi');
            return;
        }
        await this.productService.remove(+id);

        const chatId = ctx.chat?.id;
        if (!chatId) {
            await ctx.reply('❌ Chat aniqlanmadi.');
            return;
        }

        await productBrandId(ctx, this.productService, this.productBrandService, true, product.productBrand.id)
    }

    @Action(/productIsNotAble_\d+/)
    async productIsNotAble(@Ctx() ctx: Context) {
        await productAvailable(ctx, this.productService, false);
    }

    @Action(/productIsAble_\d+/)
    async productIsAble(@Ctx() ctx: Context) {
        await productAvailable(ctx, this.productService, true);
    }

    @Action(/userProductType_\d+/)
    async userProductTypeId(@Ctx() ctx: Context) {
        await alertToUserAboutNotWorking(ctx);

        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const parts = callback.data.split('_');
        const id = parts.length === 2 ? parts[1] : null;

        if (!id) {
            await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
            return;
        }

        const productType = await this.productTypeService.findOne(+id);
        if (!productType) {
            console.log('productType topilmadi id: ', id);
            return;
        }
        const productBrands = await this.productBrandService.findAll(+id);
        const buttons = productBrands.map(pT => [
            Markup.button.callback(`${pT.name}`, `userProductBrand_${pT.id}`),
        ]);

        buttons.push([
            Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', 'userStart'),
            Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
        ])

        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: productType.photo,
                caption: productType.name,
                parse_mode: 'HTML', // kerak bo‘lsa
            },
            {
                reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
            }
        );
    }

    @Action(/userProductBrand_\d+/)
    async userProductBradSelected(@Ctx() ctx: Context) {
        await alertToUserAboutNotWorking(ctx);

        // await productBrandId(ctx, this.productService, this.productBrandService, true, null);
        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const parts = callback.data.split('_');
        const brandId = parts.length === 2 ? +parts[1] : null;

        if (!brandId) {
            await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
            return;
        }

        const productBrand = await this.productBrandService.findOne(brandId);
        if (!productBrand) {
            console.log('productbrand topilmadi id: ', brandId);
            return;
        }

        const products = await this.productService.findAll(brandId, true);
        const buttons = products.map(p => [
            Markup.button.callback(`${p.name}, ${p.price} so'm`, `userProduct_${p.id}`),
        ]);

        console.log('productBrand: ', productBrand);

        buttons.push([
            Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userProductType_${productBrand.productType.id}`),
            Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
        ])

        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: productBrand.photo,
                caption: productBrand.name,
                parse_mode: 'HTML', // kerak bo‘lsa
            },
            {
                reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
            }
        );
    }

    @Action(/userProduct_\d+/)
    async userProductSelected(@Ctx() ctx: Context) {
        await alertToUserAboutNotWorking(ctx);

        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }
        userAction.delete(chatId);

        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const parts = callback.data.split('_');
        const productId = parts.length === 2 ? parts[1] : null;

        if (!productId) {
            await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
            return;
        }

        const product = await this.productService.findOne(+productId);
        if (!product) {
            console.log('product topilmadi');
            return;
        }

        const buttons: any = [];
        if (product.isAvailable) {
            if (product.criterion === Criterion.dona) {
                // buttons.push([
                //     Markup.button.callback('necha dona harid qilasiz', `productDona_${product.id}`)
                // ])

                userAction.set(chatId,
                    {
                        chatId,
                        productId: +productId,
                        method: 'addProductDona'
                    }
                );

                await ctx.editMessageCaption(
                    `nomi: ${product.name}\nnarxi(so'm): ${product.price}\n necha dona xarid qilishingizni kiriting: `,
                    {
                        parse_mode: 'HTML',
                        reply_markup: Markup.inlineKeyboard([
                            // [Markup.button.callback('necha dona harid qilasiz', `productDona_${product.id}`)],
                            [
                                Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userProductBrand_${product.productBrand.id}`),
                                Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
                            ]
                        ]).reply_markup,
                    }
                );

                return;
            } else if (product.criterion === Criterion.kg) {
                buttons.push([
                    Markup.button.callback('necha kg harid qilasiz', `productKgKg_${product.id}`),
                    Markup.button.callback('necha so\'mga harid qilasiz', `productKgSum_${product.id}`),
                ])
            } else if (product.criterion === Criterion.l) {
                // buttons.push([
                //     Markup.button.callback('necha Litr harid qilasiz', `productLitr_${product.id}`),
                // ])

                userAction.set(chatId,
                    {
                        chatId,
                        productId: +productId,
                        method: 'addProductLitr'
                    }
                );

                await ctx.editMessageCaption(
                    `nomi: ${product.name}\nnarxi(so'm): ${product.price}\n necha Litr xarid qilishingizni kiriting: `,
                    {
                        parse_mode: 'HTML',
                        reply_markup: Markup.inlineKeyboard([
                            // [Markup.button.callback('necha dona harid qilasiz', `productDona_${product.id}`)],
                            [
                                Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userProductBrand_${product.productBrand.id}`),
                                Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
                            ]
                        ]).reply_markup,
                    }
                );

                return;
            }
        }

        buttons.push([
            Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userProductBrand_${product.productBrand.id}`),
            Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
        ]);

        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: product.photo,
                caption: `nomi: ${product.name}\nnarxi(so\'m): ${product.price}\no'lchov turi: ${product.criterion}\ntarif: ${product.description}\n\ndokonda ${product.isAvailable ? 'mavjud' : 'mavjud emas'}`,
                parse_mode: 'HTML', // kerak bo‘lsa
            },
            {
                reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
            }
        );
    }

    @Action(/productDona_\d+/)
    async userAddProductToBasketDona(@Ctx() ctx: Context) {
        await alertToUserAboutNotWorking(ctx);

        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }

        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const parts = callback.data.split('_');
        const productId = parts.length === 2 ? parts[1] : null;

        if (!productId) {
            await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
            return;
        }

        userAction.set(chatId,
            {
                chatId,
                productId: +productId,
                method: 'addProductDona'
            }
        );

        const product = await this.productService.findOne(+productId);
        if (!product) {
            console.log('product topilmadi')
            return;
        }

        await ctx.editMessageCaption(
            `nomi: ${product.name}\nnarxi(so'm): ${product.price}\n necha dona xarid qilishingizni kiriting: `,
            {
                parse_mode: 'HTML',
                reply_markup: Markup.inlineKeyboard([
                    // [Markup.button.callback('necha dona harid qilasiz', `productDona_${product.id}`)],
                    [
                        Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userProduct_${product.id}`),
                        Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
                    ]
                ]).reply_markup,
            }
        );
    }

    @Action(/productKgKg_\d+/)
    async userAddProductToBasketTotKgKg(@Ctx() ctx: Context) {
        await alertToUserAboutNotWorking(ctx);

        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }

        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const parts = callback.data.split('_');
        const productId = parts.length === 2 ? parts[1] : null;

        if (!productId) {
            await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
            return;
        }

        userAction.set(chatId,
            {
                chatId,
                productId: +productId,
                method: 'addProductKgKg'
            }
        );

        const product = await this.productService.findOne(+productId);
        if (!product) {
            console.log('product topilmadi')
            return;
        }

        await ctx.editMessageCaption(
            `nomi: ${product.name}\nnarxi(so'm): ${product.price}\n necha kg xarid qilishingizni kiriting: `,
            {
                parse_mode: 'HTML',
                reply_markup: Markup.inlineKeyboard([
                    // [Markup.button.callback('necha dona harid qilasiz', `productDona_${product.id}`)],
                    [
                        Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userProduct_${product.id}`),
                        Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
                    ]
                ]).reply_markup,
            }
        );
    }

    @Action(/productKgSum_\d+/)
    async userAddProductToBasketKgSum(@Ctx() ctx: Context) {
        await alertToUserAboutNotWorking(ctx);

        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }

        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const parts = callback.data.split('_');
        const productId = parts.length === 2 ? parts[1] : null;

        if (!productId) {
            await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
            return;
        }

        userAction.set(chatId,
            {
                chatId,
                productId: +productId,
                method: 'addProductKgSum'
            }
        );

        const product = await this.productService.findOne(+productId);
        if (!product) {
            console.log('product topilmadi')
            return;
        }

        await ctx.editMessageCaption(
            `nomi: ${product.name}\nnarxi(so'm): ${product.price}\n necha so'mga xarid qilishingizni kiriting: `,
            {
                parse_mode: 'HTML',
                reply_markup: Markup.inlineKeyboard([
                    // [Markup.button.callback('necha dona harid qilasiz', `productDona_${product.id}`)],
                    [
                        Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userProduct_${product.id}`),
                        Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
                    ]
                ]).reply_markup,
            }
        );
    }

    @Action(/productLitr_\d+/)
    async userAddProductToBasketLitr(@Ctx() ctx: Context) {
        await alertToUserAboutNotWorking(ctx);

        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }

        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const parts = callback.data.split('_');
        const productId = parts.length === 2 ? parts[1] : null;

        if (!productId) {
            await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
            return;
        }

        userAction.set(chatId,
            {
                chatId,
                productId: +productId,
                method: 'addProductLitr'
            }
        );

        const product = await this.productService.findOne(+productId);
        if (!product) {
            console.log('product topilmadi')
            return;
        }

        await ctx.editMessageCaption(
            `nomi: ${product.name}\nnarxi(so'm): ${product.price}\n necha Litr xarid qilishingizni kiriting: `,
            {
                parse_mode: 'HTML',
                reply_markup: Markup.inlineKeyboard([
                    // [Markup.button.callback('necha dona harid qilasiz', `productDona_${product.id}`)],
                    [
                        Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userProduct_${product.id}`),
                        Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
                    ]
                ]).reply_markup,
            }
        );
    }

    @Action(/userProductApproval_\d+/)
    async userProductApproval(@Ctx() ctx: Context) {
        await alertToUserAboutNotWorking(ctx);

        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }
        userAction.delete(chatId);

        // const callback = ctx.callbackQuery;
        // if (!callback || !('data' in callback)) {
        //     return await ctx.answerCbQuery('Callback data topilmadi');
        // }

        // const parts = callback.data.split('_');
        // const id = parts.length === 2 ? parts[1] : null;

        // if (!id) {
        //     await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
        //     return;
        // }
        const approvalProduct = basketsTemp.get(chatId);
        if (!approvalProduct) {
            console.log('tadiqlashga product yo\'q');
            return;
        }
        let basket = baskets.get(chatId);
        if (!basket) {
            const _basket = [];
            baskets.set(chatId, _basket);
            basket = _basket;
        }
        productInBasket(basket, approvalProduct);
        console.log('basket: ', basket);

        await ctx.deleteMessage();

        // const message = await ctx.replyWithMediaGroup(
        //     basket.map(p => ({
        //         type: 'photo',
        //         media: p.product.photo,
        //         caption: `\n<b>${p.product.name}</b>\nNarxi: ${p.product.price} so'm\nSoni: ${p.amount}\nUmumiy: ${p.product.price * p.amount} so'm`,
        //         parse_mode: 'HTML',
        //     }))
        // );
        // message.forEach((ms, ind) => basket[ind].message_id = ms.message_id);
        // console.log('group message: ', message);
        let priceAll = 0;

        const chunkSize = 10;

        for (let i = 0; i < basket.length; i += chunkSize) {
            const chunk = basket.slice(i, i + chunkSize); // har 10 tadan bo‘lib olamiz


            const mediaGroup = chunk.map(p => {

                priceAll += p.product.price * p.amount;

                if (p.product.criterion === Criterion.dona) {
                    return {
                        type: 'photo',
                        media: p.product.photo,
                        caption: `\n<b>${p.product.name}</b>\nNarxi: ${p.product.price} so'm\nSoni: ${p.amount}\nUmumiy: ${p.product.price * p.amount} so'm`,
                        parse_mode: 'HTML',
                    }
                } else if (p.product.criterion === Criterion.kg) {
                    return {
                        type: 'photo',
                        media: p.product.photo,
                        caption: `\n<b>${p.product.name}</b>\nNarxi: ${p.product.price} so'm\nKg: ${p.amount}\nUmumiy: ${p.product.price * p.amount} so'm`,
                        parse_mode: 'HTML',
                    }
                } else if (p.product.criterion === Criterion.l) {

                    return {
                        type: 'photo',
                        media: p.product.photo,
                        caption: `\n<b>${p.product.name}</b>\nNarxi: ${p.product.price} so'm\nL: ${p.amount}\nUmumiy: ${p.product.price * p.amount} so'm`,
                        parse_mode: 'HTML',
                    }
                }
            });

            try {
                const messages = await ctx.replyWithMediaGroup(mediaGroup);

                // Har bir mahsulotga message_id ni biriktiramiz
                messages.forEach((msg, j) => {
                    chunk[j].message_id = msg.message_id;
                });

            } catch (err) {
                console.error('MediaGroup xatosi:', err);
                // Xatoni foydalanuvchiga yuborishingiz mumkin:
                await ctx.reply('Rasmlarni yuborishda xatolik yuz berdi. Iltimos, keyinroq urinib ko‘ring.');
            }
        }

        const buttons = [
            [Markup.button.callback('🛍️🛒𝑿𝒂𝒓𝒊𝒅𝒍𝒂𝒓𝒏𝒊 𝑩𝒆𝒌𝒐𝒓 𝑸𝒊𝒍𝒊𝒔𝒉❌', `userProductsDeleteButton`)],

            [
                Markup.button.callback('🛒 𝙔𝙖𝙣𝙖 𝙢𝙖𝙭𝙨𝙪𝙡𝙤𝙩 𝙤𝙡𝙞𝙨𝙝', `userStart`),
            ]

        ]
        if (priceAll >= 40000) {
            buttons.push(
                [
                    Markup.button.callback('🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛', `userProductsBuyGetContact`)
                ]
            )
        }

        const message = await ctx.replyWithPhoto(
            'AgACAgIAAxkBAAMQaSCeX8O-C7VDELEkGyuGEuk-EtoAAigQaxuawQhJKrUz_ZtgebsBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ', // bu yerda product.photoFileId — bu oldin saqlangan file_id
            {
                caption: basket.map(p => `\n<b>${p.product.name}</b>\nNarxi: ${p.product.price} so'm\n${p.product.criterion === Criterion.kg ? `Kgmi: ${p.amount.toFixed(2)}` : p.product.criterion === Criterion.dona ? `Soni: ${p.amount}` : `Litri: ${p.amount}`}\nUmumiy: ${(p.product.price * p.amount).toFixed(2)} so'm`).join('\n') + `\n\n hozirda umumiy xarid narxi ${priceAll.toFixed(2)} so'm ${priceAll < 40_000 ? `\n eng kamida 40 000 so\'mlik maxsulotlar olinsa buyutrmani tasdiqlash imkoni ochiladi iltimos yana ${40000 - priceAll} so'mlik haxsulot qo'shing` : ''}`,
                parse_mode: 'HTML',
                reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
            }
        );

        messageId_chatId.set(chatId, message.message_id);

    }

    @Action(/userStart/)
    async userStart(@Ctx() ctx: Context) {
        await alertToUserAboutNotWorkingOk(ctx);

        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }

        const productType = await this.productTypeService.findAll();
        const buttons = productType.map(pT => [
            Markup.button.callback(`${pT.name}`, `userProductType_${pT.id}`)
        ]);
        buttons.push([
            Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userMenu`),
            Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
        ])

        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: 'AgACAgIAAxkBAAMXaSCg81DWb003njYCfm6HmY5X5I0AAksQaxuawQhJ_5u43OV4x8IBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ',
                caption: "🛒🛍️ 𝐗𝐚𝐫𝐢𝐝 𝐪𝐢𝐥𝐦𝐨𝐪𝐜𝐡𝐢 𝐛𝐨‘𝐥𝐠𝐚𝐧 𝐦𝐚𝐡𝐬𝐮𝐥𝐨𝐭𝐥𝐚𝐫𝐢𝐧𝐠𝐢𝐳𝐧𝐢 𝐭𝐚𝐧𝐥𝐚𝐧𝐠",
                parse_mode: 'HTML'
            },
            {
                reply_markup: Markup.inlineKeyboard(buttons).reply_markup
            }
        );
    }

    @Action(/userProductsDeleteButton/)
    async userProductsDeleteButton(@Ctx() ctx: Context) {
        await alertToUserAboutNotWorking(ctx);

        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }

        // const callback = ctx.callbackQuery;
        // if (!callback || !('data' in callback)) {
        //     return await ctx.answerCbQuery('Callback data topilmadi');
        // }

        // const parts = callback.data.split('_');
        // const id = parts.length === 2 ? parts[1] : null;

        // if (!id) {
        //     await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
        //     return;
        // }

        let basket = baskets.get(chatId);
        if (!basket) {
            return;
        }

        // await ctx.replyWithMediaGroup(
        //     basket.map(p => ({
        //         type: 'photo',
        //         media: p.product.photo,
        //         caption: `\n<b>${p.product.name}</b>\nNarxi: ${p.product.price} so'm\nSoni: ${p.amount}\nUmumiy: ${p.product.price * p.amount} so'm`,
        //         parse_mode: 'HTML',
        //     }))
        // );
        const buttons = basket.map(p =>
            [Markup.button.callback(`${p.product.name}  ${p.product.price}so'mdan ${p.amount} ${p.product.price * p.amount} so'm`, `userProductsDelete_${p.product.id}`)],
        )
        buttons.push(
            [
                Markup.button.callback('𝙱𝚊𝚛𝚌𝚑𝚊𝚌𝚑𝚊 𝚋𝚎𝚔𝚘𝚛 𝚚𝚒𝚕𝚒𝚜𝚑 🛑❌', `userProductsDeleteAll`),
            ]
        );
        buttons.push(
            [
                Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userMenu`),
                Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
            ]
        );
        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: 'AgACAgIAAxkBAAPdaSHmTjNAPS5GD_v1kGH4K_MZfZoAArAPaxsSnhFJJb1o3ctJlsQBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ',
                caption: basket.map(p =>
                    `\n<b>${p.product.name}</b>\nNarxi: ${p.product.price} so'm\nSoni: ${p.amount}\nUmumiy: ${p.product.price * p.amount} so'm`
                ).join('\n'),
                parse_mode: 'HTML'
            },
            {
                reply_markup: Markup.inlineKeyboard(buttons).reply_markup
            }
        );
    }

    @Action(/userProductsDelete_\d+/)
    async userProductsDelete(@Ctx() ctx: Context) {
        await alertToUserAboutNotWorking(ctx);

        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }
        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const parts = callback.data.split('_');
        const id = parts.length === 2 ? parts[1] : null;

        if (!id) {
            await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
            return;
        }

        const basket = baskets.get(chatId);
        if (!basket) {
            console.log('savat topilmadi');
            return;
        }

        const index = basket.findIndex(item => item.product.id === +id);
        const product = basket[index];
        await ctx.deleteMessage(product.message_id);

        if (index !== -1) {
            basket.splice(index, 1);
        }

        const buttons = basket.map(p =>
            [Markup.button.callback(`${p.product.name}  ${p.product.price}so'mdan ${p.amount} ${p.product.price * p.amount} so'm`, `userProductsDelete_${p.product.id}`)],
        );
        if (basket.length !== 0) {
            buttons.push(
                [
                    Markup.button.callback('barchasini o\'chir', `userProductsDeleteAll`),
                ]
            );
        }
        buttons.push(
            [
                Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userStart`),
                Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
            ]
        );
        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: 'AgACAgIAAxkBAAPdaSHmTjNAPS5GD_v1kGH4K_MZfZoAArAPaxsSnhFJJb1o3ctJlsQBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ',
                caption: basket.length
                    ?
                    basket.map(p =>
                        `\n<b>${p.product.name}</b>\nNarxi: ${p.product.price} so'm\nSoni: ${p.amount}\nUmumiy: ${p.product.price * p.amount} so'm`
                    ).join('\n')
                    :
                    'savat bo\'sh',
                parse_mode: 'HTML'
            },
            {
                reply_markup: Markup.inlineKeyboard(buttons).reply_markup
            }
        );
    }

    @Action(/userProductsDeleteAll/)
    async userProductsDeleteAll(@Ctx() ctx: Context) {
        await alertToUserAboutNotWorking(ctx);

        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }

        const basket = baskets.get(chatId);
        if (!basket) {
            console.log('savat topilmadi');
            return;
        }

        basket.forEach(async p => {
            await ctx.deleteMessage(p.message_id);
        });
        basket.length = 0;

        const buttons: any = [];
        buttons.push(
            [
                Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userStart`),
                Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
            ]
        );
        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: 'AgACAgIAAxkBAAPdaSHmTjNAPS5GD_v1kGH4K_MZfZoAArAPaxsSnhFJJb1o3ctJlsQBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ',
                caption: 'savat bo\'sh',
                parse_mode: 'HTML'
            },
            {
                reply_markup: Markup.inlineKeyboard(buttons).reply_markup
            }
        );
    }

    @Action(/^productDelivery_(\d+)_(\d+)$/)
    async productDelivery(@Ctx() ctx: Context) {
        // await alertToUserAboutNotWorking(ctx);

        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }
        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        // const parts = callback.data.split('_');
        // const userId = parts.length === 2 ? parts[1] : null;

        const data = callback.data; // productDelivery_123456_789
        const match = data.match(/^productDelivery_(\d+)_(\d+)$/);
        if (!match) {
            console.log('yetkalilmoqda statusga o\'zgartirishda xatolik');
            return;
        }

        const [, userId, messageId] = match;

        await ctx.telegram.editMessageText(
            Number(userId),           // Foydalanuvchi (chat) ID
            Number(messageId),        // Xabar ID
            undefined,                // inline_message_id — kerak emas
            "📦 Buyurtma holati: Yetkazilmoqda ✅"
        );

        const basket = baskets.get(+userId);
        console.log('basket: ', JSON.stringify(basket));
        console.log('sendedMessages: ', basket?.sendedMessages);
        basket.sendedMessages?.forEach(async (itm) => {
            if (chatId !== +itm.adminChatId) {
                await ctx.telegram.editMessageReplyMarkup(
                    itm.adminChatId,
                    itm.messageId,
                    undefined,
                    { inline_keyboard: [] }
                );

                const username = `@${ctx.from?.username}`;
                const name = `${ctx.from?.first_name}` || '';

                await ctx.telegram.sendMessage(
                    itm.adminChatId,
                    `buyutmani qabul qilgan admin\nusername: ${username}\nname: ${name}`,
                    {
                        reply_to_message_id: itm.messageId // shu xabarga javob sifatida yuboradi
                    } as any
                );
            }
        });

        baskets.delete(+userId);
        userAction.delete(+userId);

        await ctx.telegram.sendMessage(
            +userId,
            `yana boshqa buyutma amalga oshiringingiz mumkin`,
        );

        await ctx.editMessageReplyMarkup(
            Markup.inlineKeyboard([
                [
                    Markup.button.callback("✅ yetkazildiga o'zgartirish !!!", `productDeliveryy_${userId}_${messageId}`)
                ],
                // [
                //     Markup.button.callback("foydalanuvchiga xabar yuborish", `sendMessageToUser_${userId}_${messageId}`)
                // ]
            ]).reply_markup  // <- shuni ishlatish kerak TypeScript uchun
        );

    }

    @Action(/^productDeliveryy_(\d+)_(\d+)$/)
    async productDeliveryy(@Ctx() ctx: Context) {
        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }
        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const data = callback.data; // productDelivery_123456_789
        const match = data.match(/^productDeliveryy_(\d+)_(\d+)$/);
        if (!match) {
            console.log('yetkalilmoqda statusga o\'zgartirishda xatolik');
            return;
        }

        const [, userId, messageId] = match;

        await ctx.telegram.editMessageText(
            Number(userId),           // Foydalanuvchi (chat) ID
            Number(messageId),        // Xabar ID
            undefined,                // inline_message_id — kerak emas
            "📦 Buyurtma holati: Yetkazildi ✅"
        );

        // const basket = baskets.get(+userId);
        // basket.sendedMessages.forEach(async (itm) => {
        //     if (chatId !== +itm.adminChatId) {
        //         await ctx.telegram.editMessageReplyMarkup(itm.adminChatId, itm.messageId, undefined, null as any);
        //     }
        // })

        await ctx.editMessageReplyMarkup(
            Markup.inlineKeyboard([
                // [
                //     Markup.button.callback("foydalanuvchiga xabar yuborish", `sendMessageToUser_${userId}`)
                // ]
            ]).reply_markup  // <- shuni ishlatish kerak TypeScript uchun
        );
    }

    @Action(/^sendMessageToUser_(\d+)(?:_(\d+))?$/)
    async sendMessageToUser(@Ctx() ctx: Context) {
        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }

        const _adminOrUser = adminsendMessageUser.get(chatId);
        if (_adminOrUser) {
            console.log('admin boshqa chat bilan aloqadan ');
            const user = await this.userService.findByChatId(_adminOrUser.adminOrUser!.chatId);
            await ctx.telegram.sendMessage(
                chatId,
                `hurmatli admin bir vaqtda faqat bir foydalanuvchiga xabar yubora olasiz\n${user?.name} | @${user?.username} bilan muloqotni to'xtatmoqchimisiz`,
                {
                    // reply_to_message_id: itm.messageId, // shu xabarga javob sifatida yuboradi
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "muloqotni tugatish", callback_data: `stopsendMessage` },
                            ]
                        ]
                    }
                }
            );
            return;
        }

        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const messageId = callback.message?.message_id;
        console.log('Action bosilgan xabar ID:', messageId);

        // await ctx.editMessageReplyMarkup(
        //     Markup.inlineKeyboard([]).reply_markup  
        // );

        // const message = ctx.reply

        const data = callback.data;
        const match = data.match(/^sendMessageToUser_(\d+)(?:_(\d+))?$/);
        if (!match) {
            console.log('yetkalilmoqda statusga o\'zgartirishda xatolik');
            return;
        }
        const [, userId, _messageId] = match;
        const userData = await this.userService.findByChatId(+userId);

        const user: AdminOrUser = {
            chatId: +userId,
            adminOrUser: null,
            name: userData?.name ?? 'unknown'
            // isAdmin: false
        };

        const admin: AdminOrUser = {
            chatId,
            adminOrUser: user,
            name: `${ctx.from?.first_name ?? ''} ${ctx.from?.last_name ?? ''} `
            // isAdmin: true
        };

        user.adminOrUser = admin;

        const existChat = adminsendMessageUser.get(+userId);
        if (existChat) {
            // adminsendMessageUser.delete(existChat.chatId);
            adminsendMessageUser.delete(existChat.adminOrUser!.chatId);

            await ctx.telegram.sendMessage(
                existChat.adminOrUser!.chatId,
                `${existChat.name} user bilan muloqot tugatildi`,
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: `foydalanuvchiga xabar yuborish`, callback_data: `sendMessageToUser_${userId}` },
                            ]
                        ]
                    }
                }
            );
            await ctx.telegram.sendMessage(
                +userId,
                `${existChat.adminOrUser?.name} admin bilan muloqot tugadildi`,
            );
        }


        adminsendMessageUser.set(chatId, admin);
        adminsendMessageUser.set(+userId, user);

        await ctx.telegram.editMessageReplyMarkup(
            chatId,
            messageId,
            undefined, // inline message ID kerak bo‘lmasa undefined qoldiriladi
            Markup.inlineKeyboard([
                _messageId
                    ?
                    [
                        Markup.button.callback(
                            "✅ yetkazilmoqdaga o'zgartirish",
                            `productDelivery_${chatId}_${_messageId}`
                        )
                    ]
                    // [
                    //     Markup.button.callback("✅ yetkazildiga o'zgartirish !!!", `productDeliveryy_${userId}_${_messageId}`)
                    // ]
                    :
                    []
                // Markup.button.callback("foydalanuvchiga xabar yuborish", `sendMessageToUser_${userOrAdmin.adminOrUser!.chatId}`)
            ]).reply_markup
        );

        const message = await ctx.telegram.sendMessage(
            admin.chatId,
            `${user.name} user bilan muloqot boshlandi`,
            {
                // reply_to_message_id: itm.messageId, // shu xabarga javob sifatida yuboradi
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "muloqotni tugatish", callback_data: `stopsendMessage` },
                        ]
                    ]
                }
            }
        );

        admin.messageId = message.message_id;

        await ctx.telegram.sendMessage(
            user.chatId,
            `${ctx?.from?.first_name} ${ctx?.from?.last_name || ''} admin bilan muloqot boshlandi`,
        );

        // console.log('userId: |' + userId + '|\nadminId: ', chatId);
    }



    @Action(/^userProductsBuy$/)
    async userProductsBuy(@Ctx() ctx: Context) {
        await alertToUserAboutNotWorking(ctx);

        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }

        userAction.set(chatId, {
            chatId,
            // productId: +productId,
            method: 'productDelivery'
        });

        const message_id = messageId_chatId.get(chatId);

        await ctx.telegram.editMessageReplyMarkup(
            chatId,
            message_id,
            undefined,
            { inline_keyboard: [] }
        );


        const basket = baskets.get(chatId);

        if (!basket) {
            console.log('haridni yuborishda savat topilmadi');
            await ctx.editMessageMedia(
                {
                    type: 'photo',
                    media: 'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ',
                    caption: 'haridni yuborishda savat topilmadi',
                    parse_mode: 'HTML'
                },
                {
                    reply_markup: Markup.inlineKeyboard([[
                        Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userStart`),
                        Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
                    ]]).reply_markup
                }
            );
            return;
        }

        basket.sendedMessages = [];

        const admins = await this.userService.allUsers([Role.admin, Role.superAdmin]);

        const sentMessage = await ctx.reply('Buyurtmangiz adminga yuborildi. Tez orada bog‘lanishadi.');


        admins.forEach(async admin => {
            const chunkSize = 10;
            let priceAll = 0;

            for (let i = 0; i < basket.length; i += chunkSize) {
                const chunk = basket.slice(i, i + chunkSize); // har 10 tadan bo‘lib olamiz

                const mediaGroup = chunk.map(p => {

                    priceAll += p.product.price * p.amount;

                    if (p.product.criterion === Criterion.dona) {
                        return {
                            type: 'photo',
                            media: p.product.photo,
                            caption: `\n<b>${p.product.name}</b>\nNarxi: ${p.product.price} so'm\nSoni: ${p.amount}\nUmumiy: ${p.product.price * p.amount} so'm`,
                            parse_mode: 'HTML',
                        }
                    } else if (p.product.criterion === Criterion.kg) {
                        return {
                            type: 'photo',
                            media: p.product.photo,
                            caption: `\n<b>${p.product.name}</b>\nNarxi: ${p.product.price} so'm\nKg: ${p.amount.toFixed(2)}\nUmumiy: ${p.product.price * p.amount} so'm`,
                            parse_mode: 'HTML',
                        }
                    } else if (p.product.criterion === Criterion.l) {

                        return {
                            type: 'photo',
                            media: p.product.photo,
                            caption: `\n<b>${p.product.name}</b>\nNarxi: ${p.product.price} so'm\nL: ${p.amount}\nUmumiy: ${p.product.price * p.amount} so'm`,
                            parse_mode: 'HTML',
                        }
                    }
                });

                try {
                    await ctx.telegram.sendMediaGroup(admin.chatId, mediaGroup);
                } catch (err) {
                    console.error('MediaGroup xatosi:', err);
                    await ctx.telegram.sendMessage(admin.chatId, 'Rasmlarni yuborishda xatolik yuz berdi. Iltimos, keyinroq urinib ko‘ring.');
                }
            }

            const from = ctx.from; // foydalanuvchi ma'lumotlari
            if (!from) {
                await ctx.telegram.sendMessage(admin.chatId, 'harid qiluvchi malumotlari topilmadi.');
                return;
            }
            const userInfo = basket.reduce((ac, p) => {
                ac += `\n<b>${p.product.name}</b>\nNarxi: ${p.product.price} so'm\n${p.product.criterion === Criterion.dona ? 'Soni' : p.product.criterion === Criterion.kg ? "Kgmi" : 'Litri'}: ${p.amount.toFixed(2)}\nUmumiy: ${p.product.price * p.amount} so'm\n`;
                return ac;
            }, '') +
                `\n\n<b>🧑‍💼 Yangi buyurtma!</b>\n` +
                ` Umumiy xarid ${priceAll} so'm\n\n` +
                `👤 Ismi: ${from.first_name} ${from.last_name || ''}\n` +
                `🆔 ID: <code>${from.id}</code>\n` +
                `📛 Username: @${from.username || 'yo‘q'}\n\n` +
                `${basket.deliveryTime}\n\n` +
                basket.contact;

            const message = await ctx.telegram.sendMessage(admin.chatId, userInfo, {
                parse_mode: 'HTML',
                reply_markup: Markup.inlineKeyboard([
                    [
                        Markup.button.callback(
                            "✅ yetkazilmoqdaga o'zgartirish",
                            `productDelivery_${chatId}_${sentMessage.message_id}`
                        )
                    ],
                    [
                        Markup.button.callback("foydalanuvchiga xabar yuborish", `sendMessageToUser_${chatId}_${sentMessage.message_id}`)
                    ]
                ]).reply_markup
            });

            basket.sendedMessages.push({ adminChatId: admin.chatId, messageId: message.message_id });

        });

        // baskets.delete(chatId);

        // 2. 3 soniyadan keyin matnni avtomatik o‘zgartiramiz
        setTimeout(async () => {
            try {
                await ctx.telegram.editMessageText(
                    chatId,             // Chat ID
                    sentMessage.message_id,  // O‘zgartiriladigan xabar ID
                    undefined,                    // Inline message ID (yo‘q)
                    '✅ Buyurtmangiz qabul qilindi. Rahmat!'  // Yangi matn
                );
            } catch (error) {
                console.error('Xabarni o‘zgartirishda xatolik:', error);
            }
        }, 3000);
    }

    @Action(/^_userProductsBuy$/)
    async _userProductsBuy(@Ctx() ctx: Context) {
        await alertToUserAboutNotWorkingOk(ctx);

        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }

        userAction.set(chatId, {
            chatId,
            // productId: +productId,
            method: 'deliveryWithin_15Minutes'
        });

        await ctx.editMessageMedia(
            {
                type: 'photo',   // media turi majburiy!
                media: 'AgACAgIAAxkBAAMPaSCdu4gRail6kBvvpzFrAxj53EQAAiYQaxuawQhJrU-HA884XmkBAAMCAAN5AAM2BA',//'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ',
                caption: isworkTime
                    ?
                    `📦⏱️ 𝐁𝐮𝐲𝐮𝐫𝐭𝐦𝐚 15 𝐝𝐚𝐪𝐢𝐪𝐚𝐝𝐚 𝐲𝐞𝐭𝐤𝐚𝐳𝐢𝐥𝐚𝐝𝐢.\n𝐘𝐞𝐭𝐤𝐚𝐳𝐢𝐬𝐡𝐧𝐢 𝐭𝐚𝐬𝐝𝐢𝐪𝐥𝐚𝐲𝐬𝐢𝐳𝐦𝐢?`
                    :
                    `${reasonOfPause}\n\n 𝐀𝐠𝐚𝐫 𝐱𝐨𝐡𝐥𝐚𝐬𝐚𝐧𝐠𝐢𝐳, 𝐞𝐫𝐭𝐚𝐠𝐚 𝐒𝐢𝐳𝐠𝐚 𝐪𝐮𝐥𝐚𝐲 𝐛𝐨‘𝐥𝐠𝐚𝐧 𝐯𝐚𝐪𝐭𝐝𝐚 𝐲𝐞𝐭𝐤𝐚𝐳𝐢𝐛 𝐛𝐞𝐫𝐢𝐬𝐡𝐢𝐦𝐢𝐳 𝐦𝐮𝐦𝐤𝐢𝐧.\n𝐁𝐮𝐧𝐢𝐧𝐠 𝐮𝐜𝐡𝐮𝐧\n\n⏱️ 𝑸𝒖𝒍𝒂𝒚 𝒗𝒂𝒒𝒕𝒈𝒂 𝒚𝒆𝒕𝒌𝒂𝒛𝒊𝒔𝒉\n\n𝐭𝐮𝐠𝐦𝐚𝐬𝐢𝐧𝐢 𝐛𝐨𝐬𝐢𝐧𝐠 𝐯𝐚 𝐪𝐮𝐥𝐚𝐲 𝐯𝐚𝐪𝐭𝐧𝐢 𝐤𝐢𝐫𝐢𝐭𝐢𝐧𝐠.`,
                // caption: `<b>‼️ 𝐘𝐞𝐭𝐤𝐚𝐳𝐢𝐛 𝐛𝐞𝐫𝐢𝐬𝐡 𝐮𝐜𝐡𝐮𝐧 𝐪𝐮𝐲𝐢𝐝𝐚𝐠𝐢𝐥𝐚𝐫𝐧𝐢 𝐲𝐨𝐳𝐢𝐧:</b>\n🏠 𝐌𝐚𝐧𝐳𝐢𝐥:\n📞 𝐓𝐞𝐥𝐞𝐟𝐨𝐧:\n𝐒𝐡𝐮𝐧𝐝𝐚𝐧 𝐬𝐨‘𝐧𝐠 𝐛𝐢𝐳𝐧𝐢𝐧𝐠 𝐤𝐮𝐫𝐲𝐞𝐫𝐥𝐚𝐫 🚚 𝐛𝐮𝐲𝐮𝐫𝐭𝐦𝐚𝐧𝐠𝐢𝐳𝐧𝐢 𝐞𝐬𝐡𝐢𝐠𝐢𝐧𝐠𝐢𝐳𝐠𝐚𝐜𝐡𝐚 𝐲𝐞𝐭𝐤𝐚𝐳𝐚𝐝𝐢! ✨`,
                parse_mode: 'HTML',
            },
            {
                reply_markup: Markup.inlineKeyboard([
                    isworkTime
                        ?
                        [
                            Markup.button.callback('📝 🕒 𝐓𝐀𝐒𝐃𝐈𝐐𝐋𝐀𝐒𝐇!', `userProductsBuy`) // 🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛 / userProductsBuy
                        ]
                        :
                        [
                            Markup.button.callback('⏱️ 𝑸𝒖𝒍𝒂𝒚 𝒗𝒂𝒒𝒕𝒈𝒂 𝒚𝒆𝒕𝒌𝒂𝒛𝒊𝒔𝒉', `enterTimeToDeliverLater`) // 🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛 / userProductsBuy
                        ],
                    [
                        Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `enterTimeToDeliver`),
                        Markup.button.callback('🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮', `userMenu`),
                    ]
                ]).reply_markup,
            }
        );


        const basket = baskets.get(chatId);
        basket.deliveryTime = 'belgilangan 15 minutda yetkazish so\'ralgan';

        // if (!basket) {
        //     console.log('haridni yuborishda savat topilmadi');
        //     await ctx.editMessageMedia(
        //         {
        //             type: 'photo',
        //             media: 'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ',
        //             caption: 'haridni yuborishda savat topilmadi',
        //             parse_mode: 'HTML'
        //         },
        //         {
        //             reply_markup: Markup.inlineKeyboard([[
        //                 Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userStart`),
        //                 Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
        //             ]]).reply_markup
        //         }
        //     );
        //     return;
        // }

        // basket.sendedMessages = [];

        // const admins = await this.userService.allUsers([Role.admin, Role.superAdmin]);

        // const sentMessage = await ctx.reply('Buyurtmangiz adminga yuborildi. Tez orada bog‘lanishadi.');


        // admins.forEach(async admin => {
        //     const chunkSize = 10;
        //     let priceAll = 0;

        //     for (let i = 0; i < basket.length; i += chunkSize) {
        //         const chunk = basket.slice(i, i + chunkSize); // har 10 tadan bo‘lib olamiz

        //         const mediaGroup = chunk.map(p => {

        //             priceAll += p.product.price * p.amount;

        //             if (p.product.criterion === Criterion.dona) {
        //                 return {
        //                     type: 'photo',
        //                     media: p.product.photo,
        //                     caption: `\n<b>${p.product.name}</b>\nNarxi: ${p.product.price} so'm\nSoni: ${p.amount}\nUmumiy: ${p.product.price * p.amount} so'm`,
        //                     parse_mode: 'HTML',
        //                 }
        //             } else if (p.product.criterion === Criterion.kg) {
        //                 return {
        //                     type: 'photo',
        //                     media: p.product.photo,
        //                     caption: `\n<b>${p.product.name}</b>\nNarxi: ${p.product.price} so'm\nKg: ${p.amount}\nUmumiy: ${p.product.price * p.amount} so'm`,
        //                     parse_mode: 'HTML',
        //                 }
        //             } else if (p.product.criterion === Criterion.l) {

        //                 return {
        //                     type: 'photo',
        //                     media: p.product.photo,
        //                     caption: `\n<b>${p.product.name}</b>\nNarxi: ${p.product.price} so'm\nL: ${p.amount}\nUmumiy: ${p.product.price * p.amount} so'm`,
        //                     parse_mode: 'HTML',
        //                 }
        //             }
        //         });

        //         try {
        //             await ctx.telegram.sendMediaGroup(admin.chatId, mediaGroup);
        //         } catch (err) {
        //             console.error('MediaGroup xatosi:', err);
        //             await ctx.telegram.sendMessage(admin.chatId, 'Rasmlarni yuborishda xatolik yuz berdi. Iltimos, keyinroq urinib ko‘ring.');
        //         }
        //     }

        //     const from = ctx.from; // foydalanuvchi ma'lumotlari
        //     if (!from) {
        //         await ctx.telegram.sendMessage(admin.chatId, 'harid qiluvchi malumotlari topilmadi.');
        //         return;
        //     }
        //     const userInfo = basket.reduce((ac, p) => {
        //         ac += `\n<b>${p.product.name}</b>\nNarxi: ${p.product.price} so'm\nSoni: ${p.amount}\nUmumiy: ${p.product.price * p.amount} so'm\n`;
        //         return ac;
        //     }, '') +
        //         `\n\n<b>🧑‍💼 Yangi buyurtma!</b>\n` +
        //         ` Umumiy xarid ${priceAll} so'm\n\n` +
        //         `👤 Ismi: ${from.first_name} ${from.last_name || ''}\n` +
        //         `🆔 ID: <code>${from.id}</code>\n` +
        //         `📛 Username: @${from.username || 'yo‘q'}\n\n` +
        //         basket.contact;

        //     const message = await ctx.telegram.sendMessage(admin.chatId, userInfo, {
        //         parse_mode: 'HTML',
        //         reply_markup: Markup.inlineKeyboard([
        //             [
        //                 Markup.button.callback(
        //                     "✅ yetkazilmoqdaga o'zgartirish",
        //                     `productDelivery_${chatId}_${sentMessage.message_id}`
        //                 )
        //             ]
        //         ]).reply_markup
        //     });

        //     basket.sendedMessages.push({ adminChatId: admin.chatId, messageId: message.message_id });

        // });

        // // baskets.delete(chatId);

        // // 2. 3 soniyadan keyin matnni avtomatik o‘zgartiramiz
        // setTimeout(async () => {
        //     try {
        //         await ctx.telegram.editMessageText(
        //             chatId,             // Chat ID
        //             sentMessage.message_id,  // O‘zgartiriladigan xabar ID
        //             undefined,                    // Inline message ID (yo‘q)
        //             '✅ Buyurtmangiz qabul qilindi. Rahmat!'  // Yangi matn
        //         );
        //     } catch (error) {
        //         console.error('Xabarni o‘zgartirishda xatolik:', error);
        //     }
        // }, 3000);
    }

    @Action(/userProductsBuyGetContact/)
    async userProductsBuyGetContact(@Ctx() ctx: Context) {
        await alertToUserAboutNotWorking(ctx);

        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }
        userAction.set(chatId, {
            chatId,
            // productId: +productId,
            method: 'getContact'
        });

        await ctx.editMessageMedia(
            {
                type: 'photo',   // media turi majburiy!
                media: 'AgACAgIAAxkBAAMRaSCeftW743w2M6zVSvLmu2MSsr4AAikQaxuawQhJqyQNYGo38SoBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAIIEWkQJ5GqpLEAAQGiTmbLO6g_d_L1OAACbwtrGzrKgEhEW823n7ba5QEAAwIAA3gAAzYE',
                caption: `\n<b>🏠 𝐌𝐚𝐧𝐳𝐢𝐥 𝐯𝐚 📞 𝐓𝐞𝐥𝐞𝐟𝐨𝐧 𝐫𝐚𝐪𝐚𝐦 𝐦𝐚’𝐥𝐮𝐦𝐨𝐭𝐥𝐚𝐫𝐧𝐢 𝐤𝐢𝐫𝐢𝐭𝐢𝐧𝐠</b>`,
                // caption: `<b>‼️ 𝐘𝐞𝐭𝐤𝐚𝐳𝐢𝐛 𝐛𝐞𝐫𝐢𝐬𝐡 𝐮𝐜𝐡𝐮𝐧 𝐪𝐮𝐲𝐢𝐝𝐚𝐠𝐢𝐥𝐚𝐫𝐧𝐢 𝐲𝐨𝐳𝐢𝐧:</b>\n🏠 𝐌𝐚𝐧𝐳𝐢𝐥:\n📞 𝐓𝐞𝐥𝐞𝐟𝐨𝐧:\n𝐒𝐡𝐮𝐧𝐝𝐚𝐧 𝐬𝐨‘𝐧𝐠 𝐛𝐢𝐳𝐧𝐢𝐧𝐠 𝐤𝐮𝐫𝐲𝐞𝐫𝐥𝐚𝐫 🚚 𝐛𝐮𝐲𝐮𝐫𝐭𝐦𝐚𝐧𝐠𝐢𝐳𝐧𝐢 𝐞𝐬𝐡𝐢𝐠𝐢𝐧𝐠𝐢𝐳𝐠𝐚𝐜𝐡𝐚 𝐲𝐞𝐭𝐤𝐚𝐳𝐚𝐝𝐢! ✨`,
                parse_mode: 'HTML',
            },
            {
                reply_markup: Markup.inlineKeyboard([
                    [
                        Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', 'userMenu'),
                        Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
                    ]
                ]).reply_markup,
            }
        );
    }

    @Action(/cancelAddressAndPhone/)
    async cancelAddressAndPhone(@Ctx() ctx: Context) {
        await alertToUserAboutNotWorking(ctx);

        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }
        // userAction.set(chatId, {
        //     chatId,
        //     // productId: +productId,
        //     method: 'getContact'
        // });

        const basket = baskets.get(chatId)

        await ctx.editMessageMedia(
            {
                type: 'photo',   // media turi majburiy!
                media: 'AgACAgIAAxkBAAMMaSCSmrEofnnuf_vGT08Pqv34DvIAAtQPaxuawQhJkI0zkoPM5zQBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ', // bu yerda product.photoFileId — bu oldin saqlangan file_id
                caption: `\n🏠 𝐌𝐚𝐧𝐳𝐢𝐥 𝐯𝐚 📞 𝐓𝐞𝐥𝐞𝐟𝐨𝐧 𝐫𝐚𝐪𝐚𝐦𝐢:\n\n<b>${basket.contact.text}</b>\n\n𝐦𝐚’𝐥𝐮𝐦𝐨𝐭𝐥𝐚𝐫 𝐭𝐨‘𝐠‘𝐫𝐢 𝐞𝐤𝐚𝐧𝐢𝐧𝐢 𝐭𝐚𝐬𝐝𝐢𝐪𝐥𝐚𝐧𝐠!\n❌ 𝐀𝐠𝐚𝐫 𝐦𝐚’𝐥𝐮𝐦𝐨𝐭𝐥𝐚𝐫 𝐧𝐨𝐭𝐨‘𝐠‘𝐫𝐢 𝐛𝐨‘𝐥𝐬𝐚, 𝐢𝐥𝐭𝐢𝐦𝐨𝐬, 𝐦𝐚𝐧𝐳𝐢𝐥 𝐯𝐚 𝐓𝐞𝐥𝐞𝐟𝐨𝐧 𝐫𝐚𝐪𝐚𝐦𝐥𝐚𝐫𝐢𝐧𝐢𝐳𝐧𝐢 𝐪𝐚𝐲𝐭𝐚 𝐤𝐢𝐫𝐢𝐭𝐢𝐧𝐠.`,
                // caption: `<b>‼️ 𝐘𝐞𝐭𝐤𝐚𝐳𝐢𝐛 𝐛𝐞𝐫𝐢𝐬𝐡 𝐮𝐜𝐡𝐮𝐧 𝐪𝐮𝐲𝐢𝐝𝐚𝐠𝐢𝐥𝐚𝐫𝐧𝐢 𝐲𝐨𝐳𝐢𝐧:</b>\n🏠 𝐌𝐚𝐧𝐳𝐢𝐥:\n📞 𝐓𝐞𝐥𝐞𝐟𝐨𝐧:\n𝐒𝐡𝐮𝐧𝐝𝐚𝐧 𝐬𝐨‘𝐧𝐠 𝐛𝐢𝐳𝐧𝐢𝐧𝐠 𝐤𝐮𝐫𝐲𝐞𝐫𝐥𝐚𝐫 🚚 𝐛𝐮𝐲𝐮𝐫𝐭𝐦𝐚𝐧𝐠𝐢𝐳𝐧𝐢 𝐞𝐬𝐡𝐢𝐠𝐢𝐧𝐠𝐢𝐳𝐠𝐚𝐜𝐡𝐚 𝐲𝐞𝐭𝐤𝐚𝐳𝐚𝐝𝐢! ✨`,
                parse_mode: 'HTML',
            },
            {
                reply_markup: Markup.inlineKeyboard([
                    [
                        Markup.button.callback('🔁📝 QAYTA MA’LUMOT KIRITISH!', `userProductsBuyGetContact`)
                    ],
                    [
                        Markup.button.callback('📝 🏠/📞 𝐓𝐀𝐒𝐃𝐈𝐐𝐋𝐀𝐒𝐇!', `enterTimeToDeliver`) // 🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛 / userProductsBuy
                    ],
                    [
                        Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userProductsBuyGetContact`),
                        Markup.button.callback('🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮', `userMenu`),
                    ]
                ]).reply_markup,
            }
        );
    }

    @Action('userMenu')
    async userMenu(@Ctx() ctx: Context) {
        await alertToUserAboutNotWorking(ctx);

        const chatId = ctx.chat?.id;
        if (!chatId) {
            await ctx.reply('❌ Chat aniqlanmadi.');
            return;
        }

        userAction.delete(chatId);

        const basket = baskets.get(chatId);

        if (basket && basket.length > 0) {

            let priceAll = 0;

            for (let i = 0; i < basket.length; i++) {
                const p = basket[i];
                priceAll += p.product.price * p.amount;
            }

            const buttons = [
                [Markup.button.callback('🛍️🛒𝑿𝒂𝒓𝒊𝒅𝒍𝒂𝒓𝒏𝒊 𝑩𝒆𝒌𝒐𝒓 𝑸𝒊𝒍𝒊𝒔𝒉❌', `userProductsDeleteButton`)],

                [
                    Markup.button.callback('🛒 𝙔𝙖𝙣𝙖 𝙢𝙖𝙭𝙨𝙪𝙡𝙤𝙩 𝙤𝙡𝙞𝙨𝙝', `userStart`),
                ]

            ]
            if (priceAll >= 40000) {
                buttons.push(
                    [
                        Markup.button.callback('🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛', `userProductsBuyGetContact`)
                    ]
                )
            }


            await ctx.editMessageMedia(
                {
                    type: 'photo',   // media turi majburiy!
                    media: 'AgACAgIAAxkBAAMQaSCeX8O-C7VDELEkGyuGEuk-EtoAAigQaxuawQhJKrUz_ZtgebsBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ',
                    caption: basket.map(p => `\n<b>${p.product.name}</b>\nNarxi: ${p.product.price} so'm\n${p.product.criterion === Criterion.kg ? `Kgmi: ${p.amount.toFixed(2)}` : p.product.criterion === Criterion.dona ? `Soni: ${p.amount}` : `Litri: ${p.amount}`}\nUmumiy: ${(p.product.price * p.amount).toFixed(2)} so'm`).join('\n') + `\n\n hozirda umumiy xarid narxi ${priceAll.toFixed(2)} so'm ${priceAll < 40_000 ? `\n eng kamida 40 000 so\'mlik maxsulotlar olinsa buyutrmani tasdiqlash imkoni ochiladi iltimos yana ${40000 - priceAll} so'mlik haxsulot qo'shing` : ''}`,
                    parse_mode: 'HTML',

                },
                {
                    reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
                }
            );

        } else {
            await ctx.editMessageMedia(
                {
                    type: 'photo',   // media turi majburiy!
                    media: 'AgACAgIAAxkBAAMQaSCeX8O-C7VDELEkGyuGEuk-EtoAAigQaxuawQhJKrUz_ZtgebsBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ',
                    caption: '𝑺𝑨𝑽𝑨𝑻🛒',
                    parse_mode: 'HTML',

                },
                {
                    reply_markup: Markup.inlineKeyboard([
                        [
                            Markup.button.callback('𝐗𝐀𝐑𝐈𝐃𝐋𝐀𝐑𝐍𝐈 𝐁𝐎𝐒𝐇𝐋𝐀𝐒𝐇🛍️', `userStart`),
                        ]
                    ]).reply_markup,
                }
            );
        }

        // const productType = await this.productTypeService.findAll();
        // const buttons = productType.map(pT => [
        //     Markup.button.callback(`${pT.name}`, `userProductType_${pT.id}`)
        // ])

        // await ctx.telegram.sendPhoto(
        //     chatId,
        //     'AgACAgIAAxkBAAMcaOD_qPNZStYzYagYsKOuRyrkfGEAAon6MRsNbglL1Tu3OUInRkEBAAMCAAN4AAM2BA',
        //     {
        //         caption: "harid qilinadigan maxsulotlarni tanlang",
        //         parse_mode: 'HTML',
        //         reply_markup: Markup.inlineKeyboard(buttons).reply_markup
        //     },
        // )

    }

    @Action(/stopsendMessage/)
    async stopsendMessage(@Ctx() ctx: Context) {
        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }
        const userOrAdmin = adminsendMessageUser.get(chatId);
        if (!userOrAdmin) {
            console.log('user va admin o\'rtasidagi suxbatni to\'xtatish uchun malumot topilmadi');
            ctx.deleteMessage();
            return;
        }

        await ctx.telegram.editMessageReplyMarkup(
            chatId,
            userOrAdmin.messageId,
            undefined, // inline message ID kerak bo‘lmasa undefined qoldiriladi
            Markup.inlineKeyboard([
                // Markup.button.callback("foydalanuvchiga xabar yuborish", `sendMessageToUser_${userOrAdmin.adminOrUser!.chatId}`)
            ]).reply_markup
        );

        await ctx.telegram.sendMessage(
            chatId,
            `${userOrAdmin.adminOrUser?.name} user bilan muloqot tugatildi`,
            {
                // reply_to_message_id: itm.messageId, // shu xabarga javob sifatida yuboradi
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "foydalanuvchiga xabar yuborish", callback_data: `sendMessageToUser_${userOrAdmin.adminOrUser!.chatId}` },
                        ]
                    ]
                }
            }
        );

        await ctx.telegram.sendMessage(
            userOrAdmin.adminOrUser!.chatId,
            `${userOrAdmin.name} admin bilan muloqot tugadildi`,
            // {
            //     // reply_to_message_id: itm.messageId, // shu xabarga javob sifatida yuboradi
            //     // reply_markup: {
            //     //     inline_keyboard: [
            //     //         [
            //     //             { text: "muloqotni tugatish", callback_data: `stopsendMessage_${userOrAdmin.chatId}` },
            //     //         ]
            //     //     ]
            //     // }
            // }
        );
        adminsendMessageUser.delete(userOrAdmin.chatId);
        adminsendMessageUser.delete(userOrAdmin.adminOrUser!.chatId);
    }

    @Action(/^enterTimeToDeliver$/)
    async enterTimeToDeliver(@Ctx() ctx: Context) {
        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }

        userAction.set(chatId, {
            chatId,
            // productId: +productId,
            method: 'getContactConfirmed'
        });

        await ctx.editMessageMedia(
            {
                type: 'photo',   // media turi majburiy!
                media: 'AgACAgIAAxkBAAMNaSCTdIpuUdJkunePJ2QsyErt8z8AAtoPaxuawQhJDl9m915aleoBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAIIEWkQJ5GqpLEAAQGiTmbLO6g_d_L1OAACbwtrGzrKgEhEW823n7ba5QEAAwIAA3gAAzYE',
                caption: ``,
                // caption: `<b>‼️ 𝐘𝐞𝐭𝐤𝐚𝐳𝐢𝐛 𝐛𝐞𝐫𝐢𝐬𝐡 𝐮𝐜𝐡𝐮𝐧 𝐢𝐤𝐤𝐢 𝐛𝐨𝐬𝐪𝐢𝐜𝐡𝐥𝐢 𝐦𝐚’𝐥𝐮𝐦𝐨𝐭 𝐤𝐢𝐫𝐢𝐭𝐢𝐬𝐡:</b>\n\n<i>① 𝐌𝐚𝐧𝐳𝐢𝐥 𝐯𝐚 𝐛𝐨𝐠‘𝐥𝐚𝐧𝐢𝐬𝐡 𝐮𝐜𝐡𝐮𝐧 𝐭𝐞𝐥𝐞𝐟𝐨𝐧 𝐫𝐚𝐪𝐚𝐦</i>\n⬜️ 𝐌𝐚𝐧𝐳𝐢𝐥 𝐯𝐚 𝐓𝐞𝐥𝐞𝐟𝐨𝐧 𝐫𝐚𝐪𝐚𝐦\n\n<i>② 𝐁𝐮𝐲𝐮𝐫𝐭𝐦𝐚𝐧𝐢 𝐪𝐚𝐛𝐮𝐥 𝐪𝐢𝐥𝐢𝐬𝐡 𝐮𝐜𝐡𝐮𝐧 𝐪𝐮𝐥𝐚𝐲 𝐯𝐚𝐪𝐭</i>\n⬜️ 𝐐𝐮𝐥𝐚𝐲 𝐯𝐚𝐪𝐭:\n\n<b>🏠 𝐌𝐚𝐧𝐳𝐢𝐥 𝐯𝐚 📞 𝐓𝐞𝐥𝐞𝐟𝐨𝐧 𝐫𝐚𝐪𝐚𝐦 𝐦𝐚’𝐥𝐮𝐦𝐨𝐭𝐥𝐚𝐫𝐧𝐢 𝐤𝐢𝐫𝐢𝐭𝐢𝐧𝐠</b>
                // caption: `⏰ 𝐘𝐞𝐭𝐤𝐚𝐳𝐢𝐛 𝐛𝐞𝐫𝐢𝐬𝐡 𝐮𝐜𝐡𝐮𝐧 𝐬𝐢𝐳𝐠𝐚 𝐪𝐮𝐥𝐚𝐲 𝐛𝐨‘𝐥𝐠𝐚𝐧 𝐯𝐚𝐪𝐭𝐧𝐢 𝐤𝐢𝐫𝐢𝐭𝐢𝐧𝐠:`,
                parse_mode: 'HTML',
            },
            {
                reply_markup: Markup.inlineKeyboard([
                    [
                        Markup.button.callback('⏱ 15 𝐃𝐀𝐐𝐈𝐐𝐀𝐃𝐀 𝐘𝐄𝐓𝐊𝐀𝐙𝐈𝐒𝐇', `_userProductsBuy`) // 🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛 / userProductsBuy
                    ],
                    [
                        Markup.button.callback('⏱️ 𝑸𝒖𝒍𝒂𝒚 𝒗𝒂𝒒𝒕𝒈𝒂 𝒚𝒆𝒕𝒌𝒂𝒛𝒊𝒔𝒉', `enterTimeToDeliverLater`) // 🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛 / userProductsBuy
                    ],
                    [
                        Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `cancelAddressAndPhone`),
                        Markup.button.callback('🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮', `userMenu`),
                    ]
                ]).reply_markup,
            }
        );
    }

    @Action(/^enterTimeToDeliverLater$/)
    async enterTimeToDeliverLater(@Ctx() ctx: Context) {
        const chatId = ctx.chat?.id;
        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }

        userAction.set(chatId, {
            chatId,
            // productId: +productId,
            method: 'enterTimeToDeliver'
        });

        await ctx.editMessageMedia(
            {
                type: 'photo',   // media turi majburiy!
                media: 'AgACAgIAAxkBAAMYaSClnn2AahkzGSyqX5o8bb62WqYAAuwPaxufnglJZgWeKSAruFwBAAMCAAN5AAM2BA',//'AgACAgIAAxkBAAIRJWkcSVPtzVnlG9tore3uPSMTNuNbAAJJDmsbsxbgSObDvvjQH0lVAQADAgADeQADNgQ',
                caption: `qabul qilish uchun qulay vaqtni kiring:`,
                // caption: `<b>‼️ 𝐘𝐞𝐭𝐤𝐚𝐳𝐢𝐛 𝐛𝐞𝐫𝐢𝐬𝐡 𝐮𝐜𝐡𝐮𝐧 𝐢𝐤𝐤𝐢 𝐛𝐨𝐬𝐪𝐢𝐜𝐡𝐥𝐢 𝐦𝐚’𝐥𝐮𝐦𝐨𝐭 𝐤𝐢𝐫𝐢𝐭𝐢𝐬𝐡:</b>\n\n<i>① 𝐌𝐚𝐧𝐳𝐢𝐥 𝐯𝐚 𝐛𝐨𝐠‘𝐥𝐚𝐧𝐢𝐬𝐡 𝐮𝐜𝐡𝐮𝐧 𝐭𝐞𝐥𝐞𝐟𝐨𝐧 𝐫𝐚𝐪𝐚𝐦</i>\n⬜️ 𝐌𝐚𝐧𝐳𝐢𝐥 𝐯𝐚 𝐓𝐞𝐥𝐞𝐟𝐨𝐧 𝐫𝐚𝐪𝐚𝐦\n\n<i>② 𝐁𝐮𝐲𝐮𝐫𝐭𝐦𝐚𝐧𝐢 𝐪𝐚𝐛𝐮𝐥 𝐪𝐢𝐥𝐢𝐬𝐡 𝐮𝐜𝐡𝐮𝐧 𝐪𝐮𝐥𝐚𝐲 𝐯𝐚𝐪𝐭</i>\n⬜️ 𝐐𝐮𝐥𝐚𝐲 𝐯𝐚𝐪𝐭:\n\n<b>🏠 𝐌𝐚𝐧𝐳𝐢𝐥 𝐯𝐚 📞 𝐓𝐞𝐥𝐞𝐟𝐨𝐧 𝐫𝐚𝐪𝐚𝐦 𝐦𝐚’𝐥𝐮𝐦𝐨𝐭𝐥𝐚𝐫𝐧𝐢 𝐤𝐢𝐫𝐢𝐭𝐢𝐧𝐠</b>
                // caption: `⏰ 𝐘𝐞𝐭𝐤𝐚𝐳𝐢𝐛 𝐛𝐞𝐫𝐢𝐬𝐡 𝐮𝐜𝐡𝐮𝐧 𝐬𝐢𝐳𝐠𝐚 𝐪𝐮𝐥𝐚𝐲 𝐛𝐨‘𝐥𝐠𝐚𝐧 𝐯𝐚𝐪𝐭𝐧𝐢 𝐤𝐢𝐫𝐢𝐭𝐢𝐧𝐠:`,
                parse_mode: 'HTML',
            },
            {
                reply_markup: Markup.inlineKeyboard([
                    [
                        Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `enterTimeToDeliver`),
                        Markup.button.callback('🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮', `userMenu`),
                    ]
                ]).reply_markup,
            }
        );

    }


    @On('message')
    async onAnyMessage(@Ctx() ctx: Context) {
        const chatId = ctx.chat?.id;


        if (!chatId) {
            console.log('chatId aniqlanmadi');
            return;
        }

        const messageId = ctx.message?.message_id;
        if (!messageId) {
            console.log('messageId aniqlanmadi');
            return;
        }

        const userOrAdmin = adminsendMessageUser.get(chatId);

        if (userOrAdmin) {
            await ctx.telegram.copyMessage(userOrAdmin.adminOrUser!.chatId, chatId, messageId,);
            return;
        }

        const msg = ctx.message;

        if (isTextMessage(msg)) {
            // await ctx.reply(`msg: ${JSON.stringify(msg)}`);
            // console.log('msg: ', JSON.stringify(msg));

            const user = userAction.get(chatId);

            if (!user) {
                await this.start(ctx);
                return;
            }

            if (user.method === 'markNotWorking') {
                reasonOfPause = msg.text;
                isworkTime = false;
                return;
            }

            if (user.method === 'getContact') {
                const basket = baskets.get(chatId);
                basket.contact = msg.text;


                const message_id = messageId_chatId.get(chatId);

                if (message_id) {
                    await ctx.telegram.editMessageReplyMarkup(
                        chatId,
                        message_id,
                        undefined,
                        { inline_keyboard: [] }
                    );

                    // const caption = basket.map(p => `\n<b>${p.product.name}</b>\n ${p.product.price} ${p.product.criterion} / so'm\n${p.product.criterion === Criterion.kg ? `Kgmi: ${p.amount.toFixed(2)}` : p.product.criterion === Criterion.dona ? `Soni: ${p.amount}` : `Litri: ${p.amount}`}\nUmumiy: ${(p.product.price * p.amount).toFixed(2)} so'm`).join('\n');

                    // await ctx.telegram.editMessageMedia(
                    //     chatId,
                    //     message_id,
                    //     undefined, // inline_message_id (web apps uchun) - kerak emas
                    //     {
                    //         type: 'photo',
                    //         media: 'AgACAgIAAxkBAAMQaSCeX8O-C7VDELEkGyuGEuk-EtoAAigQaxuawQhJKrUz_ZtgebsBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ',
                    //         caption: caption,
                    //         parse_mode: 'HTML'
                    //     },
                    //     {
                    //         reply_markup: Markup.inlineKeyboard([
                    //             // [Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', 'productTypes')]
                    //         ]).reply_markup
                    //     }
                    // );
                }

                if (!basket) {

                    const message = await ctx.replyWithPhoto(
                        'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ', // bu yerda product.photoFileId — bu oldin saqlangan file_id
                        {
                            caption: `${msg.text}\n sizning savatingiz nimagadur topilmadi`,
                            parse_mode: 'HTML',
                            reply_markup: Markup.inlineKeyboard([
                                // [
                                //     Markup.button.callback('🔁📝 QAYTA MA’LUMOT KIRITISH!', `userProductsBuyGetContact`)
                                // ],
                                // [
                                //     Markup.button.callback('🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛', `userProductsBuy`)
                                // ],
                                [
                                    // Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userProductsBuyGetContact`),
                                    Markup.button.callback('🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮', `userMenu`),
                                ]
                            ]).reply_markup,
                        }
                    );

                    messageId_chatId.set(chatId, message.message_id);
                    return;

                }

                // clearChat(chatId, ctx);


                const message = await ctx.replyWithPhoto(
                    'AgACAgIAAxkBAAMMaSCSmrEofnnuf_vGT08Pqv34DvIAAtQPaxuawQhJkI0zkoPM5zQBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ', // bu yerda product.photoFileId — bu oldin saqlangan file_id
                    {
                        caption: `\n🏠 𝐌𝐚𝐧𝐳𝐢𝐥 𝐯𝐚 📞 𝐓𝐞𝐥𝐞𝐟𝐨𝐧 𝐫𝐚𝐪𝐚𝐦𝐢:\n\n<b>${msg.text}</b>\n\n𝐦𝐚’𝐥𝐮𝐦𝐨𝐭𝐥𝐚𝐫 𝐭𝐨‘𝐠‘𝐫𝐢 𝐞𝐤𝐚𝐧𝐢𝐧𝐢 𝐭𝐚𝐬𝐝𝐢𝐪𝐥𝐚𝐧𝐠!\n❌ 𝐀𝐠𝐚𝐫 𝐦𝐚’𝐥𝐮𝐦𝐨𝐭𝐥𝐚𝐫 𝐧𝐨𝐭𝐨‘𝐠‘𝐫𝐢 𝐛𝐨‘𝐥𝐬𝐚, 𝐢𝐥𝐭𝐢𝐦𝐨𝐬, 𝐦𝐚𝐧𝐳𝐢𝐥 𝐯𝐚 𝐓𝐞𝐥𝐞𝐟𝐨𝐧 𝐫𝐚𝐪𝐚𝐦𝐥𝐚𝐫𝐢𝐧𝐢𝐳𝐧𝐢 𝐪𝐚𝐲𝐭𝐚 𝐤𝐢𝐫𝐢𝐭𝐢𝐧𝐠.`,
                        // caption: `${msg.text}\n\n📝 Ma’lumotlarni tekshiring va agar hammasi to‘g‘ri bo‘lsa,\n“🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛”\ntugmasini bosing!`,
                        parse_mode: 'HTML',
                        reply_markup: Markup.inlineKeyboard([
                            [
                                Markup.button.callback('🔁📝 QAYTA MA’LUMOT KIRITISH!', `userProductsBuyGetContact`)
                            ],
                            [
                                Markup.button.callback('📝 🏠/📞 𝐓𝐀𝐒𝐃𝐈𝐐𝐋𝐀𝐒𝐇!', `enterTimeToDeliver`) // 🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛 / userProductsBuy
                            ],
                            [
                                Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userProductsBuyGetContact`),
                                Markup.button.callback('🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮', `userMenu`),
                            ]
                        ]).reply_markup,
                    }
                );

                messageId_chatId.set(chatId, message.message_id);

                return;
            }

            if (user.method === 'getContactConfirmed') {
                const basket = baskets.get(chatId);
                // basket.contact = msg.text;


                const message_id = messageId_chatId.get(chatId);

                if (message_id) {
                    await ctx.telegram.editMessageReplyMarkup(
                        chatId,
                        message_id,
                        undefined,
                        { inline_keyboard: [] }
                    );

                    // const caption = basket.map(p => `\n<b>${p.product.name}</b>\n ${p.product.price} ${p.product.criterion} / so'm\n${p.product.criterion === Criterion.kg ? `Kgmi: ${p.amount.toFixed(2)}` : p.product.criterion === Criterion.dona ? `Soni: ${p.amount}` : `Litri: ${p.amount}`}\nUmumiy: ${(p.product.price * p.amount).toFixed(2)} so'm`).join('\n');

                    // await ctx.telegram.editMessageMedia(
                    //     chatId,
                    //     message_id,
                    //     undefined, // inline_message_id (web apps uchun) - kerak emas
                    //     {
                    //         type: 'photo',
                    //         media: 'AgACAgIAAxkBAAMQaSCeX8O-C7VDELEkGyuGEuk-EtoAAigQaxuawQhJKrUz_ZtgebsBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ',
                    //         caption: caption,
                    //         parse_mode: 'HTML'
                    //     },
                    //     {
                    //         reply_markup: Markup.inlineKeyboard([
                    //             // [Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', 'productTypes')]
                    //         ]).reply_markup
                    //     }
                    // );
                }

                if (!basket) {

                    const message = await ctx.replyWithPhoto(
                        'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ', // bu yerda product.photoFileId — bu oldin saqlangan file_id
                        {
                            caption: `${msg.text}\n sizning savatingiz nimagadur topilmadi`,
                            parse_mode: 'HTML',
                            reply_markup: Markup.inlineKeyboard([
                                // [
                                //     Markup.button.callback('🔁📝 QAYTA MA’LUMOT KIRITISH!', `userProductsBuyGetContact`)
                                // ],
                                // [
                                //     Markup.button.callback('🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛', `userProductsBuy`)
                                // ],
                                [
                                    // Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userProductsBuyGetContact`),
                                    Markup.button.callback('🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮', `userMenu`),
                                ]
                            ]).reply_markup,
                        }
                    );

                    messageId_chatId.set(chatId, message.message_id);
                    return;

                }

                // clearChat(chatId, ctx);


                const message = await ctx.replyWithPhoto(
                    'AgACAgIAAxkBAAMNaSCTdIpuUdJkunePJ2QsyErt8z8AAtoPaxuawQhJDl9m915aleoBAAMCAAN4AAM2BA',//'AgACAgIAAxkBAAIIEWkQJ5GqpLEAAQGiTmbLO6g_d_L1OAACbwtrGzrKgEhEW823n7ba5QEAAwIAA3gAAzYE',
                    {
                        caption: ``,
                        // caption: `${msg.text}\n\n📝 Ma’lumotlarni tekshiring va agar hammasi to‘g‘ri bo‘lsa,\n“🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛”\ntugmasini bosing!`,
                        parse_mode: 'HTML',
                        reply_markup: Markup.inlineKeyboard([
                            [
                                Markup.button.callback('⏱ 15 𝐃𝐀𝐐𝐈𝐐𝐀𝐃𝐀 𝐘𝐄𝐓𝐊𝐀𝐙𝐈𝐒𝐇', `_userProductsBuy`) // 🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛 / userProductsBuy
                            ],
                            [
                                Markup.button.callback('⏱️ 𝑸𝒖𝒍𝒂𝒚 𝒗𝒂𝒒𝒕𝒈𝒂 𝒚𝒆𝒕𝒌𝒂𝒛𝒊𝒔𝒉', `enterTimeToDeliverLater`) // 🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛 / userProductsBuy
                            ],
                            [
                                Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `cancelAddressAndPhone`),
                                Markup.button.callback('🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮', `userMenu`),
                            ]
                        ]).reply_markup,
                    }
                );

                messageId_chatId.set(chatId, message.message_id);

                return;
            }

            if (user.method === 'enterTimeToDeliver') {
                const basket = baskets.get(chatId);
                basket.deliveryTime = msg.text;


                const message_id = messageId_chatId.get(chatId);

                if (message_id) {

                    await ctx.telegram.editMessageReplyMarkup(
                        chatId,
                        message_id,
                        undefined,
                        { inline_keyboard: [] }
                    );

                    // const caption = 'message id topa olmay qoldiku'; //basket.map(p => `\n<b>${p.product.name}</b>\n ${p.product.price} ${p.product.criterion} / so'm\n${p.product.criterion === Criterion.kg ? `Kgmi: ${p.amount.toFixed(2)}` : p.product.criterion === Criterion.dona ? `Soni: ${p.amount}` : `Litri: ${p.amount}`}\nUmumiy: ${(p.product.price * p.amount).toFixed(2)} so'm`).join('\n');

                    // await ctx.telegram.editMessageMedia(
                    //     chatId,
                    //     message_id,
                    //     undefined, // inline_message_id (web apps uchun) - kerak emas
                    //     {
                    //         type: 'photo',
                    //         media: 'AgACAgIAAxkBAAMYaSClnn2AahkzGSyqX5o8bb62WqYAAuwPaxufnglJZgWeKSAruFwBAAMCAAN5AAM2BA',//'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ',
                    //         caption: caption,
                    //         parse_mode: 'HTML'
                    //     },
                    //     {
                    //         reply_markup: Markup.inlineKeyboard([
                    //             // [Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', 'productTypes')]
                    //         ]).reply_markup
                    //     }
                    // );
                }

                if (!basket) {

                    const message = await ctx.replyWithPhoto(
                        'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ', // bu yerda product.photoFileId — bu oldin saqlangan file_id
                        {
                            caption: `${msg.text}\n sizning savatingiz nimagadur topilmadi`,
                            parse_mode: 'HTML',
                            reply_markup: Markup.inlineKeyboard([
                                // [
                                //     Markup.button.callback('🔁📝 QAYTA MA’LUMOT KIRITISH!', `userProductsBuyGetContact`)
                                // ],
                                // [
                                //     Markup.button.callback('🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛', `userProductsBuy`)
                                // ],
                                [
                                    // Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userProductsBuyGetContact`),
                                    Markup.button.callback('🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮', `userMenu`),
                                ]
                            ]).reply_markup,
                        }
                    );

                    messageId_chatId.set(chatId, message.message_id);
                    return;

                }

                // clearChat(chatId, ctx);


                const message = await ctx.replyWithPhoto(
                    'AgACAgIAAxkBAAMYaSClnn2AahkzGSyqX5o8bb62WqYAAuwPaxufnglJZgWeKSAruFwBAAMCAAN5AAM2BA',//'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ', // bu yerda product.photoFileId — bu oldin saqlangan file_id
                    {
                        caption: `📝 📦⏱️ 𝐁𝐮𝐲𝐮𝐫𝐭𝐦𝐚\n\n${msg.text}\n vaqtga 𝐲𝐞𝐭𝐤𝐚𝐳𝐢𝐥𝐚𝐝𝐢.\n𝐘𝐞𝐭𝐤𝐚𝐳𝐢𝐬𝐡𝐧𝐢 𝐭𝐚𝐬𝐝𝐢𝐪𝐥𝐚𝐲𝐬𝐢𝐳𝐦𝐢?`,
                        parse_mode: 'HTML',
                        reply_markup: Markup.inlineKeyboard([
                            [
                                Markup.button.callback('🔁📝 QAYTA MA’LUMOT KIRITISH!', `enterTimeToDeliverLater`)
                            ],
                            [
                                Markup.button.callback('📝 🕒 𝐓𝐀𝐒𝐃𝐈𝐐𝐋𝐀𝐒𝐇!', `userProductsBuy`) // 🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛 / userProductsBuy
                            ],
                            [
                                Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `enterTimeToDeliverLater`),
                                Markup.button.callback('🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮', `userMenu`),
                            ]
                        ]).reply_markup,
                    }
                );

                messageId_chatId.set(chatId, message.message_id);

                return;
            }
            //deliveryWithin_15Minutes
            if (user.method === 'deliveryWithin_15Minutes') {
                const basket = baskets.get(chatId);
                basket.deliveryTime = 'belgilangan 15 minutda yetkazish so\'ralgan';


                const message_id = messageId_chatId.get(chatId);

                if (message_id) {
                    await ctx.telegram.editMessageReplyMarkup(
                        chatId,
                        message_id,
                        undefined,
                        { inline_keyboard: [] }
                    );

                    // const caption = 'bu yerga mazil kiritilgani haqida malumot yozamiz' //basket.map(p => `\n<b>${p.product.name}</b>\n ${p.product.price} ${p.product.criterion} / so'm\n${p.product.criterion === Criterion.kg ? `Kgmi: ${p.amount.toFixed(2)}` : p.product.criterion === Criterion.dona ? `Soni: ${p.amount}` : `Litri: ${p.amount}`}\nUmumiy: ${(p.product.price * p.amount).toFixed(2)} so'm`).join('\n');

                    // await ctx.telegram.editMessageMedia(
                    //     chatId,
                    //     message_id,
                    //     undefined, // inline_message_id (web apps uchun) - kerak emas
                    //     {
                    //         type: 'photo',
                    //         media: 'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ',
                    //         caption: caption,
                    //         parse_mode: 'HTML'
                    //     },
                    //     {
                    //         reply_markup: Markup.inlineKeyboard([
                    //             // [Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', 'productTypes')]
                    //         ]).reply_markup
                    //     }
                    // );
                }

                if (!basket) {

                    const message = await ctx.replyWithPhoto(
                        'AgACAgIAAxkBAAMPaSCdu4gRail6kBvvpzFrAxj53EQAAiYQaxuawQhJrU-HA884XmkBAAMCAAN5AAM2BA',//'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ', // bu yerda product.photoFileId — bu oldin saqlangan file_id
                        {
                            caption: `${msg.text}\n sizning savatingiz nimagadur topilmadi`,
                            parse_mode: 'HTML',
                            reply_markup: Markup.inlineKeyboard([
                                // [
                                //     Markup.button.callback('🔁📝 QAYTA MA’LUMOT KIRITISH!', `userProductsBuyGetContact`)
                                // ],
                                // [
                                //     Markup.button.callback('🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛', `userProductsBuy`)
                                // ],
                                [
                                    // Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userProductsBuyGetContact`),
                                    Markup.button.callback('🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮', `userMenu`),
                                ]
                            ]).reply_markup,
                        }
                    );

                    messageId_chatId.set(chatId, message.message_id);
                    return;

                }

                // clearChat(chatId, ctx);


                const message = await ctx.replyWithPhoto(
                    'AgACAgIAAxkBAAMPaSCdu4gRail6kBvvpzFrAxj53EQAAiYQaxuawQhJrU-HA884XmkBAAMCAAN5AAM2BA',//'AgACAgIAAxkBAAIDe2j0RYX7TW88X549QLMFwtN1bIuxAAKq_zEbBd-hSzdyTF5-6IqSAQADAgADeAADNgQ', // bu yerda product.photoFileId — bu oldin saqlangan file_id
                    {
                        caption: `📦⏱️ 𝐁𝐮𝐲𝐮𝐫𝐭𝐦𝐚 15 𝐝𝐚𝐪𝐢𝐪𝐚𝐝𝐚 𝐲𝐞𝐭𝐤𝐚𝐳𝐢𝐥𝐚𝐝𝐢.\n𝐘𝐞𝐭𝐤𝐚𝐳𝐢𝐬𝐡𝐧𝐢 𝐭𝐚𝐬𝐝𝐢𝐪𝐥𝐚𝐲𝐬𝐢𝐳𝐦𝐢?`,
                        // caption: `${msg.text}\n\n📝 Ma’lumotlarni tekshiring va agar hammasi to‘g‘ri bo‘lsa,\n“🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛”\ntugmasini bosing!`,
                        parse_mode: 'HTML',
                        reply_markup: Markup.inlineKeyboard([
                            [
                                Markup.button.callback('📝 🕒 𝐓𝐀𝐒𝐃𝐈𝐐𝐋𝐀𝐒𝐇!', `userProductsBuy`) // 🚚 𝗬𝗘𝗧𝗞𝗔𝗭𝗜𝗕 𝗕𝗘𝗥𝗜𝗦𝗛 / userProductsBuy
                            ],
                            [
                                Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `enterTimeToDeliver`),
                                Markup.button.callback('🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮', `userMenu`),
                            ]
                        ]).reply_markup,
                    }
                );

                messageId_chatId.set(chatId, message.message_id);

                return;
            }

            if (user.method === 'productDelivery') {
                await ctx.reply(`bir oz kuting admin keyingi buyutma uchun alohida ruhsat ochib beradi`);
                return;
            }

            clearChat(chatId, ctx);

            const product = await this.productService.findOne(+user.productId);
            if (!product) {
                console.log('product topilmadi');
                return;
            }

            let amount = parseFloat(msg.text.split(' ').join('').trim());
            if (isNaN(Number(amount))) {

                let message;
                if (user.method === 'addProductDona') {
                    message = await ctx.replyWithPhoto(
                        product.photo, // bu yerda product.photoFileId — bu oldin saqlangan file_id
                        {
                            caption: `nomi: ${product.name}\nnarxi(so'm): ${product.price}\n necha dona xarid qilishingizni kiriting: `,
                            parse_mode: 'HTML',
                            reply_markup: Markup.inlineKeyboard([
                                [
                                    Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userProduct_${product.id}`),
                                    Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
                                ]
                            ]).reply_markup,
                        }
                    );
                    messageId_chatId.set(chatId, message.message_id);
                    return;
                } else if (user.method === 'addProductKgKg') {
                    message = await ctx.replyWithPhoto(
                        product.photo, // bu yerda product.photoFileId — bu oldin saqlangan file_id
                        {
                            caption: `nomi: ${product.name}\nnarxi(so'm): ${product.price}\n necha kg xarid qilishingizni kiriting: `,
                            parse_mode: 'HTML',
                            reply_markup: Markup.inlineKeyboard([
                                [
                                    Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userProduct_${product.id}`),
                                    Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
                                ]
                            ]).reply_markup,
                        }
                    );
                    messageId_chatId.set(chatId, message.message_id);
                    return;
                } else if (user.method === 'addProductKgSum') {
                    message = await ctx.replyWithPhoto(
                        product.photo, // bu yerda product.photoFileId — bu oldin saqlangan file_id
                        {
                            caption: `nomi: ${product.name}\nnarxi(so'm): ${product.price}\n necha so'mga xarid qilishingizni kiriting: `,
                            parse_mode: 'HTML',
                            reply_markup: Markup.inlineKeyboard([
                                [
                                    Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userProduct_${product.id}`),
                                    Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
                                ]
                            ]).reply_markup,
                        }
                    );
                    messageId_chatId.set(chatId, message.message_id);
                    return;
                } else if (user.method === 'addProductLitr') {
                    message = await ctx.replyWithPhoto(
                        product.photo, // bu yerda product.photoFileId — bu oldin saqlangan file_id
                        {
                            caption: `nomi: ${product.name}\nnarxi(so'm): ${product.price}\n necha Litr xarid qilishingizni kiriting: `,
                            parse_mode: 'HTML',
                            reply_markup: Markup.inlineKeyboard([
                                [
                                    Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `userProduct_${product.id}`),
                                    Markup.button.callback(`🏠𝐁𝐨𝐬𝐡𝐦𝐞𝐧𝐲𝐮`, `userMenu`),
                                ]
                            ]).reply_markup,
                        }
                    );
                    messageId_chatId.set(chatId, message.message_id);
                    return;
                }
                console.log('addProduct nomalum button bosildi');
                return;
            }

            if (user.method === 'addProductDona') {
                const purchasedProduct = {
                    product,
                    amount
                }
                basketsTemp.set(chatId, purchasedProduct);
                // await productTypesMenu(ctx, this.productTypeService, false);
                const message = await ctx.replyWithPhoto(
                    product.photo,
                    {
                        caption: `${product.name}ni ${product.price} so'mdan ${purchasedProduct.amount} dona buyurtmani tasdiqlaysizmi?`,
                        parse_mode: 'HTML',
                        reply_markup: Markup.inlineKeyboard([
                            [Markup.button.callback('Tasdiqlash ✅', `userProductApproval_${product.id}`)],
                            [Markup.button.callback('harid qilmaslik ❌', `userProduct_${user.productId}`)]
                        ]).reply_markup,
                    }
                );
                messageId_chatId.set(chatId, message.message_id);
                return;
            }

            if (user.method === 'addProductKgKg') {
                const purchasedProduct = {
                    product,
                    amount
                }
                basketsTemp.set(chatId, purchasedProduct);
                // await productTypesMenu(ctx, this.productTypeService, false);
                const message = await ctx.replyWithPhoto(
                    product.photo,
                    {
                        caption: `${product.name}ni ${product.price} so'mdan ${purchasedProduct.amount} kg ${purchasedProduct.amount * (product.price || 0)} buyurtmani tasdiqlaysizmi?`,
                        parse_mode: 'HTML',
                        reply_markup: Markup.inlineKeyboard([
                            [Markup.button.callback('Tasdiqlash ✅', `userProductApproval_${product.id}`)],
                            [Markup.button.callback('harid qilmaslik ❌', `userProduct_${user.productId}`)]
                        ]).reply_markup,
                    }
                );
                messageId_chatId.set(chatId, message.message_id);
                return;
            }

            if (user.method === 'addProductKgSum') {
                const purchasedProduct = {
                    product,
                    amount: amount / (product.price || 1)
                }
                console.log('amount: ', amount, "\nprice: ", product.price);
                basketsTemp.set(chatId, purchasedProduct);
                // await productTypesMenu(ctx, this.productTypeService, false);
                const message = await ctx.replyWithPhoto(
                    product.photo,
                    {
                        caption: `${product.name}ni ${product.price} so'mdan ${purchasedProduct.amount.toFixed(2)} kgni ${amount} so'mga olish buyurtmani tasdiqlaysizmi?`,
                        parse_mode: 'HTML',
                        reply_markup: Markup.inlineKeyboard([
                            [Markup.button.callback('Tasdiqlash ✅', `userProductApproval_${product.id}`)],
                            [Markup.button.callback('harid qilmaslik ❌', `userProduct_${user.productId}`)]
                        ]).reply_markup,
                    }
                );
                messageId_chatId.set(chatId, message.message_id);
                return;
            }

            if (user.method === 'addProductLitr') {
                const purchasedProduct = {
                    product,
                    amount
                }
                basketsTemp.set(chatId, purchasedProduct);
                // await productTypesMenu(ctx, this.productTypeService, false);
                const message = await ctx.replyWithPhoto(
                    product.photo,
                    {
                        caption: `${product.name}ni ${product.price} so'mdan ${purchasedProduct.amount} Litrni ${purchasedProduct.amount * (product.price || 0)} so'mga olish buyurtmani tasdiqlaysizmi?`,
                        parse_mode: 'HTML',
                        reply_markup: Markup.inlineKeyboard([
                            [Markup.button.callback('Tasdiqlash ✅', `userProductApproval_${product.id}`)],
                            [Markup.button.callback('harid qilmaslik ❌', `userProduct_${user.productId}`)]
                        ]).reply_markup,
                    }
                );
                messageId_chatId.set(chatId, message.message_id);
                return;
            }
        }

        if (isPhotoMessage(msg)) {
            const chatId = ctx.chat?.id;

            if (!chatId) {
                console.log('chatId aniqlanmadi');
                return;
            }

            const admin = adminAction.get(chatId);
            if (!admin) {
                console.log('admin hech qanday amal bajargani yuq');
                return;
            }
            const photos = msg.photo;
            const fileId = photos[photos.length - 1].file_id;
            const caption = msg.caption || '(izoh yo‘q)';

            if (admin.method === 'addProductType') {
                await this.productTypeService.create(caption, fileId);
                await productTypesMenu(ctx, this.productTypeService, false);
            } else if (admin.method === 'addProduct') {
                console.log('caption', caption);
                const [name, price, _criterion, description] = caption.split('\n');
                console.log('name', name, ' pcice:', price, 'description: ', description);
                if (!(_criterion.trim().toLocaleLowerCase() in Criterion)) {
                    await ctx.reply('❌ Noto‘g‘ri qiymat!');
                    // await ctx.answerCbQuery('Foydalanuvchi admin qilindi ✅', { show_alert: true });
                    return;
                }
                console.log('criterion: |' + _criterion.trim().toLocaleLowerCase() + '|');
                const criterion = _criterion.trim().toLocaleLowerCase() as Criterion;
                await this.productService.create({ name, productBrandId: admin.productBrandId, price: +price, criterion, description, photo: fileId });
                await productBrandId(ctx, this.productService, this.productBrandService, false, admin.productBrandId);
            } else if (admin.method === 'productEdit') {
                console.log('caption', caption);
                const [name, price, _criterion, description] = caption.split('\n');
                console.log('name', name, ' pcice:', price, 'description: ', description);
                if (!(_criterion.trim().toLocaleLowerCase() in Criterion)) {
                    await ctx.reply('❌ Noto‘g‘ri qiymat!');
                    // await ctx.answerCbQuery('Foydalanuvchi admin qilindi ✅', { show_alert: true });
                    return;
                }
                const criterion = _criterion.trim().toLocaleLowerCase() as Criterion;
                console.log('_criterion: ', criterion);
                await this.productService.update(admin.productId, { name, price: +price, criterion, description, photo: fileId });
                await productId(ctx, this.productService, false, admin.productId);
            } else if (admin.method === 'addProductBrand') {
                await this.productBrandService.create(caption, fileId, admin.productTypeId);
                await productTypeId(ctx, this.productTypeService, this.productBrandService, false, admin.productTypeId);
            }
        }
    }


    // @On('text')
    // async onText(@Ctx() ctx: Context) {
    //     const msg = ctx.message;

    // }

    // @On('photo')
    // async onPhoto(@Ctx() ctx: Context) {
    //     const msg = ctx.message;
    //     console.log('msg: ', msg);

    // }
}

function productInBasket(basket: any[], approvalProduct: any) {
    const temp = basket.find(item => item.product.id === approvalProduct.product.id);
    if (temp) {
        temp.amount = approvalProduct.amount;
    } else {
        basket.push(approvalProduct);
    }
}

function isPhotoMessage(msg: any): msg is { photo: any[], caption?: string } {
    return msg && Array.isArray(msg.photo);
}

function isTextMessage(msg: any): msg is { text: string } {
    return msg && typeof msg.text === 'string';
}

async function productTypesMenu(ctx: Context, productTypeService: ProductTypeService, is_edit: boolean) {
    const productTypes = await productTypeService.findAll();
    const buttons = productTypes.map(pT => [
        Markup.button.callback(`type: ${pT.name}`, `productType_${pT.id}`),
    ]);
    buttons.push([
        Markup.button.callback('maxsulot turini qo\'shish', 'productTypeAdd')
    ]);
    buttons.push([
        Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', 'homeMenu')
    ]);

    if (is_edit) {
        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: 'AgACAgIAAxkBAAMWaSCgpIb_sP5BbN-u38ZQnXhfAnIAAkMQaxuawQhJnGfmEC2XGDIBAAMCAAN5AAM2BA',//'AgACAgIAAxkBAAMcaOD_qPNZStYzYagYsKOuRyrkfGEAAon6MRsNbglL1Tu3OUInRkEBAAMCAAN4AAM2BA',
                caption: 'maxsulot turlari',
                parse_mode: 'HTML', // kerak bo‘lsa
            },
            {
                reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
            }
        );
    } else {
        await ctx.replyWithPhoto(
            'AgACAgIAAxkBAAMWaSCgpIb_sP5BbN-u38ZQnXhfAnIAAkMQaxuawQhJnGfmEC2XGDIBAAMCAAN5AAM2BA',//'AgACAgIAAxkBAAMcaOD_qPNZStYzYagYsKOuRyrkfGEAAon6MRsNbglL1Tu3OUInRkEBAAMCAAN4AAM2BA',
            {
                caption: 'maxsulot turlari',
                parse_mode: 'HTML',
                reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
            }
        );
    }


}

async function productTypeId(ctx: Context, productTypeService: ProductTypeService, productBrandService: ProductBrandService, is_edit: boolean, product_type_id: number | null) {

    if (is_edit) {
        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const parts = callback.data.split('_');
        const id = product_type_id !== null ? product_type_id : parts.length === 2 ? parts[1] : null;

        if (!id) {
            await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
            return;
        }

        const productType = await productTypeService.findOne(+id);
        if (!productType) {
            console.log('productType topilmadi id: ', id);
            return;
        }
        const productBrands = await productBrandService.findAll(+id);
        const buttons = productBrands.map(pT => [
            Markup.button.callback(`brand: ${pT.name}`, `productBrand_${pT.id}`),
        ]);

        buttons.push([
            Markup.button.callback('brand qo\'shish', `productBrandAdd_${id}`),      //`productTypeRemove_${id}`
            Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', 'productTypes')
        ]);
        buttons.push([
            Markup.button.callback('bu turni o\'chir', `productTypeTempRemove_${id}`),
        ])

        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: productType.photo,
                caption: productType.name,
                parse_mode: 'HTML', // kerak bo‘lsa
            },
            {
                reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
            }
        );
    } else {
        // console.log('send uchun ');

        const chatId = ctx.chat?.id;
        if (!chatId) {
            await ctx.reply('❌ Chat aniqlanmadi.');
            return;
        }

        if (!product_type_id) {
            console.log('product_type_id qiymat yuq: id: ', product_type_id);
            return;
        }
        const productBrands = await productBrandService.findAll(+product_type_id);
        const buttons = productBrands.map(pB => [
            Markup.button.callback(`brand: ${pB.name}`, `productBrand_${pB.id}`),
        ]);

        const productType = await productTypeService.findOne(product_type_id);
        if (!productType) {
            console.log('productType topilmadi id: ', product_type_id);
            return;
        }

        buttons.push([
            Markup.button.callback('brand qo\'shish', `productBrandAdd_${product_type_id}`),    //productTypeRemove_${product_type_id}
            Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', 'productTypes')
        ]);
        buttons.push([
            Markup.button.callback('bu turni o\'chir', `productTypeTempRemove_${product_type_id}`),
        ])

        await ctx.telegram.sendPhoto(
            chatId,
            productType.photo,
            {
                caption: productType.name,
                parse_mode: 'HTML',
                reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
            },
        )
    }
}

async function productBrandId(ctx: Context, productService: ProductService, productBrandService: ProductBrandService, is_edit: boolean, product_brand_id: number | null) {
    if (is_edit) {
        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const parts = callback.data.split('_');
        const brandId = product_brand_id !== null ? product_brand_id : parts.length === 2 ? +parts[1] : null;

        if (!brandId) {
            await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
            return;
        }

        const productBrand = await productBrandService.findOne(brandId);
        if (!productBrand) {
            console.log('productbrand topilmadi id: ', brandId);
            return;
        }

        const products = await productService.findAll(brandId, true);
        const buttons = products.map(p => [
            Markup.button.callback(`${p.name}, ${p.price} so'm`, `product_${p.id}`),
        ]);

        console.log('productBrand: ', productBrand);

        buttons.push([
            Markup.button.callback('product qo\'shish', `productAdd_${brandId}`),
            Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `productType_${productBrand.productType.id}`)
        ]);

        buttons.push([
            Markup.button.callback('bu brandni o\'chir', `productBrandTempRemove_${brandId}`)
        ]);


        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: productBrand.photo,
                caption: productBrand.name,
                parse_mode: 'HTML', // kerak bo‘lsa
            },
            {
                reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
            }
        );
    } else {
        // console.log('send uchun ');

        const chatId = ctx.chat?.id;
        if (!chatId) {
            await ctx.reply('❌ Chat aniqlanmadi.');
            return;
        }

        if (!product_brand_id) {
            console.log('product_type_id qiymat yuq: id: ', product_brand_id);
            return;
        }

        const productBrand = await productBrandService.findOne(product_brand_id);
        if (!productBrand) {
            console.log('productbrand topilmadi id: ', product_brand_id);
            return;
        }

        const products = await productService.findAll(product_brand_id, true);
        const buttons = products.map(p => [
            Markup.button.callback(`${p.name}, ${p.price} so'm`, `product_${p.id}`),
        ]);

        console.log('productBrand: ', productBrand);


        buttons.push([
            Markup.button.callback('product qo\'shish', `productAdd_${product_brand_id}`),
            Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `productType_${productBrand.productType.id}`)
        ]);

        buttons.push([
            Markup.button.callback('bu brandi o\'chir', `productBrandRemove_${product_brand_id}`)
        ]);

        await ctx.telegram.sendPhoto(
            chatId,
            productBrand.photo,
            {
                caption: productBrand.name,
                parse_mode: 'HTML',
                reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
            },
        )
    }
}

function menu_admin_inline_keybord(user: User) {
    const inlinekeybords: any = [];
    if (user.role === Role.superAdmin) {
        inlinekeybords.push(manageAdmin);
        inlinekeybords.push([
            !isworkTime
                ?
                Markup.button.callback('ishlashni boshlash', 'markWorkingTimeOrNot')
                :
                Markup.button.callback('ishlashni to\'xtatish', 'askReasonOfPause'),
        ])
    }
    inlinekeybords.push(adminPanel);
    return inlinekeybords;
}

async function addOrRemoveAdmin(ctx: Context, isAdd: boolean, userService: UserService) {

    const users = await userService.allUsers(isAdd ? [Role.user] : [Role.admin]);
    const buttons = users.map(user => [
        isAdd ?
            Markup.button.callback(`➕ name: ${user.name}, username: ${user.username}`, `addAdmin_${user.chatId}`) :
            Markup.button.callback(`➖ name: ${user.name}, username: ${user.username}`, `removeAdmin_${user.chatId}`)
    ]);
    buttons.push([Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', 'homeMenu')]);

    await ctx.editMessageMedia(
        {
            type: 'photo',
            media: isAdd
                ? 'AgACAgIAAxkBAAMUaSCfDLUHIOrssW18SePnoJf3It0AAi8QaxuawQhJQrtDD5ZGVccBAAMCAANtAAM2BA'//'AgACAgIAAxkBAANgaOEjHGaQe4THM5lOBTH4S5eztN8AAtn7MRsNbglL_9hGSuD-yoUBAAMCAAN4AAM2BA'
                : 'AgACAgIAAxkBAAMTaSCe8qIQQAexgDIK-1NRVM3hP2YAAiwQaxuawQhJXtynQkSJQkYBAAMCAANtAAM2BA',//'AgACAgIAAxkBAANeaOEiwARWvDf4sPIJ0V-7xgbQkFcAAtT7MRsNbglLPC70gxWhpkQBAAMCAAN4AAM2BA',
            caption: isAdd
                ? 'Quyidagi foydalanuvchilardan birini admin qilmoqchimisiz?'
                : 'Quyidagi adminlardan biri adminlikdan o\'chirmoqchimisiz?',
            parse_mode: 'HTML', // kerak bo‘lsa
        },
        {
            reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
        }
    );
}

async function addOrRemoveAdminChatId(ctx: Context, userService: UserService) {
    const callback = ctx.callbackQuery;
    if (!callback || !('data' in callback)) {
        return await ctx.answerCbQuery('Callback data topilmadi');
    }

    const parts = callback.data.split('_');
    const chatId = parts.length === 2 ? parts[1] : null;

    if (!chatId) {
        await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
        return;
    }

    const role = parts[0] === 'addAdmin' ? Role.admin : Role.user;
    await userService.setRole(+chatId, role); // yoki user.save() agar ActiveRecord ishlatayotgan bo‘lsangiz

    await addOrRemoveAdmin(ctx, parts[0] === 'addAdmin', userService);

    // await ctx.answerCbQuery('Foydalanuvchi admin qilindi ✅');
    await ctx.answerCbQuery(
        parts[0] === 'addAdmin'
            ? 'Foydalanuvchi admin qilindi ✅'
            : 'Admin foydalanuvchi qilindi ✅',
        { show_alert: true }
    );

}

async function alertToUserAboutNotWorking(ctx: Context) {
    await ctx.answerCbQuery(
        reasonOfPause,
        { show_alert: false }
    );
}

async function alertToUserAboutNotWorkingOk(ctx: Context) {
    await ctx.answerCbQuery(
        reasonOfPause,
        { show_alert: true }
    );
}

async function checkCallbackQuery(ctx: Context) {
    const callback = ctx.callbackQuery;
    if (!callback || !('data' in callback)) {
        console.log('data yuq');
        return null;
        return await ctx.answerCbQuery('Callback data topilmadi');
    }

    const parts = callback.data.split('_');
    const id = parts.length === 2 ? parts[1] : null;
    console.log('id: ', id);

    if (!id) {
        console.log('id topilmadi');
        // await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
        return null;
    }
    return id;
}

async function productAvailable(ctx: Context, productService: ProductService, is_able: boolean) {
    const callback = ctx.callbackQuery;
    if (!callback || !('data' in callback)) {
        return await ctx.answerCbQuery('Callback data topilmadi');
    }

    const parts = callback.data.split('_');
    const id = parts.length === 2 ? parts[1] : null;

    if (!id) {
        await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
        return;
    }
    const product = await productService.toggleAvailability(+id, is_able);
    if (!product) {
        console.log('product topilmadi');
        return;
    }

    await ctx.editMessageMedia(
        {
            type: 'photo',
            media: product.photo,
            caption: `nomi: ${product.name}\nnarxi(so\'m): ${product.price}\no'lchov turi: ${product.criterion}\ntarif: ${product.description}\n\ndokonda ${product.isAvailable ? 'mavjud' : 'mavjud emas'}`,
            parse_mode: 'HTML', // kerak bo‘lsa
        },
        {
            reply_markup: Markup.inlineKeyboard([
                [
                    Markup.button.callback('edit', `productEdit_${product.id}`),
                    Markup.button.callback('delete', `productDelete_${product.id}`),
                ],
                [
                    Markup.button.callback(
                        product.isAvailable
                            ? 'mavjud emas belgilash'
                            : 'mavjud qilib belgilash',
                        product.isAvailable
                            ? `productIsNotAble_${product.id}`
                            : `productIsAble_${product.id}`
                    )
                ],
                [Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `productBrand_${product.productBrand.id}`)]
            ]).reply_markup,
        }
    );
}

async function productId(ctx: Context, productService: ProductService, is_edit: boolean, product_id: number | null) {
    if (is_edit) {
        const callback = ctx.callbackQuery;
        if (!callback || !('data' in callback)) {
            return await ctx.answerCbQuery('Callback data topilmadi');
        }

        const parts = callback.data.split('_');
        const id = parts.length === 2 ? parts[1] : null;

        if (!id) {
            await ctx.answerCbQuery('Xatolik: Chat ID topilmadi');
            return;
        }

        const product = await productService.findOne(+id);
        if (!product) {
            console.log('product topilmadi');
            return;
        }

        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: product.photo,
                caption: `nomi: ${product.name}\nnarxi(so\'m): ${product.price}\no'lchov turi: ${product.criterion}\ntarif: ${product.description}\n\ndokonda ${product.isAvailable ? 'mavjud' : 'mavjud emas'}`,
                parse_mode: 'HTML', // kerak bo‘lsa
            },
            {
                reply_markup: Markup.inlineKeyboard([
                    [
                        Markup.button.callback('edit', `productEdit_${product.id}`),
                        Markup.button.callback('delete', `productDelete_${product.id}`),
                    ],
                    [
                        Markup.button.callback(
                            product.isAvailable
                                ? 'mavjud emas belgilash'
                                : 'mavjud qilib belgilash',
                            product.isAvailable
                                ? `productIsNotAble_${product.id}`
                                : `productIsAble_${product.id}`
                        )
                    ],
                    [Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `productBrand_${product.productBrand.id}`)]
                ]).reply_markup,
            }
        );
    } else {
        // console.log('send uchun ');

        const chatId = ctx.chat?.id;
        if (!chatId) {
            await ctx.reply('❌ Chat aniqlanmadi.');
            return;
        }

        if (!product_id) {
            console.log('product_type_id qiymat yuq: id: ', product_id);
            return;
        }

        const product = await productService.findOne(+product_id);
        if (!product) {
            console.log('product topilmadi');
            return;
        }

        await ctx.telegram.sendPhoto(
            chatId,
            product.photo,
            {
                caption: `nomi: ${product.name}\nnarxi(so\'m): ${product.price}\no'lchov turi: ${product.criterion}\ntarif: ${product.description}\n\ndokonda ${product.isAvailable ? 'mavjud' : 'mavjud emas'}`,
                parse_mode: 'HTML',
                reply_markup: Markup.inlineKeyboard([
                    [
                        Markup.button.callback('edit', `productEdit_${product.id}`),
                        Markup.button.callback('delete', `productDelete_${product.id}`),
                    ],
                    [
                        Markup.button.callback(
                            product.isAvailable
                                ? 'mavjud emas belgilash'
                                : 'mavjud qilib belgilash',
                            product.isAvailable
                                ? `productIsNotAble_${product.id}`
                                : `productIsAble_${product.id}`
                        )
                    ],
                    [Markup.button.callback('🔙 𝐎𝐫𝐪𝐚𝐠𝐚', `productBrand_${product.productBrand.id}`)]
                ]).reply_markup,
            },
        )
    }
}

async function clearChat(chatId: number, ctx: Context) {
    const message_id = messageId_chatId.get(chatId);
    if (message_id) {
        await ctx.deleteMessage(message_id);
    }

    const basket = baskets.get(chatId);

    basket?.forEach(async p => {
        if (p.message_id) {
            await ctx.deleteMessage(p.message_id);
            delete p.message_id;
        }
    });
}

