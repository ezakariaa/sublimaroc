<?php
require_once __DIR__ . '/config/db.php';

$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

// Décoder les champs JSON d'un produit
function decodeProduct(array $row): array {
    $jsonFields = ['images','type','anse','dimensions','couleurs','materiau','capacite','poids','qualite','manches','col','custom_fields'];
    foreach ($jsonFields as $f) {
        if (isset($row[$f])) {
            $decoded = json_decode($row[$f], true);
            if ($decoded !== null) {
                if ($f === 'custom_fields' && is_array($decoded)) {
                    // Fusionner les custom_fields directement dans le produit
                    foreach ($decoded as $k => $v) {
                        $row[$k] = $v;
                    }
                    unset($row['custom_fields']);
                } else {
                    $row[$f] = $decoded;
                }
            } else {
                $row[$f] = ($f === 'custom_fields') ? [] : [];
            }
        }
    }
    // Renommer les colonnes pour correspondre au frontend
    $row['fournisseur'] = [
        'nom'   => $row['fournisseur_nom'] ?? '',
        'ville' => $row['fournisseur_ville'] ?? '',
    ];
    unset($row['fournisseur_nom'], $row['fournisseur_ville']);
    $row['dateCreation']      = $row['date_creation'] ?? '';
    $row['dateModification']  = $row['date_modification'] ?? '';
    unset($row['date_creation'], $row['date_modification']);
    return $row;
}

switch ($method) {

    // GET /api/products.php           → tous les produits
    // GET /api/products.php?id=xxx    → un produit
    case 'GET':
        if ($id) {
            $stmt = $db->prepare('SELECT * FROM products WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if ($row) {
                echo json_encode(['success' => true, 'data' => decodeProduct($row)]);
            } else {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Produit non trouvé']);
            }
        } else {
            $stmt = $db->query('SELECT * FROM products ORDER BY date_creation DESC');
            $rows = $stmt->fetchAll();
            $products = array_map('decodeProduct', $rows);
            echo json_encode(['success' => true, 'data' => $products]);
        }
        break;

    // POST /api/products.php → créer
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || empty($data['nom'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Nom requis']);
            break;
        }

        $standardFields = ['id','nom','description','prix','image','images','categorie','stock',
            'fournisseur','type','anse','dimensions','couleurs','materiau','capacite',
            'poids','qualite','manches','col','dateCreation','dateModification'];

        $customFields = [];
        foreach ($data as $k => $v) {
            if (!in_array($k, $standardFields) && is_array($v)) {
                $customFields[$k] = $v;
            }
        }

        $fournisseur = $data['fournisseur'] ?? [];
        $stmt = $db->prepare('
            INSERT INTO products
            (id, nom, description, prix, image, images, categorie, stock,
             fournisseur_nom, fournisseur_ville,
             type, anse, dimensions, couleurs, materiau, capacite, poids, qualite, manches, col,
             custom_fields)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON DUPLICATE KEY UPDATE
            nom=VALUES(nom), description=VALUES(description), prix=VALUES(prix),
            image=VALUES(image), images=VALUES(images), categorie=VALUES(categorie),
            stock=VALUES(stock), fournisseur_nom=VALUES(fournisseur_nom),
            fournisseur_ville=VALUES(fournisseur_ville), type=VALUES(type),
            anse=VALUES(anse), dimensions=VALUES(dimensions), couleurs=VALUES(couleurs),
            materiau=VALUES(materiau), capacite=VALUES(capacite), poids=VALUES(poids),
            qualite=VALUES(qualite), manches=VALUES(manches), col=VALUES(col),
            custom_fields=VALUES(custom_fields), date_modification=CURRENT_TIMESTAMP
        ');
        $stmt->execute([
            $data['id']          ?? ('GRA-' . strtoupper(substr(preg_replace('/[^a-z]/','',strtolower($data['nom'])),0,3))),
            $data['nom'],
            $data['description'] ?? '',
            $data['prix']        ?? 0,
            $data['image']       ?? '',
            json_encode($data['images']     ?? []),
            $data['categorie']   ?? '',
            $data['stock']       ?? 0,
            $fournisseur['nom']  ?? '',
            $fournisseur['ville']?? '',
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

        echo json_encode(['success' => true, 'data' => ['id' => $data['id'] ?? $db->lastInsertId()], 'message' => 'Produit créé']);
        break;

    // PUT /api/products.php?id=xxx → mettre à jour
    case 'PUT':
        if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'ID requis']); break; }
        $data = json_decode(file_get_contents('php://input'), true);

        $standardFields = ['id','nom','description','prix','image','images','categorie','stock',
            'fournisseur','type','anse','dimensions','couleurs','materiau','capacite',
            'poids','qualite','manches','col','dateCreation','dateModification'];

        $customFields = [];
        foreach ($data as $k => $v) {
            if (!in_array($k, $standardFields) && is_array($v)) {
                $customFields[$k] = $v;
            }
        }

        $fournisseur = $data['fournisseur'] ?? [];
        $stmt = $db->prepare('
            UPDATE products SET
            nom=?, description=?, prix=?, image=?, images=?, categorie=?, stock=?,
            fournisseur_nom=?, fournisseur_ville=?,
            type=?, anse=?, dimensions=?, couleurs=?, materiau=?, capacite=?,
            poids=?, qualite=?, manches=?, col=?, custom_fields=?
            WHERE id=?
        ');
        $stmt->execute([
            $data['nom']         ?? '',
            $data['description'] ?? '',
            $data['prix']        ?? 0,
            $data['image']       ?? '',
            json_encode($data['images']     ?? []),
            $data['categorie']   ?? '',
            $data['stock']       ?? 0,
            $fournisseur['nom']  ?? '',
            $fournisseur['ville']?? '',
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
            $id,
        ]);
        echo json_encode(['success' => true, 'message' => 'Produit mis à jour']);
        break;

    // DELETE /api/products.php?id=xxx
    case 'DELETE':
        if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'ID requis']); break; }
        $stmt = $db->prepare('DELETE FROM products WHERE id = ?');
        $stmt->execute([$id]);
        echo json_encode(['success' => true, 'message' => 'Produit supprimé']);
        break;

    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
}
