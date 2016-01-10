FROM node:latest

ADD . /app
WORKDIR /app

RUN npm install && mkdir uploads

ENV NODE_ENV production
ENV PORT 80

EXPOSE 80

VOLUME ['/app/uploads']

CMD ["node", "app.js"]