FROM nginx:alpine

COPY export/web/ /usr/share/nginx/html/

# Required headers for SharedArrayBuffer (needed by Godot WASM threads)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
