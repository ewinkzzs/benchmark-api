FROM dunglas/frankenphp:latest-php8.3

WORKDIR /app

# Install ekstensi PDO MySQL
RUN install-php-extensions pdo_mysql

COPY index.php .

ENV SERVER_NAME=:8080
EXPOSE 8080

CMD ["frankenphp", "php-server", "--root", "/app"]