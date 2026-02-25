#!/bin/bash
# 一键部署到腾讯云 Lighthouse
# 用法: npm run deploy

set -e

SERVER="root@43.134.235.34"
REMOTE_DIR="/root/glm-assistant"
IMAGE_NAME="glm-assistant"

echo "📦 1. 上传项目文件..."
rsync -avz --exclude='node_modules' --exclude='dist' --exclude='.env' --exclude='.git' \
  ./ ${SERVER}:${REMOTE_DIR}/

echo "🔨 2. 远程构建镜像..."
ssh ${SERVER} "cd ${REMOTE_DIR} && docker build -t ${IMAGE_NAME} ."

echo "🚀 3. 重启容器..."
ssh ${SERVER} "docker rm -f ${IMAGE_NAME} 2>/dev/null; \
  docker run -d \
    --name ${IMAGE_NAME} \
    -p 712:712 \
    --env-file ${REMOTE_DIR}/.env \
    --restart always \
    ${IMAGE_NAME}"

echo "⏳ 4. 等待服务启动..."
sleep 3

echo "✅ 5. 验证服务..."
ssh ${SERVER} "curl -s http://localhost:712/api/health"

echo ""
echo "🎉 部署完成! 访问: http://43.134.235.34:712"
