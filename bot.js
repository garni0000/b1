require('dotenv').config();
const { Telegraf } = require('telegraf');
const fs = require('fs');
const axios = require('axios');
const http = require('http');

// Configuration initiale
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const PHP_ENDPOINT = process.env.PHP_ENDPOINT;
const VIDEO_URL = process.env.VIDEO_URL;

// Configuration des canaux
const CHANNELS_CONFIG = {
  canal1: process.env.CANAL1_URL || 'https://t.me/+r51NVBAziak5NzZk',
  canal2: process.env.CANAL2_URL || 'https://t.me/+sL_NSnUaTugyODlk',
  canal3: process.env.CANAL3_URL || 'https://t.me/+5kl4Nte1HS5lOGZk',
  canal4: process.env.CANAL4_URL || 'https://t.me/+tKWRcyrKwh9jMzA8',
  bot: process.env.BOT_URL || 'https://t.me/Applepffortunebothack_bot'
};

// Serveur keep-alive
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.end('Bot operational');
}).listen(process.env.PORT || 8080);

// Gestion des demandes d'adhésion
bot.on('chat_join_request', async (ctx) => {
  const { from: user, chat } = ctx.update.chat_join_request;

  try {
    // Acceptation immédiate de la demande
    await ctx.approveChatJoinRequest(user.id);

    // Sauvegarde des données utilisateur
    const userData = {
      id: user.id,
      first_name: sanitizeText(user.first_name),
      username: user.username,
      timestamp: new Date().toISOString(),
      chat_id: chat.id
    };

    saveUserData(userData);
    await forwardToBackend(userData);

    // Programmation des actions différées
    scheduleNotification(ctx, user);
    scheduleFinalApproval(ctx, user, chat);

  } catch (error) {
    handleError(error, user);
  }
});

// Fonctions utilitaires
function saveUserData(user) {
  try {
    const users = fs.existsSync('users.json') 
      ? JSON.parse(fs.readFileSync('users.json'))
      : [];

    users.push(user);
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Erreur sauvegarde locale:', error);
  }
}

async function forwardToBackend(data) {
  try {
    await axios.post(PHP_ENDPOINT, {
      ...data,
      source: 'telegram_bot'
    });
  } catch (error) {
    console.error('Erreur transmission API:', error.response?.data || error.message);
  }
}

function scheduleNotification(ctx, user) {
  setTimeout(async () => {
    try {
      await ctx.telegram.sendVideo(
        user.id,
        VIDEO_URL,
        {
          caption: generateCaption(user.first_name),
          parse_mode: 'MarkdownV2',
          reply_markup: generateInlineKeyboard()
        }
      );
    } catch (error) {
      handleNotificationError(error, user);
    }
  }, 5000);
}

function scheduleFinalApproval(ctx, user, chat) {
  setTimeout(async () => {
    try {
      await ctx.approveChatJoinRequest(user.id);
      console.log(`[${new Date().toISOString()}] Approbation finale: ${user.first_name}`);
    } catch (error) {
      console.error('Erreur approbation finale:', error.message);
    }
  }, 600000);
}

function generateCaption(name) {
  return `*${sanitizeText(name)}* félicitations\\! Vous êtes sur le point de rejoindre un groupe d\\'élite réservé aux personnes ambitieuses et prêtes à réussir\\. 

⚠️ *Attention* : Pour finaliser votre adhésion et débloquer l\\'accès à notre communauté privée :  
✅ Rejoignez les canaux ci\\-dessous  
⏳ Vous avez *10 minutes* pour valider  
❌ Après ce délai, accès refusé  et votre place sera offerte à quelqu\\'un d\\'autre

*Rejoignez vite ces canaux pour débloquer votre accès* :`;
}

function generateInlineKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '💰 Canal Officiel', url: CHANNELS_CONFIG.canal1 },
        { text: '💎 VIP Club', url: CHANNELS_CONFIG.canal2 }
      ],
      [
        { text: '✅ Canal 3', url: CHANNELS_CONFIG.canal3 },
        { text: '✅ Canal 4', url: CHANNELS_CONFIG.canal4 }
      ],
      [
        { text: '🤖 Rejoindre le Bot', url: CHANNELS_CONFIG.bot }
      ]
    ]
  };
}

function sanitizeText(text) {
  return text.replace(/[\\*_\[\](){}~`>#+\-=|.!]/g, '\\$&');
}

function handleNotificationError(error, user) {
  if (error.response?.error_code === 403) {
    console.log(`Utilisateur bloqué: ${user.first_name} (ID: ${user.id})`);
  } else {
    console.error(`Erreur notification: ${error.message}`);
  }
}

function handleError(error, user) {
  console.error(`Erreur majeure avec ${user?.first_name || 'utilisateur inconnu'}:`);
  console.error(error.stack);
}

// Gestion des arrêts
process.on('SIGINT', () => {
  console.log('Arrêt propre...');
  server.close();
  bot.stop();
  process.exit();
});

process.on('SIGTERM', () => {
  console.log('Arrêt forcé...');
  server.close();
  bot.stop();
  process.exit();
});

// Démarrage
bot.launch()
  .then(() => console.log('🚀 Bot lancé avec succès'))
  .catch(error => console.error('Échec démarrage:', error));
