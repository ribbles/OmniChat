document.addEventListener('DOMContentLoaded', function() {
    const providerSelect = document.getElementById('provider-select');
    const providerSettings = document.getElementById('provider-settings');
    const saveButton = document.getElementById('save-settings');

    const providers = {
        ollama: {
            getSettingsFields: function() {
                return [
                    { name: 'url', label: 'URL', type: 'text', default: 'http://localhost:11434' },
                    { name: 'model', label: 'Model', type: 'select', options: [] }
                ];
            },
            updateModelList: async function(urlInput, modelSelect, selectedModel) {
                const url = urlInput.value;
                try {
                    const response = await fetch(`${url}/api/tags`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    modelSelect.innerHTML = '';
                    data.models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.name;
                        option.textContent = model.name;
                        if (model.name === selectedModel) {
                            option.selected = true;
                        }
                        modelSelect.appendChild(option);
                    });
                } catch (error) {
                    console.error('Error updating model list:', error);
                    modelSelect.innerHTML = '<option value="">Error fetching models</option>';
                }
            }
        }
    };

    function loadSettings() {
        chrome.storage.sync.get(['provider', 'providerSettings'], function(result) {
            const currentProvider = result.provider || 'ollama';
            providerSelect.value = currentProvider;
            showProviderSettings(currentProvider, result.providerSettings || {});
        });
    }

    function showProviderSettings(provider, settings) {
        providerSettings.innerHTML = '';
        if (providers[provider]) {
            const fields = providers[provider].getSettingsFields();
            fields.forEach(field => {
                const fieldContainer = document.createElement('div');
                fieldContainer.classList.add('mb-3');
                if (field.type === 'select') {
                    fieldContainer.innerHTML = `
                        <label for="${field.name}" class="form-label">${field.label}:</label>
                        <select id="${field.name}" name="${field.name}" class="form-select"></select>
                    `;
                } else {
                    fieldContainer.innerHTML = `
                        <label for="${field.name}" class="form-label">${field.label}:</label>
                        <input type="${field.type}" id="${field.name}" name="${field.name}" 
                               class="form-control" value="${settings[field.name] || field.default || ''}">
                    `;
                }
                providerSettings.appendChild(fieldContainer);

                if (field.name === 'url') {
                    const urlInput = fieldContainer.querySelector('input');
                    const modelSelect = document.getElementById('model');
                    urlInput.addEventListener('change', () => providers[provider].updateModelList(urlInput, modelSelect, settings.model));
                }
            });
            const urlInput = document.getElementById('url');
            const modelSelect = document.getElementById('model');
            providers[provider].updateModelList(urlInput, modelSelect, settings.model);
        }
    }

    providerSelect.addEventListener('change', function() {
        chrome.storage.sync.get('providerSettings', function(result) {
            showProviderSettings(providerSelect.value, result.providerSettings || {});
        });
    });

    saveButton.addEventListener('click', function() {
        const provider = providerSelect.value;
        const settings = {};
        const fields = providers[provider].getSettingsFields();
        fields.forEach(field => {
            settings[field.name] = document.getElementById(field.name).value;
        });

        chrome.storage.sync.set({ provider: provider, providerSettings: settings }, function() {
            if (chrome.runtime.lastError) {
                console.error('Error saving settings:', chrome.runtime.lastError);
                alert('Error saving settings. Please try again.');
            } else {
                console.log('Settings saved');
                chrome.runtime.sendMessage({ action: 'reloadProvider' });
                alert('Settings saved successfully!');
            }
        });
    });

    loadSettings();
});