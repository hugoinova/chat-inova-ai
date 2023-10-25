const express = require('express');
const expressWs = require('express-ws');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

// id do whatspp,url endpoint , na url em system , é onde o prompt é criado
const client = new Client();
const pessoaId = '556195707439@c.us';
const endpoint = 'http://172.21.20.4:8131/api/v1/ask?modelId=openhermes2-mistral:7b-fp16&system=system=AtendenteMédicoSAMUWhatsAppExperiência30Anos&maxTokens=1024';

const app = express();
const wsInstance = expressWs(app);

// Inicializar um array para armazenar mensagens e respostas
const messages = [];

// Função para mostrar o código QR no terminal
const showQR = (qrCode) => {
  console.log('Escaneie o QR code com o seu dispositivo móvel para fazer login no WhatsApp Web:');
  qrcode.generate(qrCode, { small: true });
};

client.on('qr', showQR);

client.on('ready', () => {
  console.log('WhatsApp Web está pronto e conectado.');
});

client.initialize();

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.ws('/', (ws, req) => {
  ws.on('message', (message) => {
    // Ldar com mensagens WebSocket aqui ...(Depois se precisar vejo)
  });
});

app.listen(3000, () => {
  console.log('Servidor está ouvindo na porta 3000');
});

client.on('message', async (message) => {
  if (message.from === pessoaId) {
    console.log('Mensagem recebida de:', message.from);
    console.log('Conteúdo da mensagem:', message.body);

    // Fazer uma solicitação ao endpoint com a mensagem recebida
    try {
      // Envie a mensagem do remetente para o endpoint como pergunta
      const response = await axios.get(`${endpoint}&question=${encodeURIComponent(message.body)}`);
      const resposta = response.data.answer;

      // Armazene a mensagem e a resposta no array
      messages.push({ from: message.from, body: message.body });
      messages.push({ from: 'Chatbot', body: resposta });

      // Enviar a resposta de volta para o WhatsApp
      client.sendMessage(message.from, resposta); 

      // registre a mensagem enviada no console
    console.log('Mensagem enviada para:', message.from);
    console.log('Conteúdo da mensagem enviada:', resposta);

      // Enviar as mensagens atualizadas para o cliente WebSocket
      wsInstance.getWss().clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify({ messages: messages }));
        }
      });
    } catch (error) {
      console.error('Erro ao fazer a solicitação:', error);
    }
  }
});
