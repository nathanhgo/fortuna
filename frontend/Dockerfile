# Imagem de desenvolvimento — roda `next dev` com o código montado via bind mount
# (docker-compose.yml), então mudanças no host refletem sem rebuild (hot reload). Não é
# otimizada para produção (isso ainda não é uma preocupação nesta fase do projeto).
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000 9229

# NODE_DEBUGGER=1 liga o inspector do Node em 0.0.0.0:9229 (ver .vscode/launch.json).
CMD ["sh", "-c", "if [ \"$NODE_DEBUGGER\" = \"1\" ]; then npx next dev --inspect=0.0.0.0:9229; else npm run dev; fi"]
