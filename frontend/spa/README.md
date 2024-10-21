# Hopps Frontend SPA

## Project setup

```bash
  pnpm i
```

## build docker image and run container

```bash
  docker build -t hopps:latest -f docker/Dockerfile .
  docker run -d -p 80:80 hopps:latest     
```