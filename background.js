let conversationHistory = [];
let ports = new Set();
let provider;

const OllamaProvider = {
    constructor(settings = {}) {
        this.endpoint = settings.url || 'http://localhost:11434';
        this.model = settings.model || 'deepseek-r1:1.5b';
    },

    async generateResponse(history, onChunk) {
        const requestBody = {
            model: this.model,
            prompt: JSON.stringify(history),
            stream: true
        };

        try {
            const response = await fetch(`${this.endpoint}/api/generate`, {
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
                    onChunk(accumulatedResponse, true);
                    break;
                }

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.trim() !== '') {
                        const parsedChunk = JSON.parse(line);
                        accumulatedResponse += parsedChunk.response;
                        onChunk(parsedChunk.response, false);
                    }
                }
            }

            return accumulatedResponse;
        } catch (error) {
            console.error('Error in Ollama API call:', error);
            throw error;
        }
    }
};

function loadProvider() {
    chrome.storage.sync.get(['provider', 'providerSettings'], function(result) {
        const providerType = result.provider || 'ollama';
        const settings = result.providerSettings || {};

        if (providerType === 'ollama') {
            provider = Object.create(OllamaProvider);
            provider.constructor(settings);
        } else {
            // Default to Ollama if no provider is set or recognized
            provider = Object.create(OllamaProvider);
            provider.constructor();
        }
        console.log('Provider loaded:', providerType, 'with settings:', settings);
    });
}

loadProvider();

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

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'reloadProvider') {
        loadProvider();
        sendResponse({success: true});
    }
    return true;
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