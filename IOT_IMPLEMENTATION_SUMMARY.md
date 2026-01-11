# IoT Streaming Implementation Summary

## Overview
Successfully implemented a real-time IoT data streaming system that simulates sensor data streaming by uploading CSV data row-by-row to Supabase Storage, with real-time dashboard visualization and machine filtering.

## Key Features Implemented

### 1. ✅ Supabase Storage Integration (No IndexedDB)
- **Modified**: CSV dashboard now fetches files from Supabase Storage instead of IndexedDB
- **Location**: `/apps/web/app/home/csv-dashboard/page.tsx`
- **Changes**:
  - Replaced IndexedDB calls with Supabase storage API calls
  - Uses `/api/csv-files` to list files
  - Uses `/api/csv-files/download` to fetch content
  - Maintains same UI/UX for backward compatibility

### 2. ✅ FastAPI IoT Streaming Server
- **File**: `/apps/api/iot_stream.py`
- **Features**:
  - Uploads initial chunk of CSV data (configurable, default: 10 rows)
  - Streams remaining rows one-by-one at configurable intervals (default: 2 seconds)
  - Updates the SAME file in Supabase (no new files created)
  - RESTful API with start/stop/pause/resume controls
  - Real-time status monitoring
  - Machine filtering support (optional)

### 3. ✅ Real-time IoT Dashboard
- **File**: `/apps/web/app/home/iot-dashboard/page.tsx`
- **Features**:
  - Auto-refreshes every 3 seconds during active streaming
  - Stream control panel (start/stop/pause/resume)
  - Progress bar with percentage
  - Machine filtering dropdown (Machine 1, Machine 2, Machine 3, All)
  - Sensor (Captor) visualizations
  - KPI cards showing sensor statistics
  - Last update timestamp

### 4. ✅ Supabase Storage Services
- **CSV Storage Service**: `/apps/web/lib/DataManagement/csv-storage.service.ts`
  - List CSV files from storage
  - Download CSV content
  - Parse CSV into headers/rows
  - Get latest file utility

- **API Routes**:
  - `GET /api/csv-files` - List all CSV files in iot_streams folder
  - `GET /api/csv-files/download?path={path}` - Download CSV content

### 5. ✅ Database Migration
- **File**: `/apps/web/supabase/migrations/20260111_iot_streaming_storage.sql`
- **Purpose**: 
  - Creates storage policies for `iot_streams` folder
  - Allows authenticated users to read files
  - Allows service role to upload/update/delete files
  - No new tables created (uses existing storage infrastructure)

## File Structure

```
Project_GMAO/
├── apps/
│   ├── api/
│   │   ├── iot_stream.py                 ✨ NEW: FastAPI streaming server
│   │   ├── start_iot_stream.ps1          ✨ NEW: Startup script
│   │   └── requirements.txt              🔧 UPDATED: Added supabase, python-dotenv
│   │
│   └── web/
│       ├── app/
│       │   ├── api/
│       │   │   └── csv-files/
│       │   │       ├── route.ts          ✨ NEW: List CSV files API
│       │   │       └── download/
│       │   │           └── route.ts      ✨ NEW: Download CSV API
│       │   │
│       │   └── home/
│       │       ├── csv-dashboard/
│       │       │   └── page.tsx          🔧 UPDATED: Now uses Supabase
│       │       │
│       │       └── iot-dashboard/
│       │           └── page.tsx          ✨ NEW: IoT dashboard with streaming
│       │
│       ├── lib/
│       │   ├── DataManagement/
│       │   │   └── csv-storage.service.ts ✨ NEW: Supabase storage utilities
│       │   │
│       │   └── roles/
│       │       └── role-utils.ts         🔧 UPDATED: Added iot-dashboard path
│       │
│       ├── middleware.ts                 🔧 UPDATED: Added iot-dashboard path
│       │
│       └── supabase/
│           └── migrations/
│               └── 20260111_iot_streaming_storage.sql ✨ NEW: Storage policies
│
├── quick-start-iot.ps1                   ✨ NEW: Quick setup script
└── IOT_STREAMING_README.md               ✨ NEW: Comprehensive documentation
```

## Technical Implementation Details

### How Streaming Works

1. **Initial State**:
   ```
   Source: Final copy.csv (362 rows)
   Supabase: Empty
   ```

2. **Start Stream** → Upload chunk:
   ```
   Source: Final copy.csv (362 rows)
   Supabase: iot_streams/20260111_154030_Final copy.csv (10 rows)
   ```

3. **After 2 seconds** → Add row 11:
   ```
   Supabase: iot_streams/20260111_154030_Final copy.csv (11 rows)
   ```

4. **After 4 seconds** → Add row 12:
   ```
   Supabase: iot_streams/20260111_154030_Final copy.csv (12 rows)
   ```

5. **Continues until completion**:
   ```
   After ~12 minutes: All 362 rows uploaded
   ```

### File Update Strategy

❌ **NOT doing this** (creating new files):
```
iot_streams/
├── file_v1.csv  (10 rows)
├── file_v2.csv  (11 rows)
├── file_v3.csv  (12 rows)
└── ...
```

✅ **Actually doing this** (updating same file):
```
iot_streams/
└── 20260111_154030_Final copy.csv
    (continuously updated from 10 → 362 rows)
```

### Machine Filtering Logic

**Data Structure**:
```csv
...,Machine 2,Machine 1,Machine 3
...,0,1,0           ← Machine 1 active
...,1,1,0           ← Machine 1 and 2 active
...,0,0,1           ← Machine 3 active
```

**Filter Behavior**:
- **All Machines**: Shows all rows (no filtering)
- **Machine 1**: Shows only rows where `Machine 1 = 1`
- **Machine 2**: Shows only rows where `Machine 2 = 1`
- **Machine 3**: Shows only rows where `Machine 3 = 1`

## API Endpoints

### FastAPI Streaming Server (Port 8001)

| Endpoint | Method | Description | Request Body |
|----------|--------|-------------|--------------|
| `/` | GET | API info | - |
| `/stream/start` | POST | Start streaming | `{"csv_file_path": "path", "chunk_size": 10, "interval_seconds": 2.0}` |
| `/stream/stop` | POST | Stop streaming | - |
| `/stream/pause` | POST | Pause streaming | - |
| `/stream/resume` | POST | Resume streaming | - |
| `/stream/status` | GET | Get status | - |

**Status Response**:
```json
{
  "active": true,
  "current_row": 45,
  "total_rows": 362,
  "file_name": "Final copy.csv",
  "started_at": "2026-01-11T15:40:30",
  "paused": false,
  "progress_percentage": 12.43
}
```

### Next.js API Routes (Port 3000)

| Endpoint | Method | Description | Query Params |
|----------|--------|-------------|--------------|
| `/api/csv-files` | GET | List CSV files | - |
| `/api/csv-files/download` | GET | Download CSV | `path={file_path}` |

## Configuration Options

### Streaming Configuration

```typescript
interface StreamConfig {
  csv_file_path: string;        // Path to source CSV (default: "../../DATA/Final copy.csv")
  chunk_size: number;            // Initial rows to upload (default: 10)
  interval_seconds: float;       // Time between uploads (default: 2.0)
  machine_filter: string | null; // Optional machine filter (default: null)
}
```

### Dashboard Configuration

```typescript
// Auto-refresh interval (in IoT dashboard)
const REFRESH_INTERVAL = 3000; // 3 seconds

// Located in: apps/web/app/home/iot-dashboard/page.tsx
// Search for: setInterval
```

## Testing the Implementation

### Step 1: Setup
```powershell
# Run quick start script
.\quick-start-iot.ps1

# Or manual setup:
cd apps/api
python -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Step 2: Start Servers
```powershell
# Terminal 1: Next.js
cd apps/web
pnpm dev

# Terminal 2: FastAPI
cd apps/api
.\start_iot_stream.ps1
```

### Step 3: Access Dashboards
- IoT Dashboard: http://localhost:3000/home/iot-dashboard
- Regular Dashboard: http://localhost:3000/home/csv-dashboard
- API Docs: http://localhost:8001/docs

### Step 4: Start Streaming
1. Open IoT dashboard
2. Click "Start Stream" button
3. Watch real-time progress bar
4. Filter by machine using dropdown
5. Observe sensor visualizations update every 3 seconds

## Visualizations Implemented

### 1. KPI Cards
- Top 4 sensor averages
- Shows min/max values
- Updates in real-time

### 2. Sensor Statistics Cards
- Count, Sum, Average, Min, Max
- For each of 18 captors
- Responsive grid layout

### 3. Machine Status Distribution
- Bar charts showing machine activity
- Only visible when "All Machines" selected

### 4. Sensor by Machine Analysis
- Cross-tabulation charts
- Shows sensor values grouped by machine

### 5. Data Summary Card
- Total rows
- Filtered rows
- Number of sensors
- Number of machines

## Dependencies Added

### Python (apps/api/requirements.txt)
```
supabase           # Supabase Python client
python-dotenv      # Environment variable management
```

### Existing Dependencies Used
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `pydantic` - Data validation

## Environment Variables Required

### apps/api/.env
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
```

**Where to find these**:
1. Go to Supabase Dashboard
2. Select your project
3. Settings → API
4. Copy "Project URL" and "service_role key"

## Migration Instructions

### Apply the migration:
```powershell
cd apps/web
pnpm supabase db push
```

### Verify migration:
```powershell
pnpm supabase db remote commit
```

## Known Limitations & Future Improvements

### Current Limitations
- ❌ Dashboard doesn't auto-detect new streams without manual refresh
- ❌ Only one stream can be active at a time
- ❌ No authentication on FastAPI endpoints (local development only)
- ❌ Fixed refresh interval (not configurable via UI)

### Suggested Improvements
- [ ] WebSocket support for real-time push updates (eliminate polling)
- [ ] Multiple simultaneous streams with unique IDs
- [ ] Stream scheduling and automation
- [ ] Historical data comparison (show before/after)
- [ ] Alert thresholds for sensor values
- [ ] Export filtered data to new CSV
- [ ] Time-series line charts for sensor trends
- [ ] Authentication middleware for FastAPI
- [ ] Rate limiting on API endpoints
- [ ] Configurable refresh interval in UI

## Performance Metrics

### Streaming Performance
- **Default Speed**: 1 row per 2 seconds
- **Total Time** (362 rows): ~12 minutes
- **Fast Mode** (0.5s interval): ~3 minutes
- **Slow Mode** (5s interval): ~30 minutes

### Dashboard Performance
- **Refresh Rate**: 3 seconds
- **API Calls per minute**: ~20 (status + data)
- **Data Transfer**: ~50KB per refresh (depends on file size)

## Security Considerations

### Implemented
✅ Row Level Security (RLS) on storage.objects
✅ Service role required for uploads
✅ Authenticated users can read files
✅ Folder-based isolation (iot_streams/)

### Not Implemented (Development Only)
⚠️ No authentication on FastAPI endpoints
⚠️ CORS allows all origins
⚠️ Service key in .env file (not in secrets manager)

**For Production**:
1. Add authentication middleware to FastAPI
2. Restrict CORS to specific origins
3. Use environment-based secrets (not .env files)
4. Add rate limiting
5. Enable HTTPS only

## Rollback Instructions

If you need to revert these changes:

### 1. Database Migration
```powershell
cd apps/web
pnpm supabase migration down --local
```

### 2. Remove Files
```powershell
# Remove new files
Remove-Item apps/api/iot_stream.py
Remove-Item apps/api/start_iot_stream.ps1
Remove-Item apps/web/app/home/iot-dashboard/page.tsx
Remove-Item apps/web/app/api/csv-files -Recurse
Remove-Item apps/web/lib/DataManagement/csv-storage.service.ts

# Revert modified files using git
git checkout apps/web/app/home/csv-dashboard/page.tsx
git checkout apps/web/middleware.ts
git checkout apps/web/lib/roles/role-utils.ts
git checkout apps/api/requirements.txt
```

## Success Criteria Met

✅ **Requirement 1**: Dashboard fetches CSV files from Supabase (not IndexedDB)
✅ **Requirement 2**: FastAPI script simulates IoT streaming row-by-row
✅ **Requirement 3**: Uses "Final copy.csv" as reference data source
✅ **Requirement 4**: Machine filtering implemented in UI
✅ **Requirement 5**: Same file continuously updated (no new tables)
✅ **Requirement 6**: Initial chunk upload, then row-by-row streaming
✅ **Requirement 7**: Real-time visualization updates

## Support & Documentation

- **Full Guide**: `IOT_STREAMING_README.md`
- **Quick Start**: `quick-start-iot.ps1`
- **API Docs**: http://localhost:8001/docs (when server running)
- **Dashboard**: http://localhost:3000/home/iot-dashboard

## Final Notes

This implementation provides a complete IoT data streaming simulation system that:
1. ✅ Replaces IndexedDB with Supabase Storage
2. ✅ Simulates real-time sensor data streaming
3. ✅ Provides machine-filtered visualizations
4. ✅ Uses the same CSV file updated incrementally
5. ✅ Includes comprehensive documentation and tooling

All requirements have been successfully implemented and tested.
