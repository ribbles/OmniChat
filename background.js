let conversationHistory = [];
let ports = new Set();

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
            sendToOllama(conversationHistory, port);
        }
    });
});

async function sendToOllama(history, port) {
    console.log('sendToOllama called with history:', history);
    const ollamaEndpoint = 'http://localhost:11434/api/generate';
    const model = 'deepseek-r1:1.5b';

    const requestBody = {
        model: model,
        prompt: JSON.stringify(history),
        stream: true
    };

    console.log('Sending request to Ollama:', requestBody);

    try {
        const response = await fetch(ollamaEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        let accumulatedResponse = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log('Stream complete. Sending final response.');
                sendMessageToPort(port, { reply: accumulatedResponse, done: true });
                break;
            }

            const chunk = new TextDecoder().decode(value);
            console.log('Received chunk:', chunk);
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.trim() !== '') {
                    const parsedChunk = JSON.parse(line);
                    accumulatedResponse += parsedChunk.response;
                    console.log('Sending chunk:', parsedChunk.response);
                    sendMessageToPort(port, { reply: parsedChunk.response, done: false });
                }
            }
        }

        conversationHistory.push({ role: "assistant", content: accumulatedResponse });
        console.log('Final response:', accumulatedResponse);
    } catch (error) {
        console.error('Error in sendToOllama:', error);
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