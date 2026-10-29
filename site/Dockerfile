FROM node:24-alpine AS build
RUN apk add --no-cache python3 py3-pip
WORKDIR /app
COPY site/package.json site/package-lock.json ./site/
RUN npm ci --prefix site
COPY site/src ./site/src
COPY site/content ./site/content
COPY site/vite.config.js site/requirements.txt ./site/
COPY content/posts ./content/posts
COPY static/images ./static/images
RUN python3 -m venv /app/venv && /app/venv/bin/pip install --no-cache-dir -r site/requirements.txt
RUN /app/venv/bin/python3 site/src/build.py

FROM nginx:alpine
COPY site/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/site/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
