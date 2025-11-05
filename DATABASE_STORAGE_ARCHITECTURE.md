# 📊 Architecture de Stockage des Données Traitées

## 🎯 Vue d'ensemble

Tous les données traitées sont stockées **côté client dans IndexedDB** (aucun envoi à Supabase sauf configuration explicite).

```
Document (PDF/DOCX/TXT)
    ↓
Uploaded → IndexedDB `documents` store
    ↓
Auto-Processing (si Cohere key présente)
    ├→ Text Extraction
    ├→ Classification (equipment/maintenance/parts)
    ├→ Field Parsing
    └→ Structured Storage (equipment/maintenance/parts stores)
```

---

## 📦 Structure IndexedDB

### Base de données
- **Nom** : `gmao_client_db`
- **Version** : 2
- **Localisation** : Navigateur client (persistent storage)

### Object Stores (Tables)

#### 1. `documents` — Documents bruts uploadés
```typescript
{
  id: string;                    // UUID unique
  fileName: string;              // Nom du fichier
  mimeType: string;              // Type MIME (application/pdf, etc.)
  size: number;                  // Taille en bytes
  uploadedAt: number;            // Timestamp upload
  textContent: string;           // Texte extrait (PDF/DOCX → texte)
  userId: string;                // ID utilisateur propriétaire
  processed: boolean;            // true = embeddings créés
  fileData?: ArrayBuffer;        // Données binaires originales (optionnel)
}
```

**Index** : `userId` (pour filtrer par utilisateur)

**Flux** :
1. Upload → créé avec `textContent: ""`, `processed: false`
2. Auto-processing → extraction texte, `textContent` rempli
3. Si Cohere key → embeddings créés, `processed: true`

---

#### 2. `embeddings` — Chunks + vecteurs (pour RAG/chatbot)
```typescript
{
  id: string;                    // UUID unique
  documentId: string;            // Référence au document source
  chunkIndex: number;            // Numéro du chunk (0, 1, 2...)
  text: string;                  // Contenu du chunk (~1000 chars)
  embedding: number[];           // Vecteur d'embedding (float array)
  userId: string;                // ID utilisateur
  createdAt: number;             // Timestamp création
}
```

**Index** : `documentId`, `userId`

**Flux** :
1. Document texte chunkisé (chevauchement 200 chars)
2. Chaque chunk envoyé à Cohere API pour embedding
3. Résultats stockés dans embeddings
4. Utilisé pour RAG/chat (recherche sémantique)

---

#### 3. `equipment` — **Nouveaux** : Équipements structurés
```typescript
{
  id: string;                    // UUID unique
  userId: string;                // ID utilisateur
  source_document_id: string;    // Référence au document parsé
  
  // Colonnes métier
  Code_Equip?: string | null;
  Nom_Equipement?: string | null;
  Type?: string | null;
  Site?: string | null;
  Marque?: string | null;
  Modele?: string | null;
  Num_Serie?: string | null;
  Annee_Service?: string | null;
  Statut?: string | null;
}
```

**Index** : `userId`

**Comment rempli** :
1. Document classé comme "equipment" (mots-clés détectés)
2. Texte parsé pour extraire champs (regex + fallback)
3. Enregistrement créé et inséré dans ce store
4. Disponible pour affichage dans page "Équipements"

---

#### 4. `maintenance` — **Nouveaux** : Interventions de maintenance
```typescript
{
  id: string;
  userId: string;
  source_document_id: string;
  
  Code_Maintenance?: string | null;
  Code_Equip?: string | null;
  Date_Intervention?: string | null;
  Type_Maintenance?: string | null;
  Duree_Heures?: string | null;
  Technicien?: string | null;
  Piece_Remplacee?: string | null;
  Cout?: string | null;
  Commentaire?: string | null;
}
```

**Index** : `userId`

**Pareil que equipment**, mais détection basée sur mots-clés "panne", "maintenance", etc.

---

#### 5. `parts` — **Nouveaux** : Pièces détachées / PDR (Plan De Remplacement)
```typescript
{
  id: string;
  userId: string;
  source_document_id: string;
  
  Code_Piece?: string | null;
  Nom_Piece?: string | null;
  Reference?: string | null;
  Quantite_Stock?: string | null;
  Fournisseur?: string | null;
  Prix_Unitaire?: string | null;
  Delai_Livraison_Jours?: string | null;
  Date_Mise_A_Jour?: string | null;
}
```

**Index** : `userId`

Détection basée sur mots-clés "pièce", "référence", "stock", "code_piece"

---

#### 6. `chat_history` — Historique chat (optionnel)
```typescript
{
  id: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  documentIds?: string[];        // Documents utilisés dans cette requête
}
```

**Index** : `userId`, `timestamp`

Utilisé pour RAG chatbot (lier questions ↔ documents)

---

## 🔄 Flux complet de traitement

### **Étape 1 : Upload**
```
User selects file
    ↓
uploadDocument(file, userId)
    ├→ Génère UUID pour document
    ├→ Crée ArrayBuffer du fichier
    ├→ Insère dans `documents` store
    │  {
    │    id: uuid1,
    │    fileName: "equip_list.pdf",
    │    fileData: ArrayBuffer,
    │    textContent: "",
    │    processed: false,
    │    userId: "user123"
    │  }
    └→ Retourne UploadResult
```

**Base de données state** :
- `documents` : 1 enregistrement (non traité)
- `equipment/maintenance/parts` : vide

---

### **Étape 2 : Auto-Processing (Extraction Texte)**
```
handleUpload() calls uploadDocuments()
    ↓
Auto calls processStoredDocument(documentId, userId)
    ├→ if (!textContent && fileData)
    │  Récréer File object de ArrayBuffer
    │  Appeler extractText(file)
    │    - Si PDF → pdfjs-dist extraction
    │    - Si DOCX → mammoth extraction
    │    - Si TXT → file.text()
    │  textContent = "Code_Equip: EQ001..."
    ├→ Update document: {textContent: "...", processed: false}
    └→ Continue
```

**Base de données state** :
- `documents` : textContent rempli, `processed: false` (embeddings pas encore créés)

---

### **Étape 3 : Classification & Parsing (Nouveau !)**
```
textContent = "Code_Equip: EQ001\nNom: Compresseur..."

Classification:
  classifyTextClient(textContent, fileName)
    ├→ Cherche mots-clés ["equip", "équipement", "machine"]
    └→ Retourne "equipment"

Parsing:
  parseFieldsClient(textContent, equipment_cols)
    ├→ Cherche "Code_Equip:" → trouve "EQ001"
    ├→ Cherche "Nom_Equipement:" → trouve "Compresseur"
    ├→ Cherche "Type:" → trouve "Industriel"
    └→ Retourne parsed object

Insertion IndexedDB:
  clientStorage.addEquipment({
    id: uuid2,
    userId: "user123",
    source_document_id: uuid1,
    Code_Equip: "EQ001",
    Nom_Equipement: "Compresseur",
    Type: "Industriel",
    ...
  })
```

**Base de données state** :
- `documents` : 1 enregistrement
- `equipment` : 1 enregistrement (nouvellement créé)

---

### **Étape 4 : Embeddings (si Cohere key)**
```
if (cohereClient)
  chunks = chunkText(textContent, 1000, 200)
  pour chaque batch de 96 chunks:
    embeddings = cohereClient.embed(batch)
    pour chaque embedding:
      storage.addEmbedding({
        id: uuidN,
        documentId: uuid1,
        chunkIndex: 0,
        text: "Code_Equip: EQ001...",
        embedding: [0.12, -0.34, ...],
        userId: "user123"
      })
```

**Base de données state** :
- `documents` : 1 (processed: true)
- `equipment` : 1
- `embeddings` : N (un par chunk)

---

## 📍 Localisation physique

### Windows/Chrome
```
C:\Users\[USERNAME]\AppData\Local\Google\Chrome\User Data\Default\IndexedDB
  └─ https_localhost_3000.indexeddb.leveldb
      └─ données IndexedDB persistantes
```

### Navigateur (DevTools)
```
F12 → Application → IndexedDB → gmao_client_db
  ├─ documents
  ├─ embeddings
  ├─ equipment
  ├─ maintenance
  ├─ parts
  └─ chat_history
```

---

## 🔐 Sécurité & Persistence

✅ **Avantages** :
- Données privées (jamais quitten le navigateur sauf upload Supabase explicite)
- Persistent (survive rechargement page)
- Rapide (accès local, pas réseau)
- Offline capable

⚠️ **Limitations** :
- Limité à ~50 MB par navigateur (généralement)
- Effacé si "Clear browsing data" dans Chrome
- Spécifique au navigateur (pas sync entre appareils)
- Pas sauvegarde automatique cloud

---

## 💾 Export & Sauvegarde

**Actuellement non implémenté, mais faisable** :
- Export JSON de tous les records
- Sauvegarde manuelle dans fichier
- Import dans un autre navigateur

Fonction utilitaire disponible :
```typescript
await exportAllDocuments(userId)  // → JSON string
```

---

## 📊 Exemple complet (vue utilisateur)

```
1️⃣  User upload "equip.pdf"
    → documents: [{id: "doc1", fileName: "equip.pdf", ...}]

2️⃣  Auto-extract texte
    → documents: [{id: "doc1", textContent: "Code_Equip: EQ001...", ...}]

3️⃣  Auto-classify & parse
    → equipment: [{id: "eq1", Code_Equip: "EQ001", ...}]

4️⃣  (Optional) Create embeddings
    → embeddings: [{id: "emb1", documentId: "doc1", embedding: [...]}, ...]

5️⃣  User views PDR page
    → Fetch equipment store for userId
    → Display table with extracted data
```

---

## 🎯 Cas d'usage

### **Pour RAG/Chatbot**
- Utilise : `embeddings` + `documents`
- Flux : Utilisateur pose question → search semantic dans embeddings → retrieve chunks → generate answer

### **Pour PDR/RPN/Équipement**
- Utilise : `equipment`, `maintenance`, `parts`
- Flux : User views page → Fetch records from store → Display table → Edit/Delete

### **Dual use**
- Même document contribue aux deux usages
- `documents` + `embeddings` = chatbot
- `equipment` / `maintenance` / `parts` = tables métier

---

## ✅ Validation

Pour vérifier ce qui est stocké :

```javascript
// DevTools Console
await window.__GMAO_DEBUG__.documents("USER_ID")
await window.__GMAO_DEBUG__.records("USER_ID")
```

Tu verras la liste complète de ce qui est stocké dans IndexedDB ! 🎯
