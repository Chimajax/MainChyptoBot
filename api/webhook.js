const bot = require('../bot1');

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    await bot.handleUpdate(req.body);
    res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(200).json({ status: "error" }); // Always return 200 to Telegram
  }
}
