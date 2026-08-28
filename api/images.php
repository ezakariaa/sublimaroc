<?php
require_once __DIR__ . '/config/db.php';

// Lister les images du dossier images/
$imagesDir = __DIR__ . '/../images/';

if (!is_dir($imagesDir)) {
    mkdir($imagesDir, 0755, true);
}

$files = array_values(array_filter(
    scandir($imagesDir),
    fn($f) => preg_match('/\.(png|jpg|jpeg|gif|webp)$/i', $f)
));

echo json_encode($files);
