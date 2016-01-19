FROM ubuntu:trusty
MAINTAINER CodeHz <CodeHz@Outlook.com>
ENV NODE_ENV production
ENV PORT 80
ENV DB_BASE "mongodb://localhost/"

RUN echo "root:zxcvbnm" | chpasswd

# Update packages
RUN ln -snf /bin/bash /bin/sh
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
RUN echo "deb http://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/3.2 multiverse" >> /etc/apt/sources.list.d/mongodb-org-3.2.list
RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install -y \
    build-essential \
    xz-utils \
    openssh-server \
    nano \
    git \
    supervisor \
    sudo \
    mongodb-org

RUN mkdir -p /var/run/sshd
RUN mkdir -p /var/log/supervisor
RUN mkdir -p /app/node

ADD start.sh /start.sh
RUN chmod +x /start.sh

ADD . /app
WORKDIR /app

RUN tar xvJf /app/docker/node.tar.xz -C /app/node
RUN ln -s /app/node/bin/node /usr/bin
RUN ln -s /app/node/bin/npm /usr/bin

VOLUME /app_link

RUN rm -rf /app/node_modules
RUN /app/node/bin/npm install

EXPOSE 22 80 9001

CMD ["/bin/sh", "-c", "/start.sh"]