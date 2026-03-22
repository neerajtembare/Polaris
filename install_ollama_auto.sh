#!/bin/bash
# Install required dependencies
echo "ashutosh" | sudo -S apt update
echo "ashutosh" | sudo -S apt install -y curl zstd lsof pciutils

# Download and run the Ollama installer
curl -fsSL https://ollama.com/install.sh -o /tmp/install_ollama.sh
echo "ashutosh" | sudo -S bash /tmp/install_ollama.sh

# Start the Ollama server in background (if not already started by systemd)
# systemd might not work in some WSL environments.
ollama serve >/tmp/ollama.log 2>&1 &
sleep 3

# Pull the model
ollama pull llama3.2:3b
