# Hopps Frontend SPA

This is the Single Page Application that is used in the Web to manage the finances of an NGO.
It is written in [React](https://react.dev/).

## Local Environment Setup

To run this project locally, set up your environment variables first.

### 1. Create Your Local Environment File

Create a `.env.local` file at root in spa

### 2. Copy Variables from Example File

Copy the variable placeholders from `.env.example`

### 3. Configure Your Variables

Open the `.env.local` file and replace the placeholder values with your actual configuration:

### 4. Install Dependencies

Run:

```bash
pnpm install
```

### 5. Start the Development Server

```bash
  pnpm run dev
```

## Run Project Using Docker and Services

### Prerequisites

- Install [NodeJs v22.15.0+](https://nodejs.org/en) (if you want to handle several Node installations locally for different projects check [nvm](https://github.com/nvm-sh/nvm))

### Optional

- [Docker](https://www.docker.com/) if you want to run the Backend locally

### Run

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
