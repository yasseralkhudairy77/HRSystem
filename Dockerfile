FROM node:22-bookworm

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip ffmpeg \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci

RUN python3 -m pip install --break-system-packages piper-tts imageio-ffmpeg

COPY . .

RUN python3 -m piper.download_voices --download-dir /app/server/piper/models id_ID-news_tts-medium

ENV PORT=8788

EXPOSE 8788

CMD ["node", "server/piper-api.mjs"]
