import OllamaProvider from './providers/ollama.js';

let conversationHistory = [];
let ports = new Set();
const provider = new OllamaProvider();

chrome.runtime.onConnect.addListener(function(port) {
    console.log('Port connected:', port.name);
    ports.add(port);
    
    port.onDisconnect.addListener(function() {
        console.log('Port disconnected:', port.name);
        ports.delete(port);
    });

    port.onMessage.addListener(function(request) {
        console.log('Message received in background script:', request);
        if (request.action === 'sendMessage') {
            console.log('Received message:', request.message);
            conversationHistory.push({ role: "user", content: request.message });
            sendToProvider(conversationHistory, port);
        }
    });
});

async function sendToProvider(history, port) {
    console.log('sendToProvider called with history:', history);
    let accumulatedResponse = '';

    try {
        await provider.generateResponse(history, (chunk, isDone) => {
            accumulatedResponse += chunk;
            sendMessageToPort(port, { reply: chunk, done: isDone });
        });

        conversationHistory.push({ role: "assistant", content: accumulatedResponse });
    } catch (error) {
        console.error('Error in sendToProvider:', error);
        sendMessageToPort(port, { reply: `Error: ${error.message}`, done: true });
    }
}

function sendMessageToPort(port, message) {
    if (ports.has(port)) {
        try {
            port.postMessage(message);
        } catch (error) {
            console.error('Error sending message to port:', error);
            ports.delete(port);
        }
    } else {
        console.warn('Attempted to send message to disconnected port');
    }
}

console.log('Background script loaded.');