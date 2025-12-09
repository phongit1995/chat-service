#!/bin/bash

# Chat Server - Production Server Setup Script
# This script prepares the production server for automated deployments

set -e

echo "🚀 Chat Server - Production Setup"
echo "=================================="

# Configuration
DEPLOY_PATH="${1:-$HOME/chat-server}"
DEPLOY_USER=$(whoami)

echo ""
echo "📋 Configuration:"
echo "   Deploy Path: $DEPLOY_PATH"
echo "   Deploy User: $DEPLOY_USER"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "⚠️  Please do not run this script as root"
   exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# Install required packages
echo "📦 Installing required packages..."
sudo apt-get install -y -qq \
  curl \
  git \
  jq \
  ca-certificates \
  gnupg \
  lsb-release

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $DEPLOY_USER
  rm get-docker.sh
  echo "✅ Docker installed"
else
  echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
  sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
  echo "✅ Docker Compose installed"
else
  echo "✅ Docker Compose already installed"
fi

# Create deployment directory structure
echo "📁 Creating deployment directories..."
mkdir -p "$DEPLOY_PATH"
cd "$DEPLOY_PATH"
mkdir -p logs scripts

# Create helper scripts
echo "📝 Creating helper scripts..."

# Health check script
cat > scripts/health-check.sh << 'HEALTH_SCRIPT'
#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "🏥 Running health checks..."

API_HEALTH=$(curl -sf http://localhost:8080/api/health 2>/dev/null || echo "failed")
if [ "$API_HEALTH" = "failed" ]; then
  echo "❌ API service health check failed"
  exit 1
fi
echo "✅ API service is healthy"

WS_CHECK=$(curl -sf -I http://localhost:8080/socket.io/ 2>/dev/null || echo "failed")
if [ "$WS_CHECK" = "failed" ]; then
  echo "❌ WebSocket service check failed"
  exit 1
fi
echo "✅ WebSocket service is accessible"

UNHEALTHY=$(docker compose ps --format json | jq -r 'select(.Health == "unhealthy") | .Name' | wc -l)
if [ "$UNHEALTHY" -gt 0 ]; then
  echo "❌ Found $UNHEALTHY unhealthy containers"
  docker compose ps
  exit 1
fi

echo "✅ All containers are healthy"
echo ""
docker compose ps
HEALTH_SCRIPT

# Logs script
cat > scripts/logs.sh << 'LOGS_SCRIPT'
#!/bin/bash

cd "$(dirname "$0")/.."

SERVICE="${1:-all}"

if [ "$SERVICE" = "all" ]; then
  docker compose logs -f
else
  docker compose logs -f "$SERVICE"
fi
LOGS_SCRIPT

# Status script
cat > scripts/status.sh << 'STATUS_SCRIPT'
#!/bin/bash

cd "$(dirname "$0")/.."

echo "📊 Chat Server Status"
echo "===================="
echo ""

echo "🐳 Docker Containers:"
docker compose ps
echo ""

echo "💾 Disk Usage:"
df -h / | grep -v Filesystem
echo ""

echo "🗂️  Docker Volumes:"
docker volume ls | grep chat-server
echo ""

echo "📦 Docker Images:"
docker images | grep chat-service
echo ""

STATUS_SCRIPT

# Make scripts executable
chmod +x scripts/*.sh

echo "✅ Helper scripts created in $DEPLOY_PATH/scripts/"

# Configure UFW firewall
echo "🔒 Configuring firewall..."
if command -v ufw &> /dev/null; then
  sudo ufw allow 22/tcp  # SSH
  sudo ufw allow 8080/tcp  # API
  sudo ufw allow 8081/tcp  # Chat (optional)
  echo "✅ Firewall rules configured"
else
  echo "⚠️  UFW not installed, skipping firewall configuration"
fi

# Setup log rotation
echo "📝 Setting up log rotation..."
sudo tee /etc/logrotate.d/chat-server > /dev/null << 'LOGROTATE'
$DEPLOY_PATH/logs/*.log {
  daily
  rotate 7
  compress
  delaycompress
  notifempty
  missingok
  create 0644 $DEPLOY_USER $DEPLOY_USER
}
LOGROTATE

echo "✅ Log rotation configured"

# Create systemd service for auto-start
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/chat-server.service > /dev/null << SYSTEMD_SERVICE
[Unit]
Description=Chat Server Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$DEPLOY_PATH
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=$DEPLOY_USER

[Install]
WantedBy=multi-user.target
SYSTEMD_SERVICE

sudo systemctl daemon-reload
sudo systemctl enable chat-server.service
echo "✅ Systemd service created and enabled"

# Print summary
echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Copy your docker-compose.yml to: $DEPLOY_PATH/"
echo "   2. Create .env file with production configurations"
echo "   3. Configure GitHub Secrets with server details"
echo "   4. Run first deployment manually: cd $DEPLOY_PATH && docker compose up -d"
echo ""
echo "🔧 Available scripts:"
echo "   - $DEPLOY_PATH/scripts/health-check.sh # Check service health"
echo "   - $DEPLOY_PATH/scripts/logs.sh [service] # View logs"
echo "   - $DEPLOY_PATH/scripts/status.sh       # Show system status"
echo ""
echo "⚠️  IMPORTANT: You need to log out and log back in for Docker group changes to take effect!"
echo ""