# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY .env.production ./
RUN npm install
COPY . .
RUN npm run build

# Production stage  
FROM nginx:alpine
# Use production nginx config for Fly.io
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf
# Copy built app
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]