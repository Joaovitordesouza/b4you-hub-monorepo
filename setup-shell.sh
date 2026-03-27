#!/bin/bash
# Script to load the required environment for b4you-hub deployment tools.
# Usage: source setup-shell.sh

export NVM_DIR="/home/diro/b4you/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

export PATH="/home/diro/b4you/google-cloud-sdk/bin:$PATH"

echo "Environment loaded!"
echo "Node version: $(node -v)"
echo "Firebase version: $(firebase --version)"
echo "GCloud version: $(gcloud --version | head -n 1)"
echo ""
echo "Next steps:"
echo "1. Run: gcloud auth login"
echo "2. Run: firebase login"
echo "3. Run: gcloud config set project b4you-hub"
