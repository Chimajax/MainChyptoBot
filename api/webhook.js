import { Telegraf } from 'telegraf';

// Initialize the bot outside the handler
const bot = new Telegraf(process.env.BOT_TOKEN);

// Add your bot logic here
bot.on('message', (ctx) => {
    console.log('Received message:', ctx.message.text);
    ctx.reply('Hello! Your message was received.');
});

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    try {
        await bot.handleUpdate(req.body); // ✅ Use await to ensure execution completes
        res.status(200).send("OK");
    } catch (error) {
        console.error("Error processing update:", error);
        res.status(500).send("Internal Server Error");
    }
} 
