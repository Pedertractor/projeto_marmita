FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Para proxy corporativo com MITM TLS: --build-arg ALLOW_INSECURE_TLS=1
ARG ALLOW_INSECURE_TLS=0
RUN if [ "$ALLOW_INSECURE_TLS" = "1" ]; then \
      npm set strict-ssl false && \
      export NODE_TLS_REJECT_UNAUTHORIZED=0; \
    fi && \
    npm install

COPY . .

RUN npm run build

# --- Serve with NGINX ---
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
