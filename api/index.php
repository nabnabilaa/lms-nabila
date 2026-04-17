<?php
// Pastikan folder storage ada di /tmp untuk environment read-only Vercel
$storagePath = '/tmp/storage';

$dirs = [
    "$storagePath/app/public",
    "$storagePath/framework/cache/data",
    "$storagePath/framework/sessions",
    "$storagePath/framework/views",
    "$storagePath/logs",
    "$storagePath/bootstrap/cache",
];

foreach ($dirs as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
}

// Set environment variable untuk storage_path Laravel
$_ENV['APP_STORAGE'] = $storagePath;
putenv("APP_STORAGE={$storagePath}");
$_ENV['VIEW_COMPILED_PATH'] = "{$storagePath}/framework/views";
putenv("VIEW_COMPILED_PATH={$storagePath}/framework/views");


// Meneruskan request dari serverless Vercel ke sistem utama Laravel
require __DIR__ . '/../public/index.php';
