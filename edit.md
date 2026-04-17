Ubah bagian Language / Runtime menjadi:

Docker

Setelah itu Render tidak akan meminta Build Command dan Start Command lagi, karena semuanya akan diatur oleh file bernama Dockerfile di repository.

Sekarang kita perlu menambahkan satu file kecil di project Laravel kamu.

Buat file baru di root project (sejajar dengan artisan, composer.json, dll):

Dockerfile

Isi dengan ini:

FROM php:8.2-cli

WORKDIR /var/www

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libzip-dev \
    zip \
    npm \
    && docker-php-ext-install pdo pdo_mysql zip

COPY . .

RUN curl -sS https://getcomposer.org/installer | php
RUN php composer.phar install --no-dev --optimize-autoloader

RUN npm install
RUN npm run build

EXPOSE 10000

CMD php artisan serve --host=0.0.0.0 --port=10000

Lalu commit ke GitHub:

git add Dockerfile
git commit -m "add docker deployment"
git push

Setelah itu kembali ke Render dan klik Create Web Service lagi.

Render akan melakukan proses ini secara otomatis:

clone repo
build docker image
install composer
install npm
build vite
start laravel