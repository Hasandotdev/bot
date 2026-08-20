FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma
RUN cd backend && npm install && npx prisma generate

COPY backend ./backend
COPY admin ./admin
COPY widget ./widget
COPY embed.html test.html preview-client.html ./

WORKDIR /app/backend
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]