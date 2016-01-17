FROM node:latest

ADD . /app/package.json
WORKDIR /app

VOLUME /app_link

RUN docker_install.sh

ENV NODE_ENV production
ENV PORT 80
ENV DB_BASE "mongodb://localhost/"

EXPOSE 80

CMD ["/bin/sh", "docker_run.sh"]