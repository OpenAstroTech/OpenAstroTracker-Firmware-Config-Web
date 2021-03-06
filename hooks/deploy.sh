#!/bin/bash

cd /code
docker-compose build --pull && docker-compose up --build --remove-orphans -d