# step1: build
FROM node:22.14.0 as builder

ENV NODE_ENV=development

WORKDIR /app

COPY package*.json ./

RUN npm install --production=false

COPY . .

RUN npm run build

# step2: run
FROM node:22.14.0

WORKDIR /app

COPY --from=builder /app/out ./out

COPY --from=builder /app/package*.json ./

RUN npm install --production

EXPOSE 9229

CMD ["npm", "start"]

