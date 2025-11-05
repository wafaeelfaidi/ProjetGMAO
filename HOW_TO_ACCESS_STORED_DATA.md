# 🔍 Guide Pratique : Accéder aux Données Stockées

## 📍 Localisation des Données

Toutes les données traitées sont dans **IndexedDB** (navigateur), jamais dans une "vraie" base de données cloud sauf configuration explicite.

```
Navigateur → IndexedDB → gmao_client_db
    ├─ documents (fichiers uploadés + texte extrait)
    ├─ equipment (équipements parsés)
    ├─ maintenance (interventions parsées)
    ├─ parts (pièces/PDR parsées)
    ├─ embeddings (chunks + vecteurs Cohere)
    └─ chat_history (historique chatbot)
```

---

## 1️⃣ Accès via DevTools (GUI)

### Chrome / Edge
1. **Ouvre DevTools** : `F12` ou `Ctrl + Maj + I`
2. Onglet **Application** (ou Storage dans Firefox)
3. Panneau gauche → **IndexedDB**
4. **gmao_client_db** (double-clic pour voir stores)
5. Clique sur un store (ex: `equipment`)
6. Affiche tous les enregistrements

### Firefox
1. **Ouvre DevTools** : `F12`
2. Onglet **Storage**
3. Gauche → **IndexedDB** → **https://localhost:3000** (ou domaine)
4. **gmao_client_db** → expande
5. Clique sur un store

### Safari
1. **Ouvre Web Inspector** : `Cmd + Option + I`
2. Onglet **Storage**
3. IndexedDB → gmao_client_db

---

## 2️⃣ Accès via Console JavaScript

### ✅ Méthode recommandée (utilise les utilitaires debug)

```javascript
// Dans la console (F12 → Console)

// Voir TOUS les documents de l'utilisateur
await window.__GMAO_DEBUG__.documents("USER_ID")

// Voir TOUS les enregistrements structurés
await window.__GMAO_DEBUG__.records("USER_ID")

// Voir le contenu texte d'un document spécifique
await window.__GMAO_DEBUG__.content("USER_ID", "DOCUMENT_ID")
```

**Exemple résultat** :
```javascript
// documents
[
  {
    id: "abc-123",
    fileName: "equipment.pdf",
    textContent: "Code_Equip: EQ001...",
    processed: true,
    userId: "user-456"
  }
]

// records
{
  Equipment: 5,    // 5 enregistrements
  Maintenance: 2,
  Parts: 8
}
```

---

### 📝 Accès direct (sans utilitaires)

Si tu veux accéder directement à IndexedDB :

```javascript
// Ouvrir la base
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("gmao_client_db");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Lire tous les enregistrements d'un store
async function readStore(storeName, userId = null) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    
    if (userId) {
      // Utilise l'index userId
      const index = store.index("userId");
      const req = index.getAll(userId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } else {
      // Tous les enregistrements
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }
  });
}

// Utilisation
(async () => {
  const equipment = await readStore("equipment", "user-123");
  console.log("Equipment records:", equipment);
})();
```

---

## 3️⃣ Lire depuis le Code TypeScript

### Dans un composant React

```typescript
// app/home/pdr/page.tsx
"use client";

import { useEffect, useState } from "react";
import { ClientStorage } from "~/lib/client-storage/indexed-db";
import type { EquipmentRecord } from "~/lib/client-storage/indexed-db";

export default function PDRPage() {
  const [equipment, setEquipment] = useState<EquipmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const storage = new ClientStorage();
      
      // Lire tous les équipements de l'utilisateur
      const userId = "user-123"; // À récupérer de la session
      const records = await storage.getEquipment(userId);
      
      setEquipment(records);
      setLoading(false);
    };

    loadData();
  }, []);

  return (
    <div>
      <h1>Équipements</h1>
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Type</th>
              <th>Site</th>
              <th>Marque</th>
            </tr>
          </thead>
          <tbody>
            {equipment.map((eq) => (
              <tr key={eq.id}>
                <td>{eq.Code_Equip}</td>
                <td>{eq.Nom_Equipement}</td>
                <td>{eq.Type}</td>
                <td>{eq.Site}</td>
                <td>{eq.Marque}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

### Lire documents (avec texte)

```typescript
const storage = new ClientStorage();
const docs = await storage.getUserDocuments(userId);

// Afficher texte extrait du premier document
if (docs.length > 0) {
  console.log("Texte du document:", docs[0].textContent.slice(0, 500));
}
```

### Lire embeddings (pour chatbot)

```typescript
const storage = new ClientStorage();
const embeddings = await storage.getDocumentEmbeddings("doc-uuid");

// Utiliser pour recherche sémantique
console.log(`${embeddings.length} chunks avec embeddings`);
embeddings.forEach((emb, idx) => {
  console.log(`Chunk ${idx}: ${emb.text.slice(0, 50)}...`);
});
```

---

## 4️⃣ Scénarios Courants

### ✅ "Je veux voir les équipements uploadés"

**Console** :
```javascript
const storage = new (await import("~/lib/client-storage/indexed-db")).ClientStorage();
const eq = await storage.getEquipment("USER_ID");
console.table(eq.map(e => ({
  code: e.Code_Equip,
  nom: e.Nom_Equipement,
  type: e.Type,
  site: e.Site
})));
```

**Ou GUI** :
1. DevTools → Application
2. IndexedDB → gmao_client_db → equipment
3. Voir tous les enregistrements

---

### ✅ "Je veux voir la liste des documents"

**Console** :
```javascript
await window.__GMAO_DEBUG__.documents("USER_ID")
```

**Résultat** :
```
Documents: (2) [
  { id: 'doc-1', fileName: 'equip.pdf', processed: true },
  { id: 'doc-2', fileName: 'maintenance.docx', processed: false }
]
```

---

### ✅ "Je veux voir le texte extrait d'un PDF"

**Console** :
```javascript
const docId = "doc-1"; // ID du document
await window.__GMAO_DEBUG__.content("USER_ID", docId)
```

**Affiche** :
- Métadonnées du document
- Premiers 1500 caractères du texte extrait
- Avertissement si extraction échouée

---

### ✅ "Je veux exporter tout en JSON"

```javascript
const storage = new (await import("~/lib/client-storage/indexed-db")).ClientStorage();

const data = {
  documents: await storage.getDocuments(),
  equipment: await storage.getEquipment("USER_ID"),
  maintenance: await storage.getMaintenanceRecords("USER_ID"),
  parts: await storage.getParts("USER_ID"),
  embeddings: await storage.getEmbeddings()
};

// Télécharger fichier JSON
const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'backup.json';
a.click();
```

---

### ✅ "Je veux effacer toutes les données"

⚠️ **Attention : Irréversible !**

```javascript
const storage = new (await import("~/lib/client-storage/indexed-db")).ClientStorage();
const { clearStore, STORES } = await import("~/lib/client-storage/indexed-db");

// Effacer un store
await clearStore(STORES.EQUIPMENT);

// Ou tout effacer
for (const store of Object.values(STORES)) {
  await clearStore(store);
}

console.log("✓ Données effacées");
```

**Ou via GUI** :
1. DevTools → Application → IndexedDB
2. Clique droit → Delete object store
3. Recharge la page (oblig pour recréer)

---

### ✅ "Où sont les embeddings (pour chatbot)?"

```javascript
const storage = new (await import("~/lib/client-storage/indexed-db")).ClientStorage();
const embeddings = await storage.getEmbeddings();

console.log(`Total embeddings: ${embeddings.length}`);
console.log(`Documents avec embeddings: ${new Set(embeddings.map(e => e.documentId)).size}`);

// Voir un embedding
if (embeddings.length > 0) {
  console.log("Premier embedding:", {
    documentId: embeddings[0].documentId,
    chunkIndex: embeddings[0].chunkIndex,
    textSample: embeddings[0].text.slice(0, 50),
    vectorLength: embeddings[0].embedding.length,
    vectorSample: embeddings[0].embedding.slice(0, 5)
  });
}
```

---

## 5️⃣ Différence : Local vs Supabase

| Aspect | IndexedDB (Local) | Supabase (Cloud) |
|--------|------|--------|
| **Stockage** | Navigateur client | Serveur cloud |
| **Accès** | LocalStorage, DevTools | API REST, CLI |
| **Sync** | Aucun (manuel si voulu) | Temps réel |
| **Multi-device** | Non | Oui |
| **Privé** | ✅ Oui | ❌ Données sur serveur |
| **Sauvegarde** | Locale seulement | Sauvegarde cloud auto |
| **Taille limite** | ~50 MB | Très grand |
| **Coût** | Zéro | Freemium + payant |

**Actuellement** : IndexedDB local uniquement (choix privacy-first).

**Si tu veux Supabase** : À synchroniser manuellement ou ajouter auto-sync.

---

## 6️⃣ Debugging Avancé

### Voir les index d'un store

```javascript
const db = await new Promise((resolve, reject) => {
  const req = indexedDB.open("gmao_client_db");
  req.onsuccess = () => resolve(req.result);
});

const tx = db.transaction("equipment", "readonly");
const store = tx.objectStore("equipment");

console.log("Object Store: equipment");
console.log("Key path:", store.keyPath);
console.log("Indexes:", Array.from(store.indexNames));
```

**Résultat** :
```
Object Store: equipment
Key path: id
Indexes: ["userId"]
```

### Compter enregistrements par store

```javascript
async function countAll() {
  const stores = ['documents', 'equipment', 'maintenance', 'parts', 'embeddings', 'chat_history'];
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open("gmao_client_db");
    req.onsuccess = () => resolve(req.result);
  });

  const counts = {};
  for (const store of stores) {
    const tx = db.transaction(store, "readonly");
    const count = await new Promise((resolve, reject) => {
      const req = tx.objectStore(store).count();
      req.onsuccess = () => resolve(req.result);
    });
    counts[store] = count;
  }

  console.table(counts);
  return counts;
}

await countAll();
```

---

## 7️⃣ Checklist : Vérifier que tout fonctionne

- [ ] Uploadé un document → vérifie `documents` store
- [ ] Texte extrait ? → Vérifie `textContent` rempli
- [ ] Classification OK ? → Vérifiez `equipment`/`maintenance`/`parts`
- [ ] Champs parsés ? → Vérifie `Code_Equip`, `Nom_Equipement`, etc.
- [ ] Embeddings créés ? → Vérifiez `embeddings` store (si Cohere key présente)
- [ ] Page PDR affiche data ? → Test requête storage dans composant
- [ ] Chatbot fonctionne ? → Vérifiez recherche embeddings

---

## 📞 Résumé des Commandes Utiles

```javascript
// 1. VOIR LES DONNÉES
await window.__GMAO_DEBUG__.documents("USER_ID")
await window.__GMAO_DEBUG__.records("USER_ID")

// 2. COMPTER
const eq = await new (await import("~/lib/client-storage/indexed-db")).ClientStorage().getEquipment("USER_ID");
console.log(`${eq.length} équipements`);

// 3. RECHERCHER
const eq = await new (await import("~/lib/client-storage/indexed-db")).ClientStorage().getEquipment("USER_ID");
eq.filter(e => e.Code_Equip?.includes("EQ001")).forEach(e => console.log(e));

// 4. EXPORTER JSON
const data = {
  eq: await new (await import("~/lib/client-storage/indexed-db")).ClientStorage().getEquipment("USER_ID")
};
copy(JSON.stringify(data, null, 2)); // Copie dans clipboard
```

C'est tout ! 🎯 Les données sont locales, sécurisées et accessibles. 🔒
