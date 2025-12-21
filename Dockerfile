FROM node:20-alpine AS builder
WORKDIR /src
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine
RUN addgroup -g 1001 -S buildGroup && adduser -S nestUser -u 1001 -G buildGroup

WORKDIR /src


# Copy package files
COPY --from=builder --chown=nestUser:buildGroup /src/package.json /src/pnpm-lock.yaml ./
# Copy production dependencies from builder
COPY --from=builder --chown=nestUser:buildGroup /src/node_modules ./node_modules
# Copy built application
COPY --from=builder --chown=nestUser:buildGroup /src/dist ./dist


USER nestUser

EXPOSE 3001

CMD ["/usr/local/bin/node", "dist/src/main"]


