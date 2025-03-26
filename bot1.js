require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

// Secure Firebase initialization
let serviceAccount;
try {
    if (!process.env.FIREBASE_KEY) {
        throw new Error('FIREBASE_KEY environment variable is missing');
    }
    
    // Parse the JSON and handle newlines in private key
    const firebaseConfig = JSON.parse(process.env.FIREBASE_KEY);
    firebaseConfig.private_key = firebaseConfig.private_key.replace(/\\n/g, '\n');
    serviceAccount = firebaseConfig;
    
    console.log('Firebase config parsed successfully');
} catch (error) {
    console.error('Failed to parse Firebase config:', error.message);
    process.exit(1);
}

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization failed:', error.message);
    process.exit(1);
}

const db = admin.firestore();
const bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: true });

function logEvent(event, details) {
    console.log(`[${new Date().toISOString()}] ${event}:`, JSON.stringify(details, null, 2));
}

const referReward = 10000;
const referrerReward = 40000;

bot.onText(/\/start(.*)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    let referrerId = null;
    const yello = `🚀 *Get Ahead, Start Earning!*\n\nChypto connects you with rewarding tasks—don’t miss out! Follow us on Twitter and be the first to grab new earning opportunities!\n\n🎮 *Complete Tasks, Earn Rewards!*\n\nJoin Chypto and turn simple tasks into real rewards, new tasks and earning opportunities!\n\nClick CHYPTO To Start\n\nYour Referral link is [https://t.me/Chypto_Official_Bot?start=ref_${userId}](https://t.me/Chypto_Official_Bot?start=ref_${userId}`;

    bot.sendMessage(chatId, "😁 Please wait");

    const startPayload = match[1] ? match[1].trim() : "";
    if (!startPayload) {
        // No referral link, just send welcome message
        return bot.sendMessage(chatId, 
            `${yello}`, 
            {
                parse_mode: "Markdown",
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
    if (refMatch) {
        referrerId = refMatch[1];
        logEvent('Valid Referral Detected', { userId, referrerId });
    }

    try {
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        // Check for existing referral relationship first
        if (userDoc.exists && userDoc.data().referredBy) {
            logEvent('Duplicate Referral Attempt', { userId });
            return bot.sendMessage(chatId, "⚠️ You Have Been Referred Already!");
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
                const referrerChatId = referrerId;
                bot.sendMessage(referrerChatId, `🎉 A Sign Up used your referral!.`);
            } else {
                logEvent('Invalid Referrer', { userId, referrerId });
                await userRef.update({ referredBy: null });
                bot.sendMessage(chatId, "⚠️ Invalid referral link - referrer not found");
            }
        }

        // Send welcome message with updated balance info
        const balanceMessage = referrerId ? "🎉 You received Points for using a referral!, Check In Game" : "";
        bot.sendMessage(chatId, `${yello}`,
            {
                parse_mode: "Markdown",
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
        bot.sendMessage(chatId, "⚠️ An error occurred. Please try again.");
    }
});

console.log("Bot is running with corrected Firestore updates...");

// Add this at the BOTTOM of bot1.js
module.exports = {
  bot,    // The TelegramBot instance
  db      // Firebase instance (optional if needed elsewhere)
};
