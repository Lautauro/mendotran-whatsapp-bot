FROM alpine:latest
WORKDIR /app

# Instalar dependencias y configurar la zona horaria
RUN apk upgrade -U && \
    apk add --no-cache npm chromium tzdata && \
    cp /usr/share/zoneinfo/America/Argentina/Mendoza /etc/localtime && \
    apk del tzdata

# Instalar paquetes npm
COPY package.json ./
RUN npm i --omit=dev 

# Copiar el resto del código y compilarlo
COPY . .
RUN npm run build

# Configurar volumenes
VOLUME ["/app/cache", "/app/config"]

CMD echo -e "[$(date +"\e[1;32m%Y-%m-%d %H:%M:%S\e[0m")]: INICIANDO BOT" && \
    npm start
