FROM node:18-alpine
RUN chown node:node .
USER node

# npm install
WORKDIR /srv/app
COPY package*.json ./
RUN npm ci

# generate prisma client
COPY prisma ./prisma
RUN npm run prisma:generate

# build 
COPY tsconfig.json ./
COPY src ./src
COPY typings ./typings
RUN npm run build

EXPOSE 8000
ENTRYPOINT npm run prisma:migrate:dev && npm run start

