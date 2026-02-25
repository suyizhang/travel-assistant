#!/bin/bash
set -e

# ========== 配置 ==========
SERVER_IP="43.134.235.34"
SERVER_USER="root"
REMOTE_DIR="/opt/nginx-docker/html/glm-web"
NGINX_CONTAINER="nginx-ssl"
LOCAL_DIST="packages/web/dist"

# ========== 构建 ==========
echo "📦 构建 H5..."
pnpm --filter @glm/web build:h5

# ========== 上传 ==========
echo "🚀 上传到服务器 ${SERVER_IP}..."
rsync -az --delete "${LOCAL_DIST}/" "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/"

# ========== 重载 nginx ==========
echo "🔄 重载 nginx..."
ssh "${SERVER_USER}@${SERVER_IP}" "docker exec ${NGINX_CONTAINER} nginx -s reload"

echo "✅ 部署完成: https://suyi.fun"
