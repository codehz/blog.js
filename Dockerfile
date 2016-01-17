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
    nodejs \
    npm \
    sudo \
    mongodb-org

RUN echo "if [ -d \"/app_link/run.sh\" ]; then"
RUN echo "  ./app_link/run.sh"
RUN echo "  rm -rf ./app_link/run.sh"
RUN echo "fi"
RUN echo "if [ ! -d \"/app_link/coped\" ]; then" >> /start.sh
RUN echo "  if [ ! -d \"/app_link/public\" ]; then" >> /start.sh
RUN echo "    mv /app/public /app_link" >> /start.sh
RUN echo "    mkdir -p /app_link/uploads" >> /start.sh
RUN echo "  else" >> /start.sh
RUN echo "    rm -rf /app/public" >> /start.sh
RUN echo "  fi" >> /start.sh
RUN echo "  touch /app_link/coped" >> /start.sh
RUN echo "fi" >> /start.sh
RUN echo "rm -rf public"
RUN echo "rm -rf uploads"
RUN echo "ln -sf /app_link/public ." >> /start.sh
RUN echo "ln -sf /app_link/uploads ." >> /start.sh
RUN echo "mongod --noauth --fork --bind_ip 127.0.0.1 --nohttpinterface --dbpath /app_link/db --logpath db.log" >> /start.sh
RUN echo "nodemon app.js" >> /start.sh
RUN chmod +x /start.sh

ADD . /app
WORKDIR /app

VOLUME /app_link

RUN npm install && npm install -g nodemon && mkdir -p uploads

EXPOSE 8000

CMD ["/bin/sh", "-c", "/start.sh"]