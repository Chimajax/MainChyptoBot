require('dotenv').config({ path: '../.env' });
const express = require('express');
const bodyParser = require('body-parser');
const bot = require('../bot1');

const app = express();
app.use(bodyParser.json());

// Remove duplicate route handler - you had two app.post('/api/webhook')
// Single improved route handler:
app.post('/api/webhook', (req, res) => {
    // Add security headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Telegram-Bot-Api-Secret-Token', process.env.BOT_TOKEN);
    
    try {
        console.log('Received update:', req.body); // Log incoming updates
        
        // Process the update
        bot.processUpdate(req.body);
        
        // Send response
        res.status(200).json({
            status: 'ok',
            processed: true,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(200).json({  // Still return 200 to prevent Telegram retries
            status: 'error',
            message: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Webhook setup for production
    if (process.env.NODE_ENV === 'production') {
        if (process.env.BOT_TOKEN && process.env.WEBHOOK_URL) {
            const WEBHOOK_URL = `${process.env.WEBHOOK_URL}/api/webhook`;
            bot.setWebHook(WEBHOOK_URL)
                .then(() => console.log(`Production webhook set to ${WEBHOOK_URL}`))
                .catch(err => console.error('Error setting webhook:', err));
        } else {
            console.warn('Missing required environment variables for webhook setup');
        }
    }
});

// Handle process termination gracefully
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Closing server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = app;  // Export for testing
