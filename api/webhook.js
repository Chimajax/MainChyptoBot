import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.BOT_TOKEN);

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    try {
        bot.handleUpdate(req.body);
        res.status(200).send("OK");
    } catch (error) {
        console.error("Error processing update:", error);
        res.status(500).send("Internal Server Error");
    }
}
