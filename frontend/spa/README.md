# Hopps Frontend SPA

## Project setup

```bash
  pnpm i
```

## build docker image and run container

```shell
  docker build -t hopps:latest -f docker/Dockerfile .  
```

```shell
  docker run -d -p 8080:8080 hopps:latest
```