FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

WORKDIR /workspace

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages ./packages
COPY web ./web

RUN pnpm install --frozen-lockfile --filter web... --filter web

ARG VITE_API_BASE_URL
ARG VITE_WS_URL
ARG VITE_LIVEKIT_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_WS_URL=${VITE_WS_URL}
ENV VITE_LIVEKIT_URL=${VITE_LIVEKIT_URL}

RUN pnpm --filter web build

FROM nginx:alpine

COPY --from=builder /workspace/web/dist /usr/share/nginx/html
COPY web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
