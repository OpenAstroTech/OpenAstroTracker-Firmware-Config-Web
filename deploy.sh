#!/bin/bash

cd /code
docker-compose build -t fw-config --pull && docker-compose up --build --remove-orphans -d