FROM node:22.14.0

WORKDIR /app

COPY package*.json ./

RUN npm install -D

COPY . .

RUN npx prisma generate

RUN npx tsc -p .

EXPOSE 3000

CMD npx prisma migrate deploy && node .