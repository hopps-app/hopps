# Hopps Frontend SPA

## Project setup

```bash
  pnpm i
```

## Build docker image and run container

```shell
  docker build -t hopps:latest -f docker/Dockerfile .  
```

```shell
  docker run -d -p 8080:8080 hopps:latest
```

## Dev environment configuration

run backend services with docker-compose

```shell
  docker-compose -f docker-compose.dev.yml up
```

run app.hopps.org
```shell
cd ../../backend/app.hopps.org && sh mvnw quarkus:dev
```
