FROM node:18-alpine as builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

FROM node:18-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
RUN chown node:node .
USER node

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules node_modules/
COPY --from=builder /usr/src/app/dist dist/
COPY --from=builder /usr/src/app/prisma prisma/

EXPOSE 8000
CMD ["npm", "run", "start:migrate"]
