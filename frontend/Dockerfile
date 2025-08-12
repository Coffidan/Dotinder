# Stage 1: Сборка React
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
# Устанавливаем правильные права
RUN chown -R node:node /app
USER node
RUN npm run build

# Stage 2: Production с Nginx
FROM nginx:alpine
# Копируем собранные файлы
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
