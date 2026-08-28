<?php
require_once __DIR__ . '/config/db.php';

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// Créer la table settings si elle n'existe pas
$db->exec("CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
    setting_value JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

switch ($method) {

    case 'GET':
        $stmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'characteristicLabels'");
        $stmt->execute();
        $row = $stmt->fetch();
        $labels = $row ? json_decode($row['setting_value'], true) : [];
        echo json_encode(['success' => true, 'data' => $labels ?: (object)[]]);
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        if (!is_array($data)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Données invalides']);
            break;
        }
        // Charger les labels existants et les fusionner
        $stmt = $db->prepare("SELECT setting_value FROM settings WHERE setting_key = 'characteristicLabels'");
        $stmt->execute();
        $row = $stmt->fetch();
        $existing = $row ? json_decode($row['setting_value'], true) : [];
        $merged = array_merge((array)$existing, $data);
        $json = json_encode($merged, JSON_UNESCAPED_UNICODE);
        $stmt = $db->prepare("
            INSERT INTO settings (setting_key, setting_value) VALUES ('characteristicLabels', ?)
            ON DUPLICATE KEY UPDATE setting_value = ?
        ");
        $stmt->execute([$json, $json]);
        echo json_encode(['success' => true, 'data' => $merged]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}
