FROM node:22.14.0

WORKDIR /app

COPY package*.json ./

RUN npm install -D

COPY . .

RUN npm run build

EXPOSE 3000

CMD sh scripts/start-server.sh