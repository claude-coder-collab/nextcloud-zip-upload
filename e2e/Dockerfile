# Bakes the zip_upload app into an official Nextcloud image for e2e testing.
# Run `npm run build` first so js/ contains the built assets.
FROM nextcloud:29-apache
COPY --chown=www-data:www-data . /var/www/html/custom_apps/zip_upload
