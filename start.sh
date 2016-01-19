#!/bin/sh

cd /app

if [ -d "/app_link/run.sh" ]; then
  ./app_link/run.sh
fi
if [ ! -d "/app_link/coped" ]; then
  if [ ! -d "/app_link/public" ]; then
    mv /app/public /app_link
    mkdir -p /app_link/uploads
  else
    rm -rf /app/public
  fi
  touch /app_link/coped
fi
if [ ! -d "/app_link/supervisord.conf" ]; then
    cp /app/supervisord.conf /app_link/supervisord.conf
fi
if [ ! -d "/app_link/db" ]; then
    mkdir -p /app_link/db
fi
rm -rf public
rm -f uploads
ln -snf /app_link/public .
ln -snf /app_link/uploads .
supervisord -c /app_link/supervisord.conf