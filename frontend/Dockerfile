FROM node:20-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
# Converts React code into static files--Creates /app/dist
# if not specified, Nginx has nothing to serve
RUN npm run build

FROM nginx:alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copies built static files into Nginx web root
COPY --from=build /app/dist /usr/share/nginx/html

# add React Router support, API proxy (/api → backend), Gzip, Caching
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]