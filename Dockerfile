FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci
COPY client client
COPY server server
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist
ENV NODE_ENV=production
USER node
EXPOSE 8080
CMD ["node", "server/dist/index.js"]
