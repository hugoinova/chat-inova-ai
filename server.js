const express = require('express');
const expressWs = require('express-ws');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

const client = new Client();
const pessoaId = '556195707439@c.us';
const endpoint = 'http://172.21.20.4:8131/api/v1/ask?model=DoctorGPT&question=oqueediabetes&system=sejaummedico&maxTokens=1024';

const app = express();
const wsInstance = expressWs(app);
const messages = []; // Array para armazenar mensagens

client.on('qr', (qrCode) => {
  qrcode.generate(qrCode, { small: true });
});

client.on('ready', () => {
  console.log('WhatsApp Web está pronto e conectado.');
});

client.on('message', async (message) => {
  if (message.from === pessoaId) {
    console.log('Mensagem recebida de:', message.from);
    console.log('Conteúdo da mensagem:', message.body);

    // Armazena a mensagem no array
    messages.push({ from: message.from, body: message.body });

    // Fazer uma solicitação ao endpoint com a mensagem recebida
    try {
      const response = await axios.get(`${endpoint}&question=${encodeURIComponent(message.body)}`);
      const resposta = response.data.message;

      // Enviar a resposta de volta para o WhatsApp
      client.sendMessage(message.from, resposta);

      // Anexe a resposta ao objeto de mensagem
      messages.push({ from: "Chatbot", body: resposta });

      // Enviar a mensagem e a resposta para o cliente WebSocket conectado
      wsInstance.getWss().clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify({ from: message.from, body: message.body, response: resposta, messages: messages }));
        }
      });
    } catch (error) {
      console.error('Erro ao fazer a solicitação:', error);
    }
  }
});

client.initialize();

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.ws('/', (ws, req) => {
  // Enviar as mensagens armazenadas no array para o cliente WebSocket
  ws.send(JSON.stringify({ messages: messages }));

  ws.on('message', (message) => {
    // Lide com mensagens WebSocket aqui
  });
});

const port = 3000;
app.listen(port, () => {
  console.log(`Servidor está ouvindo na porta ${port}`);
});
