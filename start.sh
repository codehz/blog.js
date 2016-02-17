#!/bin/sh

cd /app

if [ -d "/app_link/run.sh" ]; then
  ./app_link/run.sh
fi
if [ ! -d "/app_link/uploads" ]; then
  mkdir -p /app_link/uploads
fi
if [ ! -d "/app_link/supervisord.conf" ]; then
    cp /app/supervisord.conf /app_link/supervisord.conf
fi
if [ ! -d "/app_link/db" ]; then
    mkdir -p /app_link/db
fi
rm -f uploads
ln -snf /app_link/uploads .
supervisord -c /app_link/supervisord.conf
