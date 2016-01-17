FROM ubuntu:trusty
MAINTAINER CodeHz <CodeHz@Outlook.com>
ENV USER ubuntu
ENV PASSWORD 12345678
ENV NODE '5.1.0'
ENV NODE_ENV production
ENV PORT 80
ENV DB_BASE "mongodb://localhost/"

# Update packages
RUN ln -snf /bin/bash /bin/sh
RUN sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
RUN echo "deb http://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/3.2 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.2.list
RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install -y \
    supervisor \
    git-core \
    curl \
    build-essential \
    libssl-dev \
    pkg-config \
    libexpat1-dev \
    libicu-dev \
    libcairo2-dev \
    libjpeg8-dev \
    libgif-dev \
    libpango1.0-dev \
    g++ \
    software-properties-common \
    sudo \
    mongodb-org


# Add user
RUN useradd -ms /bin/bash $USER
RUN adduser $USER sudo
RUN echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

USER $USER
WORKDIR /home/$USER

# Setup NVM
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.29.0/install.sh | bash
RUN cat /home/ubuntu/.nvm/nvm.sh >> /home/ubuntu/installnode.sh
RUN echo "nvm install $NODE" >> /home/ubuntu/installnode.sh
RUN sh installnode.sh
RUN sudo sed -i "s@.*PATH.*@PATH=\/home\/ubuntu\/.nvm\/versions\/node\/v$NODE\/bin:$PATH@" /etc/init.d/supervisor

RUN mkdir -p ~/www/logs

USER root

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

RUN echo "/usr/bin/supervisord -n" >> /start.sh
RUN chmod +x /start.sh

ADD . /app
WORKDIR /app

VOLUME /app_link

RUN /app/docker_install.sh

EXPOSE 80

CMD ["/bin/sh", "-c", "docker_run.sh"]