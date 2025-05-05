// providers/ollama.js

class OllamaProvider {
    constructor() {
        this.endpoint = 'http://localhost:11434/api/generate';
        this.model = 'deepseek-r1:1.5b';
    }

    async generateResponse(history, onChunk) {
        const requestBody = {
            model: this.model,
            prompt: JSON.stringify(history),
            stream: true
        };

        try {
            const response = await fetch(this.endpoint, {
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
}

export default OllamaProvider;