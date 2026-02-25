FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json ./
RUN pnpm install

COPY tsconfig.json ./
COPY src ./src

EXPOSE 712

CMD ["pnpm", "tsx", "src/server.ts"]
