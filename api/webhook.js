// api/webhook.js
import { Telegraf } from 'telegraf';
const handleNodeTelegramUpdate = require('./adapter');

const telegrafBot = new Telegraf(process.env.BOT_TOKEN);

// Forward all messages to your existing bot1.js logic
telegrafBot.on('message', async (ctx) => {
  try {
    await handleNodeTelegramUpdate(ctx.update);
  } catch (err) {
    console.error('Adapter error:', err);
  }
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    await telegrafBot.handleUpdate(req.body);
    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing update:", error);
    res.status(500).send("Internal Server Error");
  }
}
