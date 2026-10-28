FROM nginx:1.31

WORKDIR /app

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/
#TODO: COPY static folder in the future

EXPOSE 80