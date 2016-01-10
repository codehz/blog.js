FROM node:latest

ADD . /app
WORKDIR /app

RUN npm install && mkdir uploads

ENV NODE_ENV production
ENV PORT 80
ENV DB_BASE "mongodb://localhost/"

EXPOSE 80

VOLUME /app/uploads

CMD ["node", "app.js"]