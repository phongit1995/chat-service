FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.1.2 --activate

WORKDIR /workspace

COPY clients/package.json clients/pnpm-workspace.yaml clients/pnpm-lock.yaml clients/.npmrc ./
COPY clients/packages ./packages
COPY clients/web ./web

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
COPY clients/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
