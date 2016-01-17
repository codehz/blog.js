FROM ubuntu:trusty
MAINTAINER CodeHz <CodeHz@Outlook.com>
ENV NODE_ENV production
ENV PORT 80
ENV DB_BASE "mongodb://localhost/"

# Update packages
RUN ln -snf /bin/bash /bin/sh
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
RUN echo "deb http://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/3.2 multiverse" >> /etc/apt/sources.list.d/mongodb-org-3.2.list
RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install -y \
    supervisor \
    nodejs \
    npm \
    sudo \
    mongodb-org

# Setup Supervisord
RUN echo "[program:mongod]" >> /etc/supervisor/conf.d/main.conf
RUN echo "command=/usr/bin/mongod" >> /etc/supervisor/conf.d/main.conf
RUN echo "[group:app]" >> /etc/supervisor/conf.d/main.conf
RUN echo "programs=front" >> /etc/supervisor/conf.d/main.conf
RUN echo "[program:front]" >> /etc/supervisor/conf.d/app.conf
RUN echo "command=node app.js" >> /etc/supervisor/conf.d/app.conf
RUN echo "directory=/home/ubuntu/www/current/" >> /etc/supervisor/conf.d/app.conf
RUN echo "user=nobody" >> /etc/supervisor/conf.d/app.conf
RUN echo "autostart=true" >> /etc/supervisor/conf.d/app.conf
RUN echo "autorestart=true" >> /etc/supervisor/conf.d/app.conf
RUN echo "startretries=3" >> /etc/supervisor/conf.d/app.conf
RUN echo "stdout_logfile=/home/ubuntu/www/logs/server.log" >> /etc/supervisor/conf.d/app.conf
RUN echo "stdout_logfile_maxbytes=1MB" >> /etc/supervisor/conf.d/app.conf
RUN echo "stdout_logfile_backups=10" >> /etc/supervisor/conf.d/app.conf
RUN echo "stderr_logfile=/home/ubuntu/www/logs/error.log" >> /etc/supervisor/conf.d/app.conf
RUN echo "stderr_logfile_maxbytes=1MB" >> /etc/supervisor/conf.d/app.conf
RUN echo "stderr_logfile_backups=10" >> /etc/supervisor/conf.d/app.conf
RUN echo "stopsignal=TERM" >> /etc/supervisor/conf.d/app.conf
RUN echo "environment=NODE_ENV='production'" >> /etc/supervisor/conf.d/app.conf

RUN echo "if [ ! -d \"/app_link/coped\"]" >> /start.sh
RUN echo "  if [ ! -d \"/app_link/public\" ]; then" >> /start.sh
RUN echo "    mv /app/public /app_link" >> /start.sh
RUN echo "    mkdir -p /app_link/uploads" >> /start.sh
RUN echo "  else" >> /start.sh
RUN echo "    rm -rf /app/public" >> /start.sh
RUN echo "  fi" >> /start.sh
RUN echo "  touch /app_link/coped" >> /start.sh
RUN echo "fi" >> /start.sh
RUN echo "ln -s /app_link/public ." >> /start.sh
RUN echo "ln -s /app_link/uploads ." >> /start.sh
RUN echo "/usr/bin/supervisord -n" >> /start.sh
RUN chmod +x /start.sh

ADD . /app
WORKDIR /app

VOLUME /app_link

RUN npm install && mkdir -p uploads

EXPOSE 80

CMD ["/start.sh"]