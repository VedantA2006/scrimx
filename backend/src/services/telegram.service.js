/**
 * telegram.service.js
 * Handles all Telegram bot interactions for Flow A (top-up) and Flow B (slot payment).
 * Runs in polling mode — compatible with Render free tier.
 */
const TelegramBot = require('node-telegram-bot-api');
const User        = require('../models/User');
const Transaction = require('../models/Transaction');
const Registration = require('../models/Registration');
const Scrim       = require('../models/Scrim');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID;

// Only start bot if token is configured
let bot = null;

if (TOKEN) {
  bot = new TelegramBot(TOKEN, { polling: true });
  console.log('🤖 Telegram bot started (polling mode)');
  setupCallbackHandlers();
} else {
  console.warn('⚠️  TELEGRAM_BOT_TOKEN not set — Telegram bot disabled');
}

/** Helper: send a message (silently fails if bot not configured) */
async function sendMessage(chatId, text, replyMarkup = null) {
  if (!bot || !chatId) return;
  try {
    const opts = { parse_mode: 'HTML' };
    if (replyMarkup) opts.reply_markup = replyMarkup;
    return await bot.sendMessage(chatId, text, opts);
  } catch (err) {
    console.error('Telegram sendMessage error:', err.message);
  }
}

/** Flow A — send top-up alert to ADMIN */
async function sendTopupAlert(transaction, organiser) {
  const text =
    `💰 <b>Top-up Request</b>\n` +
    `Organiser: ${organiser.username} (${organiser.email})\n` +
    `Amount: ₹${transaction.amount}\n` +
    `UTR: <code>${transaction.utr}</code>`;

  const markup = {
    inline_keyboard: [[
      { text: '✅ Approve', callback_data: `topup_approve:${transaction._id}` },
      { text: '❌ Reject',  callback_data: `topup_reject:${transaction._id}` }
    ]]
  };

  await sendMessage(ADMIN_CHAT_ID, text, markup);
}

/** Flow B — send slot request alert to ORGANISER */
async function sendSlotRequestAlert(registration, scrim, player) {
  const organiser = await User.findById(scrim.organizer).select('organizerProfile.telegramChatId');
  const chatId = organiser?.organizerProfile?.telegramChatId;
  if (!chatId) return; // organiser hasn't linked Telegram

  const text =
    `🎮 <b>Slot Request — ${scrim.title}</b>\n` +
    `Player: ${player.username} (@${player.username})\n` +
    `Entry Fee: ₹${scrim.entryFee}\n` +
    `UTR: <code>${registration.utr}</code>`;

  const markup = {
    inline_keyboard: [[
      { text: '✅ Approve Slot', callback_data: `slot_approve:${registration._id}` },
      { text: '❌ Reject',       callback_data: `slot_reject:${registration._id}` }
    ]]
  };

  if (registration.paymentScreenshot) {
    try {
      await bot.sendPhoto(chatId, registration.paymentScreenshot, {
        caption: text,
        parse_mode: 'HTML',
        reply_markup: markup
      });
      return;
    } catch (e) {
      console.error('Failed to send photo:', e.message);
    }
  }

  await sendMessage(chatId, text, markup);
}

/** Callback query router */
function setupCallbackHandlers() {
  bot.on('callback_query', async (query) => {
    const { data, message, from } = query;
    const [action, id] = data.split(':');

    try {
      if (action === 'topup_approve' || action === 'topup_reject') {
        await handleTopupCallback(action, id, from, message);
      } else if (action === 'slot_approve' || action === 'slot_reject') {
        await handleSlotCallback(action, id, from, message);
      } else if (action === 'pointreq_approve' || action === 'pointreq_reject') {
        await handlePointReqCallback(action, id, from, message);
      } else if (action === 'plan_approve' || action === 'plan_reject') {
        await handlePlanCallback(action, id, from, message);
      } else if (action === 'boost_approve' || action === 'boost_reject') {
        await handleBoostCallback(action, id, from, message);
      }
    } catch (err) {
      console.error('Telegram callback error:', err.message);
      await bot.answerCallbackQuery(query.id, { text: '⚠️ Error processing request.' });
    }

    await bot.answerCallbackQuery(query.id);
  });

  // Handle /start — stores chatId for OTP delivery
  bot.onText(/\/start( (.+))?/, async (msg, match) => {
    const param = match[2];
    if (param && /^\d{6}$/.test(param)) {
      await verifyOtpAndLink(msg, param);
      return;
    }
    await sendMessage(msg.chat.id,
      '👋 Welcome to <b>ScrimXBot</b>!\n\nThis bot handles tournament slot approvals and wallet top-ups for organizers.\n\nTo link your account, enter the 6-digit code shown on the ScrimX dashboard.'
    );
  });

  // Handle direct 6-digit OTP entry
  bot.onText(/^\d{6}$/, async (msg, match) => {
    await verifyOtpAndLink(msg, match[0]);
  });
}

/** Verify OTP and link telegram account */
async function verifyOtpAndLink(msg, otp) {
  try {
    const user = await User.findOne({ 
      'organizerProfile.telegramOTP': otp,
      'organizerProfile.telegramOTPExpiry': { $gt: new Date() }
    });

    if (!user) {
      await sendMessage(msg.chat.id, '❌ Invalid or expired linking code. Please generate a new one on the website.');
      return;
    }

    user.organizerProfile.telegramChatId = msg.chat.id;
    user.organizerProfile.telegramUsername = msg.from.username || msg.from.first_name || 'Organizer';
    user.organizerProfile.telegramVerified = true;
    user.organizerProfile.telegramOTP = null;
    user.organizerProfile.telegramOTPExpiry = null;
    await user.save();

    await sendMessage(msg.chat.id, `✅ <b>Account Linked!</b>\n\nYour Telegram is now successfully connected to ScrimX organiser <b>${user.username}</b>.\n\nYou will receive instant notifications for slot requests and top-ups here.`);
  } catch (error) {
    console.error('OTP link error:', error.message);
    await sendMessage(msg.chat.id, '⚠️ An error occurred while linking. Please try again.');
  }
}

/** Handle top-up approve/reject (admin only) */
async function handleTopupCallback(action, txId, from, message) {
  // Verify caller is admin
  const adminChatId = String(ADMIN_CHAT_ID);
  if (String(from.id) !== adminChatId) {
    await sendMessage(from.id, '⛔ Only the ScrimX admin can approve top-ups.');
    return;
  }

  const transaction = await Transaction.findById(txId).populate('user', 'username email organizerProfile');
  if (!transaction) {
    await bot.editMessageText('⚠️ Transaction not found.', { chat_id: message.chat.id, message_id: message.message_id });
    return;
  }
  if (transaction.status !== 'pending') {
    await bot.editMessageText(`ℹ️ Already ${transaction.status}.`, { chat_id: message.chat.id, message_id: message.message_id });
    return;
  }

  if (action === 'topup_approve') {
    // Credit organiser balance
    const organiser = await User.findById(transaction.user);
    organiser.organizerProfile.pointsWallet.balance += transaction.amount;
    organiser.organizerProfile.pointsWallet.totalAdded += transaction.amount;
    organiser.organizerProfile.pointsWallet.lastUpdatedAt = new Date();
    await organiser.save();

    transaction.status = 'approved';
    transaction.balanceAfter = organiser.organizerProfile.pointsWallet.balance;
    await transaction.save();

    await bot.editMessageText(
      `✅ Approved ₹${transaction.amount} for ${organiser.username}\nNew balance: ₹${organiser.organizerProfile.pointsWallet.balance}`,
      { chat_id: message.chat.id, message_id: message.message_id }
    );
  } else {
    transaction.status = 'rejected';
    await transaction.save();
    await bot.editMessageText(
      `❌ Rejected top-up of ₹${transaction.amount} for ${transaction.user?.username}`,
      { chat_id: message.chat.id, message_id: message.message_id }
    );
  }
}

/** Handle slot approve/reject (organiser only) */
async function handleSlotCallback(action, regId, from, message) {
  const registration = await Registration.findById(regId)
    .populate('scrim')
    .populate('registeredBy', 'username email');

  const editFn = message.photo ? bot.editMessageCaption.bind(bot) : bot.editMessageText.bind(bot);

  if (!registration) {
    await editFn('⚠️ Registration not found.', { chat_id: message.chat.id, message_id: message.message_id }).catch(()=>{});
    return;
  }

  // Verify caller is the scrim's organiser
  const scrim = registration.scrim;
  const organiser = await User.findById(scrim.organizer).select('organizerProfile.telegramChatId');
  if (String(organiser?.organizerProfile?.telegramChatId) !== String(from.id)) {
    await sendMessage(from.id, '⛔ Only the scrim organiser can approve slot requests.');
    return;
  }

  if (registration.status !== 'pending') {
    await editFn(`ℹ️ Already ${registration.status}.`, { chat_id: message.chat.id, message_id: message.message_id }).catch(()=>{});
    return;
  }

  if (action === 'slot_approve') {
    if (scrim.filledSlots >= scrim.slotCount) {
      await editFn('⚠️ All slots are full!', { chat_id: message.chat.id, message_id: message.message_id }).catch(()=>{});
      return;
    }
    scrim.filledSlots += 1;
    const slotNumber = scrim.filledSlots;
    if (scrim.filledSlots >= scrim.slotCount) scrim.status = 'full';
    await scrim.save();

    registration.status = 'approved';
    registration.paymentStatus = 'verified';
    registration.slotNumber = slotNumber;
    await registration.save();

    await editFn(
      `✅ Slot #${slotNumber} assigned to ${registration.registeredBy?.username}`,
      { chat_id: message.chat.id, message_id: message.message_id }
    ).catch(()=>{});
  } else {
    registration.status = 'rejected';
    await registration.save();

    await editFn(
      `❌ Slot request rejected for ${registration.registeredBy?.username}`,
      { chat_id: message.chat.id, message_id: message.message_id }
    ).catch(()=>{});
  }
}

/** Handle point request approve/reject (admin only) */
async function handlePointReqCallback(action, reqId, from, message) {
  // Verify caller is admin
  if (String(from.id) !== String(ADMIN_CHAT_ID)) {
    await sendMessage(from.id, '⛔ Only the ScrimX admin can approve point requests.');
    return;
  }

  const OrganizerPointRequest = require('../models/OrganizerPointRequest');
  const OrganizerPointTransaction = require('../models/OrganizerPointTransaction');

  const request = await OrganizerPointRequest.findById(reqId).populate('organizer', 'username email');
  if (!request) {
    await bot.editMessageCaption('⚠️ Request not found.', { chat_id: message.chat.id, message_id: message.message_id }).catch(() =>
      bot.editMessageText('⚠️ Request not found.', { chat_id: message.chat.id, message_id: message.message_id })
    );
    return;
  }

  if (request.status !== 'pending') {
    const editFn = message.photo ? bot.editMessageCaption.bind(bot) : bot.editMessageText.bind(bot);
    await editFn(`ℹ️ Already ${request.status}.`, { chat_id: message.chat.id, message_id: message.message_id }).catch(() => {});
    return;
  }

  const organiser = await User.findById(request.organizer);

  if (action === 'pointreq_approve') {
    const pointsToAdd = request.requestedPoints;
    const currentBalance = organiser.organizerProfile?.pointsWallet?.balance || 0;

    await User.updateOne(
      { _id: organiser._id },
      {
        $inc: {
          'organizerProfile.pointsWallet.balance': pointsToAdd,
          'organizerProfile.pointsWallet.totalAdded': pointsToAdd
        },
        $set: { 'organizerProfile.pointsWallet.lastUpdatedAt': new Date() }
      }
    );

    await OrganizerPointTransaction.create({
      organizer: organiser._id,
      type: 'credit',
      points: pointsToAdd,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance + pointsToAdd,
      reason: 'Point Request Approved via Telegram',
      relatedRequest: request._id,
    });

    request.status = 'approved';
    request.reviewedAt = new Date();
    await request.save();

    const successText = `✅ Approved ${pointsToAdd} pts for ${organiser.username}\nNew balance: ${currentBalance + pointsToAdd} pts`;
    if (message.photo) {
      await bot.editMessageCaption(successText, { chat_id: message.chat.id, message_id: message.message_id }).catch(() => {});
    } else {
      await bot.editMessageText(successText, { chat_id: message.chat.id, message_id: message.message_id }).catch(() => {});
    }

  } else {
    request.status = 'rejected';
    request.reviewedAt = new Date();
    await request.save();

    const rejectText = `❌ Rejected point request of ${request.requestedPoints} pts for ${organiser.username}`;
    if (message.photo) {
      await bot.editMessageCaption(rejectText, { chat_id: message.chat.id, message_id: message.message_id }).catch(() => {});
    } else {
      await bot.editMessageText(rejectText, { chat_id: message.chat.id, message_id: message.message_id }).catch(() => {});
    }
  }
}

/** Handle plan request approve/reject (admin only) */
async function handlePlanCallback(action, reqId, from, message) {
  // Verify caller is admin
  if (String(from.id) !== String(ADMIN_CHAT_ID)) {
    await sendMessage(from.id, '⛔ Only the ScrimX admin can approve plan requests.');
    return;
  }

  const PlanUpgradeRequest = require('../models/PlanUpgradeRequest');
  const Conversation = require('../models/Conversation');
  const Message = require('../models/Message');

  const request = await PlanUpgradeRequest.findById(reqId).populate('organizer', 'username email organizerProfile');
  if (!request) {
    await bot.editMessageCaption('⚠️ Request not found.', { chat_id: message.chat.id, message_id: message.message_id }).catch(() =>
      bot.editMessageText('⚠️ Request not found.', { chat_id: message.chat.id, message_id: message.message_id })
    );
    return;
  }

  if (request.status !== 'pending') {
    const editFn = message.photo ? bot.editMessageCaption.bind(bot) : bot.editMessageText.bind(bot);
    await editFn(`ℹ️ Already ${request.status}.`, { chat_id: message.chat.id, message_id: message.message_id }).catch(() => {});
    return;
  }

  const organiser = await User.findById(request.organizer);

  if (action === 'plan_approve') {
    const durationDays = 30;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    organiser.organizerProfile.plan = 'elite';
    organiser.organizerProfile.subscription = {
      startDate,
      endDate,
      isActive: true
    };
    await organiser.save();

    request.status = 'approved';
    request.activatedAt = startDate;
    request.expiresAt = endDate;
    request.adminReply = 'Plan approved via Telegram.';
    await request.save();

    // Send system message in conversation
    if (request.conversation) {
      const sysMsg = await Message.create({
        conversation: request.conversation,
        sender: organiser._id,
        type: 'system',
        content: `✅ Elite plan approved and activated for ${durationDays} days!`
      });
      await Conversation.findByIdAndUpdate(request.conversation, {
        lastMessage: { text: `✅ Elite plan approved`, sender: organiser._id, createdAt: sysMsg.createdAt },
        $inc: { [`unreadCounts.${organiser._id}`]: 1 }
      });
    }

    const successText = `✅ Approved Elite Plan (30 days) for ${organiser.username}`;
    if (message.photo) {
      await bot.editMessageCaption(successText, { chat_id: message.chat.id, message_id: message.message_id }).catch(() => {});
    } else {
      await bot.editMessageText(successText, { chat_id: message.chat.id, message_id: message.message_id }).catch(() => {});
    }

  } else {
    request.status = 'rejected';
    request.adminReply = 'Rejected via Telegram.';
    await request.save();

    if (request.conversation) {
      const sysMsg = await Message.create({
        conversation: request.conversation,
        sender: organiser._id,
        type: 'system',
        content: `❌ Plan upgrade rejected via Telegram`
      });
      await Conversation.findByIdAndUpdate(request.conversation, {
        lastMessage: { text: `❌ Plan upgrade rejected`, sender: organiser._id, createdAt: sysMsg.createdAt },
        $inc: { [`unreadCounts.${organiser._id}`]: 1 }
      });
    }

    const rejectText = `❌ Rejected Elite Plan request for ${organiser.username}`;
    if (message.photo) {
      await bot.editMessageCaption(rejectText, { chat_id: message.chat.id, message_id: message.message_id }).catch(() => {});
    } else {
      await bot.editMessageText(rejectText, { chat_id: message.chat.id, message_id: message.message_id }).catch(() => {});
    }
  }
}

/** Handle boost request approve/reject (admin only) */
async function handleBoostCallback(action, reqId, from, message) {
  if (String(from.id) !== String(ADMIN_CHAT_ID)) {
    await sendMessage(from.id, '⛔ Only the ScrimX admin can approve boost requests.');
    return;
  }

  const BoostRequest = require('../models/BoostRequest');
  
  const request = await BoostRequest.findById(reqId).populate('organizer', 'username email');
  if (!request) {
    const editFn = message.photo ? bot.editMessageCaption.bind(bot) : bot.editMessageText.bind(bot);
    await editFn('⚠️ Request not found.', { chat_id: message.chat.id, message_id: message.message_id }).catch(() => {});
    return;
  }

  if (request.status !== 'pending') {
    const editFn = message.photo ? bot.editMessageCaption.bind(bot) : bot.editMessageText.bind(bot);
    await editFn(`ℹ️ Already ${request.status}.`, { chat_id: message.chat.id, message_id: message.message_id }).catch(() => {});
    return;
  }

  if (action === 'boost_approve') {
    request.status = 'approved';
    request.adminReply = 'Approved via Telegram.';
    
    let durationDays = 1;
    if (request.duration === '3day') durationDays = 3;
    else if (request.duration === '7day') durationDays = 7;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    let boostScoreBase = 10;
    if (durationDays === 3) boostScoreBase = 30;
    else if (durationDays === 7) boostScoreBase = 70;

    if (request.itemType === 'scrim') {
      const Scrim = require('../models/Scrim');
      await Scrim.findByIdAndUpdate(request.itemId, {
        isHighlighted: true,
        highlightType: 'scrim',
        highlightPlan: request.duration,
        highlightExpiresAt: expiresAt,
        boostScore: boostScoreBase
      });
    } else {
      const Tournament = require('../models/Tournament');
      await Tournament.findByIdAndUpdate(request.itemId, {
        isHighlighted: true,
        highlightType: 'tournament',
        highlightPlan: request.duration,
        highlightExpiresAt: expiresAt,
        boostScore: boostScoreBase
      });
    }

    await request.save();

    const successText = `✅ Approved Boost (${request.duration}) for ${request.itemType}`;
    if (message.photo) {
      await bot.editMessageCaption(successText, { chat_id: message.chat.id, message_id: message.message_id }).catch(() => {});
    } else {
      await bot.editMessageText(successText, { chat_id: message.chat.id, message_id: message.message_id }).catch(() => {});
    }
  } else {
    request.status = 'rejected';
    request.adminReply = 'Rejected via Telegram.';
    await request.save();

    const rejectText = `❌ Rejected Boost request for ${request.itemType}`;
    if (message.photo) {
      await bot.editMessageCaption(rejectText, { chat_id: message.chat.id, message_id: message.message_id }).catch(() => {});
    } else {
      await bot.editMessageText(rejectText, { chat_id: message.chat.id, message_id: message.message_id }).catch(() => {});
    }
  }
}

module.exports = { bot, sendMessage, sendTopupAlert, sendSlotRequestAlert };
