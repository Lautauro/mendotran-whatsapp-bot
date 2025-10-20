FROM alpine:latest
WORKDIR /app

# Instalar dependencias y configurar la zona horaria
RUN apk upgrade -U
RUN apk add --no-cache npm chromium tzdata
RUN cp /usr/share/zoneinfo/America/Argentina/Mendoza /etc/localtime
RUN apk del tzdata

ENV TZ=America/Argentina/Mendoza

# Instalar paquetes npm
COPY package.json ./
RUN npm i --omit=dev 

# Copiar el resto del código y compilarlo
COPY cache/ ./cache/
COPY config/ ./config/
COPY json/ ./json/
COPY src/ ./src/
COPY LICENCE ./
COPY tsconfig.json ./
RUN npm run build

# Configurar volumenes
VOLUME ["/app/cache", "/app/config"]

CMD echo -e "[$(date +"\e[1;32m%Y-%m-%d %H:%M:%S\e[0m")]: INICIANDO BOT"
CMD npm start
