require('dotenv').config({ path: '../.env' });  // Go up one level to find .env
const express = require('express');
const bodyParser = require('body-parser');
const bot = require('../bot1');

const app = express();
app.use(bodyParser.json());

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).send('Server Error');
});

app.post('/api/webhook', (req, res) => {
    // Add security headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Telegram-Bot-Api-Secret-Token', process.env.BOT_TOKEN);
    
    try {
        bot.processUpdate(req.body);
        res.status(200).json({status: 'ok'});
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(200).json({status: 'error', message: err.message});
    }
});

app.post('/api/webhook', (req, res) => {
    try {
        console.log('Received update:', req.body); // Log incoming updates
        bot.processUpdate(req.body);
        res.sendStatus(200);
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(500).send('Error processing update');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Set webhook only if all required env vars exist
    if (process.env.BOT_TOKEN && process.env.WEBHOOK_URL) {
        const WEBHOOK_URL = `${process.env.WEBHOOK_URL}/api/webhook`;
        bot.setWebHook(WEBHOOK_URL)
            .then(() => console.log(`Webhook set to ${WEBHOOK_URL}`))
            .catch(err => console.error('Error setting webhook:', err));
    } else {
        console.warn('Missing required environment variables for webhook setup');
    }
});
