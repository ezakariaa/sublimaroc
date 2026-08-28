<?php
require_once __DIR__ . '/config/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['email']) || empty($data['password'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Email et mot de passe requis']);
        exit;
    }

    $db = getDB();
    $stmt = $db->prepare('SELECT id, email, nom, role, password_hash FROM users WHERE email = ?');
    $stmt->execute([trim($data['email'])]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($data['password'], $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Email ou mot de passe incorrect']);
        exit;
    }

    echo json_encode(['success' => true, 'data' => [
        'id'    => $user['id'],
        'email' => $user['email'],
        'nom'   => $user['nom'],
        'role'  => $user['role'],
    ]]);
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}
