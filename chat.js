document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const spinner = document.getElementById('spinner');

    let currentThinkElement, currentAiElement;
    let accumulatedThinkContent = '';
    let accumulatedAiContent = '';
    let isThinking = false;
    let port;

    function connectPort() {
        port = chrome.runtime.connect({name: "chat"});
        port.onDisconnect.addListener(reconnectPort);
        port.onMessage.addListener(handleResponse);
        console.log('Port connected');
    }

    function reconnectPort() {
        console.log('Port disconnected. Attempting to reconnect...');
        connectPort();
    }

    connectPort();

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    function sendMessage() {
        console.log('sendMessage function called');
        const message = userInput.value.trim();
        console.log('Message to send:', message);
        if (message) {
            addMessage('user', message);
            userInput.value = '';
            currentThinkElement = addMessage('think', '');
            currentAiElement = addMessage('ai', '');
            accumulatedThinkContent = '';
            accumulatedAiContent = '';
            isThinking = true;
            showSpinner();
            console.log('Sending message to background script');
            try {
                port.postMessage({action: 'sendMessage', message: message});
            } catch (error) {
                console.error('Error sending message:', error);
                reconnectPort();
                // Retry sending the message after reconnecting
                setTimeout(() => {
                    port.postMessage({action: 'sendMessage', message: message});
                }, 100);
            }
        }
    }

    function handleResponse(response) {
        console.log('handleResponse called with:', response);
        if (response && response.reply) {
            if (response.reply.includes('<think>')) {
                accumulatedThinkContent += response.reply.replace(/<\/?think>/g, '').trim() + ' ';
                updateThinkContent();
            } else if (response.reply.includes('</think>')) {
                // End of think content
                isThinking = false;
                collapseThinkConte();
            } else {
                accumulatedAiContent += response.reply.trim() + ' ';
                updateAiContent();
                if (isThinking) {
                    isThinking = false;
                    collapseThinkContent();
                }
            }

            if (response.done) {
                console.log('Response done. Final think content:', accumulatedThinkContent);
                console.log('Response done. Final AI content:', accumulatedAiContent);
                hideSpinner();
            }
        }
    }

    function updateThinkContent() {
        currentThinkElement.querySelector('.content').textContent = accumulatedThinkContent;
    }

    function updateAiContent() {
        currentAiElement.textContent = accumulatedAiContent;
    }

    function collapseThinkContent() {
        currentThinkElement.classList.add('collapsed');
    }

    function addMessage(sender, text) {
        console.log(`Adding ${sender} message:`, text);
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`, 'mb-2', 'p-2', 'rounded');
        
        if (sender === 'user') {
            messageElement.classList.add('text-end', 'bg-primary', 'text-white');
        } else if (sender === 'ai') {
            messageElement.classList.add('bg-light');
        } else if (sender === 'think') {
            messageElement.classList.add('bg-secondary', 'text-white', 'fst-italic');
            
            const header = document.createElement('div');
            header.classList.add('think-header', 'd-flex', 'align-items-center', 'cursor-pointer');
            
            const arrow = document.createElement('span');
            arrow.classList.add('me-2');
            arrow.textContent = '▼';
            
            const label = document.createElement('span');
            label.classList.add('think-label');
            label.textContent = 'Thinking:';
            
            header.appendChild(arrow);
            header.appendChild(label);
            
            const content = document.createElement('div');
            content.classList.add('content', 'mt-1');
            
            messageElement.appendChild(header);
            messageElement.appendChild(content);
            
            header.addEventListener('click', function() {
                content.classList.toggle('d-none');
                arrow.textContent = content.classList.contains('d-none') ? '▶' : '▼';
            });
        }
        
        if (sender !== 'think') {
            messageElement.textContent = text;
        }
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageElement;
    }

    function showSpinner() {
        spinner.classList.remove('d-none');
    }

    function hideSpinner() {
        spinner.classList.add('d-none');
    }

    // Sidebar functionality
    const sidebarToggle = document.querySelector('[data-bs-toggle="collapse"]');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            document.querySelector('.sidebar').classList.toggle('show');
        });
    }
});

console.log('Chat script loaded.');