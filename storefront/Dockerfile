FROM node:22-alpine AS build

WORKDIR /app

ARG PUBLIC_API_URL
ENV PUBLIC_API_URL=$PUBLIC_API_URL

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 4321

CMD ["nginx", "-g", "daemon off;"]