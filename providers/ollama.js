// providers/ollama.js

class OllamaProvider {
    constructor(settings = {}) {
        this.endpoint = settings.url || 'http://localhost:11434';
        this.model = settings.model || 'deepseek-r1:1.5b';
    }

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

    static getSettingsFields() {
        return [
            { name: 'url', label: 'URL', type: 'text', default: 'http://localhost:11434' },
            { name: 'model', label: 'Model', type: 'select', options: [] }
        ];
    }

    static async getAvailableModels(url) {
        try {
            const response = await fetch(`${url}/api/tags`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.models.map(model => model.name);
        } catch (error) {
            console.error('Error fetching available models:', error);
            throw error;
        }
    }

    static async updateModelList(urlInput, modelSelect) {
        const url = urlInput.value;
        try {
            const models = await this.getAvailableModels(url);
            modelSelect.innerHTML = '';
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model;
                option.textContent = model;
                modelSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error updating model list:', error);
            modelSelect.innerHTML = '<option value="">Error fetching models</option>';
        }
    }
}

export default OllamaProvider;