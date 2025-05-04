# OmniChat

OmniChat is a Google Chrome extension that provides a chat interface similar to chat.com, using a local Ollama instance as the backend.

## Features

- Chat interface similar to chat.com
- Integration with local Ollama instance
- Uses the deepseek-r1:1.5b model
## Installation

1. Clone this repository or download the source code.
2. Create icon files for the extension:
   - Add the following icon files to the `images` folder in the root directory if it doesn't exist:
     - `icon16.png` (16x16 pixels)
     - `icon48.png` (48x48 pixels)
     - `icon128.png` (128x128 pixels)
3. Open Google Chrome and navigate to `chrome://extensions`.
4. Enable "Developer mode" in the top right corner.
5. Click "Load unpacked" and select the directory containing the extension files.

## Ollama Setup

1. Install Ollama on your local machine by following the instructions at [Ollama's official website](https://ollama.ai/).
2. Start the Ollama service on your machine.
3. Ensure that Ollama is running and accessible at `http://localhost:11434`.
4. Install the deepseek-r1:1.5b model in Ollama. You can install it using:
