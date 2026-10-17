FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx next build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3001
COPY --from=build /app ./
EXPOSE 3001
# NEXTAUTH_URL falls back to Render's public URL when deployed there.
CMD ["sh", "-c", "export NEXTAUTH_URL=${NEXTAUTH_URL:-$RENDER_EXTERNAL_URL}; exec npx next start -p ${PORT}"]
