#!/bin/sh

if [ ! -d "/app_link/coped"]
    if [ ! -d "/app_link/public" ]; then
        mv /app/public /app_link
    else
        rm -rf /app/public
    fi
fi

ln -s /app_link/public .