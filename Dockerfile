# Build the portal, then serve with cache policy that does not pin stale HTML.
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Set VITE_BASE_URL=/subpath/ if the app is not deployed at domain root.
# Optional: docker build --build-arg VITE_GIT_COMMIT=$(git rev-parse HEAD)
ARG VITE_BASE_URL=/
ENV VITE_BASE_URL=${VITE_BASE_URL}
ARG VITE_GIT_COMMIT=""
ENV VITE_GIT_COMMIT=${VITE_GIT_COMMIT}
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
