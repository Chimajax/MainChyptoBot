require('dotenv').config();
const { Telegraf } = require('telegraf');
const admin = require('firebase-admin');

// Firebase with automatic reconnection
let db;
const initFirebase = () => {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
    
    admin.initializeApp({
      credential: admin.credential.cert({
        ...serviceAccount,
        private_key: serviceAccount.private_key.replace(/\\\\n/g, '\n')
      }),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });

    db = admin.firestore();
    console.log('🔥 Firebase successfully connected');
  } catch (err) {
    console.error('Firebase init failed:', {
      error: err.message,
      keySnippet: process.env.FIREBASE_KEY?.substring(0, 50) + '...'
    });
    process.exit(1);
  }
};
initFirebase();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Connection health check
setInterval(async () => {
  try {
    await db.collection('heartbeat').doc('check').set({ timestamp: new Date() });
  } catch (err) {
    console.warn('Firebase connection lost - reinitializing');
    initFirebase();
  }
}, 30000); // Check every 30s

function logEvent(event, details) {
    console.log(`[${new Date().toISOString()}] ${event}:`, JSON.stringify(details, null, 2));
}

const referReward = 10000;
const referrerReward = 40000;

bot.start(async (ctx) => {
    const userId = ctx.from.id.toString();
    const chatId = ctx.chat.id;
    const startPayload = ctx.payload; // For /start ref_123
    const yello = `🚀 *Get Ahead, Start Earning!*\n\nChypto connects you with rewarding tasks—don't miss out! Follow us on Twitter and be the first to grab new earning opportunities!\n\n🎮 *Complete Tasks, Earn Rewards!*\n\nJoin Chypto and turn simple tasks into real rewards, new tasks and earning opportunities!\n\nClick CHYPTO To Start\n\nYour Referral link is [https://t.me/Chypto_Official_Bot?start=ref_${userId}](https://t.me/Chypto_Official_Bot?start=ref_${userId}`;

    await ctx.reply("😁 Please wait");

    if (!startPayload) {
        // No referral link, just send welcome message
        return ctx.replyWithMarkdown(yello, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔥 Follow Us", url: "https://x.com/@Chypto_Official" }],
                    [{ text: "🚀 Join Channel", url: "https://t.me/chyptochannel" }]
                ]
            }
        });
    }

    // Process referral link if present
    logEvent('Referral Link Received', { userId, payload: startPayload });
    const refMatch = startPayload.match(/^ref_(\d+)$/);
    const referrerId = refMatch ? refMatch[1] : null;
    
    if (referrerId) {
        logEvent('Valid Referral Detected', { userId, referrerId });
    }

    try {
        if (!db) throw new Error('Database not connected');
        
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        // Check for existing referral relationship first
        if (userDoc.exists && userDoc.data().referredBy) {
            logEvent('Duplicate Referral Attempt', { userId });
            return ctx.reply("⚠️ You Have Been Referred Already!");
        }

        // Handle user document creation/update
        if (!userDoc.exists) {
            await userRef.set({
                referredBy: referrerId || null,
                Balance: referrerId ? referReward : 0,
                chat_id: chatId,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            logEvent('New User Created', { userId, referrerId });
        } else if (referrerId) {
            // Update existing user with referral data
            await userRef.update({
                referredBy: referrerId,
                Balance: admin.firestore.FieldValue.increment(referReward)
            });
            logEvent('Existing User Updated', { userId, referrerId });
        }

        // Process referrer if applicable
        if (referrerId) {
            const referrerRef = db.collection("users").doc(referrerId);
            const referrerDoc = await referrerRef.get();

            if (referrerDoc.exists) {
                // Update referrer's balance and referrals
                await referrerRef.update({
                    Balance: admin.firestore.FieldValue.increment(referrerReward),
                    referrals: admin.firestore.FieldValue.arrayUnion(userId)
                });
                logEvent('Referrer Rewarded', { referrerId, amount: referrerReward });

                // Notify referrer
                await bot.telegram.sendMessage(referrerId, `🎉 A Sign Up used your referral!`);
            } else {
                logEvent('Invalid Referrer', { userId, referrerId });
                await userRef.update({ referredBy: null });
                await ctx.reply("⚠️ Invalid referral link - referrer not found");
            }
        }

        // Send welcome message
        await ctx.replyWithMarkdown(yello, {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🔥 Follow Us", url: "https://x.com/@Chypto_Official" }],
                    [{ text: "🚀 Join Channel", url: "https://t.me/chyptochannel" }]
                ]
            }
        });

    } catch (error) {
        logEvent('System Error', { userId, error: error.message });
        console.error("Error:", error);
        await ctx.reply("⚠️ An error occurred. Please try again.");
    }
});

console.log("Bot is running with corrected Firestore updates...");

module.exports = bot;
