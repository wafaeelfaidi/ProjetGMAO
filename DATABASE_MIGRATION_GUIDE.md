# Database Migration Guide

## Issue: Missing Indexes in IndexedDB

If you see the error:
```
Failed to execute 'index' on 'IDBObjectStore': The specified index was not found.
```

This means the database schema has been updated but your old database instance still has the old schema.

## Solution

### Quick Fix (Browser Console)

1. Open your browser's DevTools (F12)
2. Go to the **Console** tab
3. Run one of these commands:

#### Option 1: Complete Reset (Recommended)
```javascript
await window.resetGMAODatabase()
```
This deletes the entire database. The app will recreate it with the new schema when you refresh.

**Then:**
- Refresh the page (F5)
- Re-upload your documents

#### Option 2: Clear Data Only
```javascript
await window.clearGMAOData()
```
This clears all data but keeps the schema.

#### Option 3: Check Database Status
```javascript
const info = await window.getGMAODatabaseInfo()
console.table(info.stores)
```
This shows you the current database structure, including:
- Store names
- Available indexes
- Number of records in each store

### Technical Details

**Database Version**: v5 (updated from v4)

**New Indexes Added**:
- `equipements` store: Added `Code_Equip` index
- `maintenance` store: Added `Code_Equip` index  
- All stores: Added proper `source_document_id` index

**What Changed**:
- The auto-distribution now deletes old records before adding new ones to prevent duplicates
- Uses the `source_document_id` index to find existing records for a document

## If Console Commands Don't Work

Use the browser's IndexedDB manager:

1. Open DevTools (F12)
2. Go to **Application** → **Storage** → **IndexedDB**
3. Find `gmao_client_db`
4. Right-click and select "Delete Database"
5. Refresh the page

## After Fixing

1. Navigate to the Data Upload page
2. Re-upload your documents
3. The data should now be distributed without duplicates
4. Check your Tableau RPN page to verify the data loads correctly

## Troubleshooting

**Still seeing duplicates?**
- Clear your browser cache (Ctrl+Shift+Delete)
- Run `window.resetGMAODatabase()` again
- Refresh the page

**Indexes still missing?**
- Check that your browser supports IndexedDB (all modern browsers do)
- Try a different browser if the issue persists
- Check browser console for error messages

## For Developers

To programmatically reset the database in your code:

```typescript
import { deleteDatabase, clearAllData, getDatabaseInfo } from "~/lib/client-storage/db-migration";

// Reset everything
await deleteDatabase();

// Or just clear data
await clearAllData();

// Or check status
const info = await getDatabaseInfo();
console.log(info);
```
