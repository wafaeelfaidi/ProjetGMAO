# Testing Guide: Automatic Document Processing & Structured Storage

## 📌 Overview
Documents uploaded are now automatically:
1. **Stored** in IndexedDB (local client storage)
2. **Classified** as Equipment, Maintenance, or Parts based on content
3. **Parsed** to extract structured fields (Code_Equip, Nom_Equipement, etc.)
4. **Inserted** into the appropriate table (equipment, maintenance, parts) in IndexedDB

No Supabase connection required — all data stays local.

---

## 🚀 Quick Start

### 1. Upload a Document
1. Navigate to **Home → Data Upload → Upload Tab**
2. Select or drag a document (PDF, DOCX, TXT, etc.)
3. Click **Upload**
4. **The document is automatically processed** (if Cohere API key is set)

### 2. Check Results in Console
Open DevTools (F12) → Console and run:

```javascript
// Check structured records (Equipment, Maintenance, Parts)
await window.__GMAO_DEBUG__.records("YOUR_USER_ID")

// Check raw documents
await window.__GMAO_DEBUG__.documents("YOUR_USER_ID")

// Check parsed content of a specific document
await window.__GMAO_DEBUG__.content("YOUR_USER_ID", "DOCUMENT_ID")
```

Replace `YOUR_USER_ID` with your actual user ID (visible in auth logs or profile).

---

## 📋 Expected Data Structure

### Equipment Table Fields
```
Code_Equip, Nom_Equipement, Type, Site, Marque, Modele, 
Num_Serie, Annee_Service, Statut
```

### Maintenance Table Fields
```
Code_Maintenance, Code_Equip, Date_Intervention, Type_Maintenance, 
Duree_Heures, Technicien, Piece_Remplacee, Cout, Commentaire
```

### Parts Table Fields
```
Code_Piece, Nom_Piece, Reference, Quantite_Stock, 
Fournisseur, Prix_Unitaire, Delai_Livraison_Jours, Date_Mise_A_Jour
```

---

## 🔍 Debugging Steps

### Step 1: Check if document was uploaded
```javascript
await window.__GMAO_DEBUG__.documents("USER_ID")
```
Look for your uploaded file in the list. Check:
- `processed: true` → processing completed
- `hasText: true` → text was extracted
- `hasFileData: true` → raw file stored

### Step 2: Check if classification worked
```javascript
// Open DevTools → Application → IndexedDB → gmao_client_db
// Look at the "documents" store for your file
// Check if textContent contains keywords (équipement, panne, pièce, etc.)
```

### Step 3: Check if parsing extracted fields
```javascript
await window.__GMAO_DEBUG__.records("USER_ID")
```
Look for records in Equipment / Maintenance / Parts tables:
- If empty → parsing failed (check text content in Step 2)
- If populated → check which fields have values vs null

### Step 4: Manual re-parsing (if needed)
If fields are still null, check the raw document text:
```javascript
const docId = "YOUR_DOCUMENT_ID"; // get from documents list
await window.__GMAO_DEBUG__.content("USER_ID", docId)
```
Copy the text sample and verify it contains your expected labels (Code_Equip, Nom_Equipement, etc.).

---

## 🛠️ Troubleshooting

### "All fields are null"
**Possible causes:**
1. **Text not extracted** → Check hasText: true in documents
2. **Wrong format** → Document may be image-based PDF or encrypted
3. **Parser doesn't recognize labels** → Labels may have different names or typos

**Fix:**
- Check the raw text content (use Step 4 above)
- Verify your document contains the expected field names (case-insensitive, accents ignored)
- If names differ, the parser can be extended with custom patterns

### "Document uploaded but not processed"
**Cause:** Usually missing Cohere API key

**Fix:**
1. Add your Cohere API key in the Upload tab (ApiKeyManager)
2. Manually click the "Process" button in Documents tab
3. Or re-upload the document after setting the key

### "Wrong classification (equipment vs maintenance)"
**Cause:** Parser keywords in document match wrong type

**Fix:**
Check `classifyTextClient()` in `processor.ts`:
- Equipment keywords: équipement, machine, matériel, code_equip
- Maintenance keywords: panne, maintenance, intervention, code_maintenance
- Parts keywords: pièce, référence, stock, code_piece

If your document uses different terminology, update the keywords.

---

## 📊 Performance Notes
- Documents are processed **client-side only** (no server upload unless explicitly configured)
- Large PDFs (100+ MB) may take time for text extraction
- Parsing happens automatically, chunking & embedding depends on Cohere API key
- All data remains in browser IndexedDB until cleared

---

## 🎯 Test Checklist
- [ ] Upload a document (Equipment type)
- [ ] Verify auto-processing message shows
- [ ] Check IndexedDB records with console debug
- [ ] Confirm fields populate (not all null)
- [ ] Upload a Maintenance document
- [ ] Upload a Parts document
- [ ] Verify all three types appear in respective tables
- [ ] Test document deletion
- [ ] Clear IndexedDB and start fresh
