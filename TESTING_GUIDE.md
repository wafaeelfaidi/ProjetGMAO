# Quick Testing Guide - PDF/DOCX & Encrypted API Key

## 🧪 Test Scenarios

### Test 1: API Key Persistence
**Steps**:
1. Open browser and navigate to `/home/chatbot`
2. Click settings icon (gear)
3. Enter your Cohere API key
4. ✅ Check "Remember my API key (stored encrypted in browser)"
5. Click "Set API Key"
6. Wait for validation (should see green success message)
7. **Refresh the page** (F5)
8. Observe: Should see "Restoring API key..." briefly
9. Then see green "✓ Cohere API key is set and validated (Key will be remembered)"

**Expected**: No need to re-enter key after refresh

**Verify**:
- Open DevTools → Application → Local Storage
- Should see `gmao_cohere_key_encrypted` and `gmao_cohere_salt`
- Values should be base64 encoded strings (not plaintext)

### Test 2: API Key In-Memory Only
**Steps**:
1. Clear localStorage: `localStorage.clear()`
2. Refresh page
3. Enter API key
4. ❌ **Do NOT check** "Remember my API key"
5. Click "Set API Key"
6. **Refresh the page** (F5)

**Expected**: Need to re-enter key (no persistence)

**Verify**:
- Check localStorage - should be empty
- Key not persisted across refreshes

### Test 3: Upload PDF Document
**Steps**:
1. Navigate to `/dataUpload`
2. Ensure API key is set (check/enter if needed)
3. Download a sample PDF: https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf
4. Drag & drop PDF into upload area OR click "Select Files"
5. Observe real-time progress:
   - "Extracting text from document..."
   - "Splitting document into chunks..."
   - "Creating embeddings for X chunks..."
   - "Storing document and embeddings..."
   - "Document processing complete!"
6. Progress bar should fill to 100%
7. Green checkmark should appear

**Expected**: PDF text extracted and processed successfully

**Console Check**:
```javascript
// Open DevTools Console
const db = await indexedDB.open("gmao_client_db");
// Should show documents and embeddings stores
```

### Test 4: Upload DOCX Document
**Steps**:
1. Navigate to `/dataUpload`
2. Create a simple DOCX file or download sample
3. Upload the .docx file
4. Observe progress indicators
5. Wait for completion

**Expected**: DOCX text extracted and processed

### Test 5: Query PDF/DOCX Content
**Steps**:
1. After uploading PDF/DOCX (from Test 3 or 4)
2. Navigate to `/home/chatbot`
3. Ask a question about the document content
4. Examples:
   - "What is this document about?"
   - "Summarize the main points"
   - "What does section X say?"
5. Wait for AI response

**Expected**: 
- Response references document content
- Sources section shows "📄 Sources: 1 document(s)"
- Answer is contextually accurate

### Test 6: Multiple Documents
**Steps**:
1. Upload 2-3 different documents (mix of PDF, DOCX, TXT)
2. Wait for all to complete
3. Ask a question that could reference any document
4. Check sources in response

**Expected**: Agent searches all documents and provides best answer

### Test 7: Encryption Security
**Steps**:
1. Set API key with "Remember" checked
2. Open DevTools → Application → Local Storage
3. Copy the value of `gmao_cohere_key_encrypted`
4. Try to decode: `atob("paste-encrypted-value-here")`
5. Result should be gibberish (encrypted bytes)

**Expected**: Cannot read plaintext API key from localStorage

### Test 8: Cross-Browser Test
**Steps**:
1. Set API key with "Remember" in Chrome
2. Copy localStorage values
3. Open Firefox
4. Paste same localStorage values
5. Try to restore key

**Expected**: Should fail - encryption is device-specific

### Test 9: Large PDF Test
**Steps**:
1. Upload a large PDF (10+ pages)
2. Monitor browser memory (DevTools → Performance → Memory)
3. Watch processing progress
4. Verify completion

**Expected**: 
- No browser crash
- Steady progress
- All pages processed

### Test 10: Error Handling
**Steps**:
1. Try to upload corrupted PDF
2. Try to upload password-protected PDF
3. Try to upload without API key set

**Expected**: 
- Graceful error messages
- No crashes
- Clear user feedback

## 🔍 Debugging Tips

### Check IndexedDB Contents
```javascript
// In browser console
const request = indexedDB.open("gmao_client_db");
request.onsuccess = (e) => {
  const db = e.target.result;
  console.log("Stores:", [...db.objectStoreNames]);
  
  // Get all documents
  const tx = db.transaction("documents", "readonly");
  const store = tx.objectStore("documents");
  const getAll = store.getAll();
  getAll.onsuccess = () => console.log("Documents:", getAll.result);
};
```

### Check Encrypted Key
```javascript
// In browser console
console.log("Encrypted:", localStorage.getItem("gmao_cohere_key_encrypted"));
console.log("Salt:", localStorage.getItem("gmao_cohere_salt"));

// Try manual decrypt (should work only on same device)
import { loadApiKey } from "~/lib/cohere/secure-storage";
const key = await loadApiKey();
console.log("Decrypted:", key ? "SUCCESS" : "FAILED");
```

### Monitor Cohere API Calls
```javascript
// Open DevTools → Network tab
// Filter: "cohere"
// Should see:
// - POST /v1/embed (for document processing)
// - POST /v1/embed (for query embedding)
// - POST /v1/chat (for response generation)
```

### Check Agent Status
```javascript
// In chatbot page console
// After agent initialized
agent.getStats().then(console.log);
// Should show: messageCount, documentCount, embeddingCount
```

## ✅ Success Criteria

All tests should pass with:
- ✅ API key persists across refreshes (when "Remember" checked)
- ✅ PDF text extracted correctly
- ✅ DOCX text extracted correctly
- ✅ Embeddings created and stored
- ✅ Chatbot retrieves relevant context
- ✅ Encryption prevents plaintext reading
- ✅ Device fingerprint prevents cross-device use
- ✅ Error handling works gracefully
- ✅ No console errors or warnings
- ✅ Smooth user experience

## 🐛 Common Issues

### Issue: "Failed to extract text from PDF"
**Cause**: PDF.js worker not loading  
**Fix**: Check internet connection (worker loads from CDN)

### Issue: "Failed to decrypt API key"
**Cause**: Browser fingerprint changed  
**Fix**: Clear localStorage and re-enter key

### Issue: "Cohere API key not set"
**Cause**: Restore failed or key expired  
**Fix**: Re-enter API key manually

### Issue: Slow processing for large PDFs
**Cause**: Page-by-page extraction is CPU intensive  
**Expected**: Normal for large documents (10+ seconds for 50+ pages)

### Issue: DOCX formatting lost
**Cause**: mammoth.js extracts raw text only  
**Expected**: Tables, lists may lose structure (limitation)

## 📊 Performance Benchmarks

Expected processing times:

| Document Type | Pages/Size | Time | Chunks | Embeddings |
|--------------|------------|------|---------|------------|
| TXT (10KB) | - | 1-2s | 10 | 10 |
| PDF (5 pages) | 5 | 3-5s | 15-20 | 15-20 |
| PDF (50 pages) | 50 | 15-30s | 100-150 | 100-150 |
| DOCX (10 pages) | 10 | 2-4s | 25-30 | 25-30 |

Network requests (per document):
- Embedding batches: ~1-3 (batch size 96)
- Total API calls: chunks / 96 (rounded up)

## 🎯 Next Steps

After successful testing:
1. [ ] Consider adding progress persistence for large uploads
2. [ ] Add document management UI to view/delete documents
3. [ ] Implement export/import for backup
4. [ ] Add more file formats (Excel, PowerPoint)
5. [ ] Optimize large PDF processing with Web Workers
6. [ ] Add OCR support for scanned documents

---

**Ready to test!** Start with Test 1 (API Key Persistence) and work through the scenarios. Report any issues or unexpected behavior.
