FROM node:18-alpine AS builder

WORKDIR /app

COPY clients/web/package.json clients/web/yarn.lock ./

RUN yarn install --frozen-lockfile

COPY clients/web/ .

ARG VITE_API_BASE_URL
ARG VITE_LIVEKIT_URL

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_LIVEKIT_URL=${VITE_LIVEKIT_URL}

RUN yarn build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY clients/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]