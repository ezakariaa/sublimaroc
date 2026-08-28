<?php
require_once __DIR__ . '/config/db.php';

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

$db->exec("CREATE TABLE IF NOT EXISTS articles (
    id VARCHAR(100) NOT NULL PRIMARY KEY,
    reference_article VARCHAR(100),
    nom VARCHAR(255),
    categorie_article VARCHAR(100),
    image TEXT,
    petite_description TEXT,
    description TEXT,
    prix_unitaire DECIMAL(10,2) DEFAULT 0,
    quantite INT DEFAULT 0,
    prix_a_payer DECIMAL(10,2) DEFAULT 0,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_modification DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

function decodeArticle(array $row): array {
    $row['referenceArticle']  = $row['reference_article'] ?? '';
    $row['categorieArticle']  = $row['categorie_article'] ?? '';
    $row['petiteDescription'] = $row['petite_description'] ?? '';
    $row['prixUnitaire']      = (float)($row['prix_unitaire'] ?? 0);
    $row['prixAPayer']        = (float)($row['prix_a_payer'] ?? 0);
    $row['dateCreation']      = $row['date_creation'] ?? '';
    $row['dateModification']  = $row['date_modification'] ?? '';
    unset($row['reference_article'], $row['categorie_article'], $row['petite_description'],
          $row['prix_unitaire'], $row['prix_a_payer'], $row['date_creation'], $row['date_modification']);
    return $row;
}

switch ($method) {

    case 'GET':
        if ($id) {
            $stmt = $db->prepare('SELECT * FROM articles WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if ($row) {
                echo json_encode(['success' => true, 'data' => decodeArticle($row)]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Article non trouvé']);
            }
        } else {
            $stmt = $db->query('SELECT * FROM articles ORDER BY date_creation DESC');
            $rows = $stmt->fetchAll();
            echo json_encode(['success' => true, 'data' => array_map('decodeArticle', $rows)]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || empty($data['nom'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Nom requis']);
            break;
        }
        $newId = $data['id'] ?? ('ART-' . uniqid());
        $stmt = $db->prepare('
            INSERT INTO articles
            (id, reference_article, nom, categorie_article, image, petite_description, description, prix_unitaire, quantite, prix_a_payer)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        ');
        $stmt->execute([
            $newId,
            $data['referenceArticle'] ?? $newId,
            $data['nom'],
            $data['categorieArticle'] ?? '',
            $data['image'] ?? '',
            $data['petiteDescription'] ?? '',
            $data['description'] ?? '',
            $data['prixUnitaire'] ?? 0,
            $data['quantite'] ?? 0,
            $data['prixAPayer'] ?? 0,
        ]);
        echo json_encode(['success' => true, 'data' => ['id' => $newId], 'message' => 'Article créé']);
        break;

    case 'PUT':
        if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'ID requis']); break; }
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $db->prepare('
            UPDATE articles SET
            reference_article=?, nom=?, categorie_article=?, image=?,
            petite_description=?, description=?, prix_unitaire=?, quantite=?, prix_a_payer=?
            WHERE id=?
        ');
        $stmt->execute([
            $data['referenceArticle'] ?? '',
            $data['nom'] ?? '',
            $data['categorieArticle'] ?? '',
            $data['image'] ?? '',
            $data['petiteDescription'] ?? '',
            $data['description'] ?? '',
            $data['prixUnitaire'] ?? 0,
            $data['quantite'] ?? 0,
            $data['prixAPayer'] ?? 0,
            $id,
        ]);
        echo json_encode(['success' => true, 'message' => 'Article mis à jour']);
        break;

    case 'DELETE':
        if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'ID requis']); break; }
        $stmt = $db->prepare('DELETE FROM articles WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Article supprimé']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}
