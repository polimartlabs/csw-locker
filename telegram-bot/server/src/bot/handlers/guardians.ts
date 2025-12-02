import { Context } from 'grammy';
import { getUserByTelegramId } from '../../db/users.js';
import { getUserWallets } from '../../db/wallets.js';
import { getContractAdmins } from '../../services/stacks.js';

export async function guardiansHandler(ctx: Context) {
  const telegramId = ctx.from?.id;
  
  if (!telegramId) {
    await ctx.reply('Error: Could not identify user');
    return;
  }
  
  const user = await getUserByTelegramId(telegramId);
  if (!user) {
    await ctx.reply('Please use /start to initialize your account first.');
    return;
  }
  
  const wallets = await getUserWallets(telegramId);
  if (wallets.length === 0) {
    await ctx.reply('You don\'t have any wallets yet. Use /wallet to create one.');
    return;
  }
  
  // Get guardians (admins) for the first wallet
  const wallet = wallets[0];
  try {
    const admins = await getContractAdmins(wallet.contractAddress);
    
    let message = `👥 *Guardians (Admins)*\n\n*${wallet.name || 'Wallet'}*\n`;
    message += `Address: \`${wallet.contractAddress}\`\n\n`;
    
    if (admins.length === 0) {
      message += 'No guardians configured.';
    } else {
      message += '*Current Guardians:*\n';
      admins.forEach((admin, index) => {
        message += `${index + 1}. \`${admin}\`\n`;
      });
    }
    
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '➕ Add Guardian', callback_data: 'action:add_guardian' }
          ],
          [
            { text: '📱 Open Mini App', web_app: { url: process.env.MINI_APP_URL || 'https://example.com' } }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching guardians:', error);
    await ctx.reply('Error fetching guardians. Please try again later.');
  }
}

export async function addGuardianHandler(ctx: Context) {
  const args = ctx.message?.text?.split(' ').slice(1);
  
  if (!args || args.length === 0) {
    await ctx.reply(`
Usage: /add_guardian <stacks_address>

Example: /add_guardian SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7

The address must be a valid Stacks principal address.
    `);
    return;
  }
  
  const address = args[0];
  
  // Validate address format (basic check)
  if (!address.match(/^[SP][0-9A-Z]{38}$/)) {
    await ctx.reply('Invalid Stacks address format. Please check and try again.');
    return;
  }
  
  await ctx.reply(`Adding guardian ${address}...\n\nThis will require a transaction. Opening mini app for confirmation.`, {
    reply_markup: {
      inline_keyboard: [[
        { text: '📱 Open Mini App', web_app: { url: `${process.env.MINI_APP_URL}/guardians/add?address=${address}` } }
      ]]
    }
  });
}

export async function removeGuardianHandler(ctx: Context) {
  const args = ctx.message?.text?.split(' ').slice(1);
  
  if (!args || args.length === 0) {
    await ctx.reply(`
Usage: /remove_guardian <stacks_address>

Example: /remove_guardian SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7
    `);
    return;
  }
  
  const address = args[0];
  
  await ctx.reply(`Removing guardian ${address}...\n\nThis will require a transaction. Opening mini app for confirmation.`, {
    reply_markup: {
      inline_keyboard: [[
        { text: '📱 Open Mini App', web_app: { url: `${process.env.MINI_APP_URL}/guardians/remove?address=${address}` } }
      ]]
    }
  });
}

