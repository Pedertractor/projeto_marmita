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

# URL pública da API (browser do usuário). Ex.: http://10.20.2.77:3404
# .env não entra no build (.dockerignore) — passe via --build-arg / compose.
ARG VITE_API_URL=http://127.0.0.1:3404
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# --- Serve with NGINX ---
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
