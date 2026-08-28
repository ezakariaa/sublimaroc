<?php
require_once __DIR__ . '/config/db.php';

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;
$type = $_GET['type'] ?? 'materiels'; // 'materiels' or 'articles'

$table = ($type === 'articles') ? 'achats_articles' : 'achats';

// Créer les tables si elles n'existent pas
$db->exec("CREATE TABLE IF NOT EXISTS achats (
    id VARCHAR(100) NOT NULL PRIMARY KEY,
    reference_achat VARCHAR(100),
    fournisseur JSON,
    materials JSON,
    date_achat DATETIME,
    date_commande DATETIME,
    date_livraison DATETIME,
    etat VARCHAR(50) DEFAULT 'En cours',
    total_achat DECIMAL(10,2) DEFAULT 0,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_modification DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$db->exec("CREATE TABLE IF NOT EXISTS achats_articles (
    id VARCHAR(100) NOT NULL PRIMARY KEY,
    reference_achat VARCHAR(100),
    fournisseur JSON,
    articles JSON,
    date_achat DATETIME,
    date_commande DATETIME,
    date_livraison DATETIME,
    etat VARCHAR(50) DEFAULT 'En cours',
    total_achat DECIMAL(10,2) DEFAULT 0,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_modification DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

function decodeAchat(array $row, string $type): array {
    $jsonFields = ['fournisseur'];
    if ($type === 'articles') {
        $jsonFields[] = 'articles';
    } else {
        $jsonFields[] = 'materials';
    }
    foreach ($jsonFields as $f) {
        if (isset($row[$f])) {
            $decoded = json_decode($row[$f], true);
            $row[$f] = $decoded ?? [];
        }
    }
    $row['referenceAchat']   = $row['reference_achat'] ?? '';
    $row['dateAchat']        = $row['date_achat'] ?? '';
    $row['dateCommande']     = $row['date_commande'] ?? '';
    $row['dateLivraison']    = $row['date_livraison'] ?? '';
    $row['totalAchat']       = (float)($row['total_achat'] ?? 0);
    $row['dateCreation']     = $row['date_creation'] ?? '';
    $row['dateModification'] = $row['date_modification'] ?? '';
    unset($row['reference_achat'], $row['date_achat'], $row['date_commande'],
          $row['date_livraison'], $row['total_achat'], $row['date_creation'], $row['date_modification']);
    return $row;
}

switch ($method) {

    case 'GET':
        if ($id) {
            $stmt = $db->prepare("SELECT * FROM {$table} WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if ($row) {
                echo json_encode(['success' => true, 'data' => decodeAchat($row, $type)]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Achat non trouvé']);
            }
        } else {
            $stmt = $db->query("SELECT * FROM {$table} ORDER BY date_creation DESC");
            $rows = $stmt->fetchAll();
            echo json_encode(['success' => true, 'data' => array_map(fn($r) => decodeAchat($r, $type), $rows)]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Données invalides']);
            break;
        }
        $newId = $data['id'] ?? ('ACH-' . uniqid());
        $itemsField = ($type === 'articles') ? 'articles' : 'materials';
        $stmt = $db->prepare("
            INSERT INTO {$table}
            (id, reference_achat, fournisseur, {$itemsField}, date_achat, date_commande, date_livraison, etat, total_achat)
            VALUES (?,?,?,?,?,?,?,?,?)
        ");
        $stmt->execute([
            $newId,
            $data['referenceAchat'] ?? '',
            json_encode($data['fournisseur'] ?? [], JSON_UNESCAPED_UNICODE),
            json_encode($data[$itemsField] ?? [], JSON_UNESCAPED_UNICODE),
            isset($data['dateAchat'])     ? date('Y-m-d H:i:s', strtotime($data['dateAchat']))     : date('Y-m-d H:i:s'),
            isset($data['dateCommande'])  ? date('Y-m-d H:i:s', strtotime($data['dateCommande']))  : date('Y-m-d H:i:s'),
            isset($data['dateLivraison']) ? date('Y-m-d H:i:s', strtotime($data['dateLivraison'])) : date('Y-m-d H:i:s'),
            $data['etat'] ?? 'En cours',
            $data['totalAchat'] ?? 0,
        ]);
        echo json_encode(['success' => true, 'data' => ['id' => $newId], 'message' => 'Achat créé']);
        break;

    case 'PUT':
        if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'ID requis']); break; }
        $data = json_decode(file_get_contents('php://input'), true);
        $itemsField = ($type === 'articles') ? 'articles' : 'materials';
        $stmt = $db->prepare("
            UPDATE {$table} SET
            reference_achat=?, fournisseur=?, {$itemsField}=?,
            date_achat=?, date_commande=?, date_livraison=?, etat=?, total_achat=?
            WHERE id=?
        ");
        $stmt->execute([
            $data['referenceAchat'] ?? '',
            json_encode($data['fournisseur'] ?? [], JSON_UNESCAPED_UNICODE),
            json_encode($data[$itemsField] ?? [], JSON_UNESCAPED_UNICODE),
            isset($data['dateAchat'])     ? date('Y-m-d H:i:s', strtotime($data['dateAchat']))     : date('Y-m-d H:i:s'),
            isset($data['dateCommande'])  ? date('Y-m-d H:i:s', strtotime($data['dateCommande']))  : date('Y-m-d H:i:s'),
            isset($data['dateLivraison']) ? date('Y-m-d H:i:s', strtotime($data['dateLivraison'])) : date('Y-m-d H:i:s'),
            $data['etat'] ?? 'En cours',
            $data['totalAchat'] ?? 0,
            $id,
        ]);
        echo json_encode(['success' => true, 'message' => 'Achat mis à jour']);
        break;

    case 'DELETE':
        if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'ID requis']); break; }
        $stmt = $db->prepare("DELETE FROM {$table} WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Achat supprimé']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}
