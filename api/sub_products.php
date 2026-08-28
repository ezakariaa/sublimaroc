<?php
require_once __DIR__ . '/config/db.php';

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;
$product_id = $_GET['product_id'] ?? null;

function decodeSubProduct(array $row): array {
    $jsonFields = ['images','type','anse','dimensions','couleurs','materiau','capacite','poids','qualite','manches','col','custom_fields'];
    foreach ($jsonFields as $f) {
        if (isset($row[$f])) {
            $decoded = json_decode($row[$f], true);
            if ($f === 'custom_fields' && is_array($decoded)) {
                foreach ($decoded as $k => $v) { $row[$k] = $v; }
                unset($row['custom_fields']);
            } else {
                $row[$f] = $decoded ?? [];
            }
        }
    }
    $row['productId']         = $row['product_id'];
    $row['dateCreation']      = $row['date_creation'] ?? '';
    $row['dateModification']  = $row['date_modification'] ?? '';
    unset($row['product_id'], $row['date_creation'], $row['date_modification']);
    return $row;
}

switch ($method) {

    case 'GET':
        if ($id) {
            $stmt = $db->prepare('SELECT * FROM sub_products WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if ($row) {
                echo json_encode(['success' => true, 'data' => decodeSubProduct($row)]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Sous-produit non trouvé']);
            }
        } elseif ($product_id) {
            $stmt = $db->prepare('SELECT * FROM sub_products WHERE product_id = ? ORDER BY date_creation DESC');
            $stmt->execute([$product_id]);
            $rows = $stmt->fetchAll();
            echo json_encode(['success' => true, 'data' => array_map('decodeSubProduct', $rows)]);
        } else {
            $stmt = $db->query('SELECT * FROM sub_products ORDER BY date_creation DESC');
            echo json_encode(['success' => true, 'data' => array_map('decodeSubProduct', $stmt->fetchAll())]);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || empty($data['nom'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Nom requis']);
            break;
        }
        $standardFields = ['id','nom','description','prix','image','images','stock','product_id','productId',
            'type','anse','dimensions','couleurs','materiau','capacite','poids','qualite','manches','col'];
        $customFields = [];
        foreach ($data as $k => $v) {
            if (!in_array($k, $standardFields) && is_array($v)) $customFields[$k] = $v;
        }
        $stmt = $db->prepare('
            INSERT INTO sub_products
            (id, product_id, nom, description, prix, image, images, stock,
             type, anse, dimensions, couleurs, materiau, capacite, poids, qualite, manches, col, custom_fields)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ');
        $newId = $data['id'] ?? ('SUB-' . uniqid());
        $stmt->execute([
            $newId,
            $data['productId'] ?? $data['product_id'] ?? '',
            $data['nom'],
            $data['description'] ?? '',
            $data['prix']        ?? 0,
            $data['image']       ?? '',
            json_encode($data['images']     ?? []),
            $data['stock']       ?? 0,
            json_encode($data['type']       ?? []),
            json_encode($data['anse']       ?? []),
            json_encode($data['dimensions'] ?? []),
            json_encode($data['couleurs']   ?? []),
            json_encode($data['materiau']   ?? []),
            json_encode($data['capacite']   ?? []),
            json_encode($data['poids']      ?? []),
            json_encode($data['qualite']    ?? []),
            json_encode($data['manches']    ?? []),
            json_encode($data['col']        ?? []),
            json_encode($customFields),
        ]);
        echo json_encode(['success' => true, 'data' => ['id' => $newId], 'message' => 'Sous-produit créé']);
        break;

    case 'PUT':
        if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'ID requis']); break; }
        $data = json_decode(file_get_contents('php://input'), true);
        $standardFields = ['id','nom','description','prix','image','images','stock','product_id','productId',
            'type','anse','dimensions','couleurs','materiau','capacite','poids','qualite','manches','col'];
        $customFields = [];
        foreach ($data as $k => $v) {
            if (!in_array($k, $standardFields) && is_array($v)) $customFields[$k] = $v;
        }
        $stmt = $db->prepare('
            UPDATE sub_products SET
            nom=?, description=?, prix=?, image=?, images=?, stock=?,
            type=?, anse=?, dimensions=?, couleurs=?, materiau=?, capacite=?,
            poids=?, qualite=?, manches=?, col=?, custom_fields=?
            WHERE id=?
        ');
        $stmt->execute([
            $data['nom'] ?? '', $data['description'] ?? '', $data['prix'] ?? 0,
            $data['image'] ?? '', json_encode($data['images'] ?? []), $data['stock'] ?? 0,
            json_encode($data['type'] ?? []), json_encode($data['anse'] ?? []),
            json_encode($data['dimensions'] ?? []), json_encode($data['couleurs'] ?? []),
            json_encode($data['materiau'] ?? []), json_encode($data['capacite'] ?? []),
            json_encode($data['poids'] ?? []), json_encode($data['qualite'] ?? []),
            json_encode($data['manches'] ?? []), json_encode($data['col'] ?? []),
            json_encode($customFields), $id,
        ]);
        echo json_encode(['success' => true, 'message' => 'Sous-produit mis à jour']);
        break;

    case 'DELETE':
        if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'ID requis']); break; }
        $stmt = $db->prepare('DELETE FROM sub_products WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Sous-produit supprimé']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}
