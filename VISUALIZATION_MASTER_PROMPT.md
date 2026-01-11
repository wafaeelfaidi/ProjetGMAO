# Master Prompt: GMAO Platform Comprehensive Visualization

## Objective
Create a complete functional visualization of the GMAO (Computer-Aided Maintenance Management) platform, detailing all user-facing functionalities, their interactions, data flows, and underlying technologies. Focus on **what users can do** and **how each feature works**.

---

## System Overview
A full-stack predictive maintenance platform that combines:
- **Frontend**: Next.js web application with React
- **Backend**: FastAPI (Python) for ML predictions and maintenance forecasting
- **Database**: Supabase for authentication and data persistence
- **Local Storage**: IndexedDB for offline data caching and performance
- **AI/ML**: Pre-trained TensorFlow models + RAG (Retrieval-Augmented Generation) for intelligent insights

**User Role**: Single user type with access to all functionalities

---

## Core Functionalities

### 1. 📊 Dashboard (Main Hub)
**Purpose**: Central command center providing overview of maintenance operations

**Features**:
- **Real-time Metrics Display**
  - Total machines monitored
  - Active maintenance operations
  - Pending work orders
  - Critical alerts count
  - Recent interventions timeline
  
- **Quick Navigation Cards**
  - Access to all 7 modules
  - Color-coded status indicators (green/yellow/red)
  - Recent activity feed
  
- **Performance KPIs**
  - MTBF (Mean Time Between Failures)
  - MTTR (Mean Time To Repair)
  - Overall Equipment Effectiveness (OEE)
  - Cost trends (monthly/quarterly)

**Data Sources**: 
- Aggregated from AMDEC.csv (historical)
- Real-time from Supabase database
- Cached in IndexedDB for fast loading

**User Flow**:
```
User Login → Dashboard Loads → View KPIs → Navigate to Module
```

---

### 2. 📤 Data Upload System
**Purpose**: Import maintenance and sensor data for analysis

**Features**:
- **CSV File Upload**
  - Drag-and-drop interface
  - Support for AMDEC format (semicolon-separated, French locale)
  - Support for sensor data (18 captors × N records)
  - File validation and preview before import
  
- **Data Mapping**
  - Auto-detect column headers
  - Manual mapping for non-standard formats
  - Handle French decimal format (comma → dot conversion)
  - Date format detection (DD/MM/YYYY)
  
- **Import Processing**
  - Progress bar with record count
  - Error handling (invalid dates, missing fields)
  - Duplicate detection
  - Data normalization (machine names, failure types)
  
- **Storage Options**
  - Save to Supabase (persistent)
  - Cache in IndexedDB (local performance)
  - Export processed data (cleaned format)

**Data Flow**:
```
User Uploads CSV → Validation → Column Mapping → Processing → 
→ Store in Supabase + IndexedDB → Confirmation + Preview
```

**Technologies**:
- PapaParse for CSV parsing
- IndexedDB API for local caching
- Supabase client for remote storage

---

### 3. 💬 AI Chatbot Assistant
**Purpose**: Natural language interface for maintenance queries and insights

**Features**:
- **Conversational Interface**
  - Message history
  - Typing indicators
  - Multi-turn conversations
  - Context retention
  
- **Query Types Supported**:
  - Equipment status: "What's the status of Machine 2?"
  - Maintenance schedule: "When is the next maintenance for Machine 1?"
  - Failure predictions: "What's the probability of failure this week?"
  - Historical data: "Show me all interventions for Machine 3 in 2024"
  - Cost analysis: "What was the maintenance cost last month?"
  - Recommendations: "What preventive actions should I take?"
  
- **RAG Implementation**:
  - **Retrieval Phase**:
    - Query embeddings generated from user question
    - Semantic search across:
      - AMDEC historical records (stored in vector DB or IndexedDB)
      - Maintenance forecasts
      - Work order database
    - Top-K relevant documents retrieved
  
  - **Augmentation Phase**:
    - Retrieved context + user query combined
    - Add current machine status from Supabase
    - Include recent predictions from ML models
  
  - **Generation Phase**:
    - LLM generates response using augmented context
    - Cite sources (intervention dates, document IDs)
    - Provide actionable recommendations
  
- **Response Types**:
  - Text answers with citations
  - Data tables (formatted results)
  - Charts/graphs (rendered inline)
  - Action buttons (create work order, view details)

**Data Sources**:
- AMDEC.csv embeddings (indexed for RAG)
- Supabase real-time data
- ML prediction results
- IndexedDB cached responses (for offline)

**User Flow**:
```
User Types Query → RAG Retrieval from IndexedDB/Supabase → 
→ Context Enrichment → LLM Generation → Response Display → 
→ Follow-up Actions (optional)
```

**Technologies**:
- RAG: Vector embeddings + semantic search
- LLM: GPT-4 or similar for generation
- IndexedDB: Cache frequent queries and embeddings
- Supabase: Real-time data sync

---

### 4. 🔍 AMDEC Analysis & Report Generation
**Purpose**: Failure Mode and Effects Analysis with automated report generation

**Features**:
- **Data Analysis**:
  - Parse AMDEC.csv historical interventions
  - Extract failure modes per equipment
  - Calculate failure frequencies
  - Compute severity scores (based on downtime × cost)
  - Identify critical organs/parts
  
- **Risk Matrix Generation**:
  - Probability × Severity scoring
  - Visual heat map (red/yellow/green)
  - Risk Priority Number (RPN) calculation
  - Sort by criticality
  
- **Report Components**:
  - **Equipment Summary**: Machine ID, total interventions, MTBF
  - **Failure Mode Table**: Type, Cause, Frequency, Avg Downtime, Avg Cost
  - **Critical Parts List**: Parts requiring frequent replacement
  - **Recommended Actions**: Preventive measures ranked by RPN
  - **Trend Analysis**: Failure patterns over time (seasonal, weekly)
  
- **Export Options**:
  - PDF report with charts
  - Excel spreadsheet (detailed data)
  - JSON for API integration

**Data Processing**:
```
AMDEC.csv → Parse (handle French format) → 
→ Group by Machine + Failure Type → 
→ Calculate Statistics (freq, mean, std) → 
→ Score Severity → Generate RPN → 
→ Create Report → Store in Supabase + Cache in IndexedDB
```

**User Interactions**:
- Select machine(s) to analyze
- Set date range filter
- Adjust severity weighting factors
- Generate report (takes 2-5 seconds)
- View interactive report
- Export to PDF/Excel
- Share report link

**Technologies**:
- Python script (amdec_analyzer.py) for processing
- Pandas for data manipulation
- Supabase for report storage
- IndexedDB for caching generated reports

---

### 5. 📝 Work Order Management (AI-Powered)
**Purpose**: Create, track, and manage maintenance work orders with AI assistance

**Features**:
- **Work Order Creation**:
  - Manual creation (form-based)
  - AI-generated from AMDEC analysis
  - Auto-triggered by calendar predictions
  
- **AI Description Generator**:
  - Input: Machine ID + Failure type
  - RAG Process:
    - Retrieve similar past interventions from IndexedDB/Supabase
    - Extract common solutions and procedures
    - Generate detailed work instruction using LLM
  - Output: Step-by-step procedure, required parts, estimated time
  
- **Work Order Fields**:
  - ID (auto-generated)
  - Title
  - Machine/Equipment
  - Priority (Low/Medium/High/Critical)
  - Type (Preventive/Corrective/Predictive)
  - Description (AI-generated or manual)
  - Assigned date
  - Deadline
  - Estimated duration
  - Required parts/materials
  - Status (Pending/In Progress/Completed/Cancelled)
  
- **Tracking & Execution**:
  - Status updates (real-time in Supabase)
  - Time logging (start/end)
  - Parts consumption recording
  - Photos/attachments upload
  - Notes and observations
  - Completion confirmation
  
- **Post-Execution**:
  - Intervention recorded to AMDEC.csv
  - Data synced to Supabase
  - IndexedDB updated for offline access
  - Triggers recalculation of maintenance forecasts
  - Updates dashboard KPIs

**Data Flow**:
```
Trigger (Manual/AI/Calendar) → 
→ RAG Retrieval (similar past WOs) → 
→ AI Description Generation → 
→ Create WO in Supabase → Cache in IndexedDB → 
→ User Executes → Update Status → 
→ Complete → Record Intervention → 
→ Update Historical Data → Recalculate Forecasts
```

**User Workflows**:
1. **Create**: Dashboard → Create WO → AI Assist → Fill form → Save
2. **Execute**: WO List → Select WO → Start → Log work → Add notes → Complete
3. **Review**: WO History → Filter by machine/date → View details → Export

**Technologies**:
- RAG for AI description generation
- Supabase for CRUD operations
- IndexedDB for offline WO access
- Real-time sync (Supabase subscriptions)

---

### 6. 📈 Breakdown Prediction (ML-Powered)
**Purpose**: Real-time machine failure prediction using sensor data

**Features**:
- **Sensor Input Interface**:
  - Manual entry (18 captor values per machine)
  - CSV batch upload (multiple readings)
  - Real-time sensor integration (if available)
  - Historical data visualization
  
- **ML Prediction Process**:
  1. **Data Collection**: 18 sensor values (temperature, vibration, pressure, etc.)
  2. **Preprocessing**:
     - Normalize using StandardScaler (fitted on training data)
     - Handle missing values
     - Feature engineering (if configured)
  3. **Model Inference**:
     - Load pre-trained model (machine_X_model.h5)
     - Run prediction (TensorFlow)
     - Output: Failure probability (0-1 scale)
  4. **Result Interpretation**:
     - Classify risk level (Low <30%, Medium 30-70%, High >70%)
     - Estimate time to failure (if applicable)
     - Recommend actions based on threshold
  
- **Visualization**:
  - Probability gauge (0-100%)
  - Risk level indicator (color-coded)
  - Sensor value charts (18 captors)
  - Historical trend comparison
  - Confidence intervals
  
- **Actionable Outputs**:
  - Alert notifications (if high risk)
  - Auto-create preventive work order
  - Log prediction to Supabase
  - Update dashboard metrics

**Prediction Models**:
- 3 pre-trained models: Machine 1, 2, 3
- Each trained on Final copy.csv historical data
- Models loaded at FastAPI startup
- Predictions served via REST API

**Data Flow**:
```
User Inputs Sensor Data → 
→ Frontend Validation → 
→ Send to FastAPI /predict endpoint → 
→ Normalize Features → 
→ Load Model → Predict → 
→ Return Probability + Risk Level → 
→ Display Results → 
→ Store in Supabase → Cache in IndexedDB → 
→ (Optional) Trigger Work Order
```

**User Interactions**:
1. Navigate to Breakdown Prediction
2. Select machine
3. Enter 18 captor values (or upload CSV)
4. Click "Predict"
5. View results (probability, risk, recommendations)
6. (Optional) Create work order if high risk
7. View prediction history

**Technologies**:
- FastAPI backend for ML inference
- TensorFlow.js or REST API for predictions
- Supabase for prediction logging
- IndexedDB for offline model caching (if small enough)

---

### 7. 📅 Maintenance Planning & Calendar
**Purpose**: Predictive maintenance scheduling with probability-based forecasting

**Features**:
- **Forecasting Algorithm**:
  1. **Time Between Interventions (TBI)**:
     - Calculate from AMDEC.csv historical data
     - Group by machine
     - Compute: median, mean, std deviation, quartiles
  
  2. **Next Maintenance Date Prediction**:
     - Last intervention date + median TBI
     - Fallback: mean TBI if sample size < 5
     - Default: 30 days if insufficient data (<3 records)
  
  3. **Probability Window**:
     - Window start: last date + 25th percentile TBI
     - Window end: last date + 75th percentile TBI
     - If insufficient data: predicted date ± 7 days
  
  4. **Daily Probability Distribution**:
     - Use normal distribution (mean = predicted date, variance from TBI std)
     - Spread probability over 60-day horizon
     - Normalize to sum = 1.0
  
  5. **Failure Type Probabilities**:
     - Based on last N=15 interventions (or all if fewer)
     - Frequency count per failure type
     - Normalize to percentages
  
  6. **Expected Costs & Downtime**:
     - Weighted average by failure type probabilities
     - Formula: Σ(failure_type_prob × avg_cost)
  
- **Calendar View**:
  - Monthly calendar grid
  - Events colored by probability band:
    - 🔴 High (≥70%): Red
    - 🟡 Medium (40-70%): Yellow
    - 🟢 Low (<40%): Green
    - ⚫ Past (historical): Gray
  
- **Event Details**:
  - Machine name
  - Predicted maintenance date
  - Probability percentage
  - Expected failure types (top 3)
  - Expected downtime hours
  - Expected material cost
  - Probability window (start-end dates)
  - Recommended actions
  
- **Interactive Features**:
  - Filter by machine
  - Filter by probability band
  - Filter by date range
  - Click event → view full details
  - Create work order from event
  - Export calendar (iCal, PDF)
  
- **List View (Alternative)**:
  - Sortable table of upcoming maintenance
  - Sort by: date, probability, cost, machine
  - Search functionality

**Data Sources**:
- AMDEC.csv → TBI calculation
- ML predictions → failure probabilities
- Supabase → real-time updates
- IndexedDB → cached forecasts

**API Endpoints**:
- `GET /maintenance/forecast?machine=X&horizon_days=60`
  - Returns: array of forecast objects
- `GET /maintenance/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD`
  - Returns: calendar-ready events
- `GET /maintenance/machines`
  - Returns: list of available machines

**Data Flow**:
```
AMDEC.csv → Calculate TBI per machine → 
→ Forecast next date + window → 
→ Calculate daily probabilities → 
→ Assign failure type probabilities → 
→ Compute expected costs/downtime → 
→ Generate calendar events → 
→ Store in Supabase → Cache in IndexedDB → 
→ Display in Calendar UI → 
→ User interacts → Create WO (optional)
```

**User Workflows**:
1. **View Calendar**: Navigate → Select month → View events
2. **Plan Maintenance**: Click event → Review details → Create work order → Assign
3. **Monitor Trends**: Filter by machine → Analyze patterns → Adjust schedules
4. **Export Schedule**: Select date range → Export to iCal/PDF → Share with team

**Technologies**:
- FastAPI maintenance.py module for forecasting
- React Calendar component
- Supabase for event storage
- IndexedDB for offline calendar access
- Real-time updates via Supabase subscriptions

---

## Data Architecture

### Supabase Database
**Tables**:
- `interventions`: Historical maintenance records (synced from AMDEC.csv)
- `work_orders`: Active and completed work orders
- `predictions`: ML prediction logs
- `forecasts`: Maintenance calendar events
- `users`: Authentication (single role)

**Real-time Features**:
- Live updates on work order status changes
- New prediction notifications
- Calendar event updates

### IndexedDB (Client-side)
**Stores**:
- `cached_data`: Offline copy of AMDEC data
- `embeddings`: Vector embeddings for RAG
- `predictions_cache`: Recent ML predictions
- `reports_cache`: Generated AMDEC reports
- `work_orders_offline`: Sync queue for offline work

**Purpose**:
- Offline functionality
- Faster data access (no network latency)
- Reduce API calls
- Sync queue for offline actions

**Sync Strategy**:
```
Online: Supabase ⇄ IndexedDB (bi-directional sync)
Offline: IndexedDB only (queue operations)
Reconnect: Flush queue to Supabase → Update IndexedDB
```

---

## RAG Implementation Details

### Architecture
**Components**:
1. **Document Ingestion**:
   - AMDEC interventions → chunk by record
   - Work order histories → chunk by procedure
   - Generate embeddings (OpenAI/Sentence Transformers)
   - Store in IndexedDB vector store

2. **Retrieval**:
   - User query → embedding
   - Cosine similarity search in IndexedDB
   - Return top-K (K=5) relevant documents
   - Include metadata (date, machine, failure type)

3. **Augmentation**:
   - Combine: query + retrieved docs + current context
   - Format as prompt template
   - Add system instructions (role: maintenance expert)

4. **Generation**:
   - Send to LLM (OpenAI GPT-4 or similar)
   - Stream response for better UX
   - Parse structured outputs (if JSON requested)

**Use Cases in Platform**:
- **Chatbot**: Answer maintenance questions
- **Work Order AI**: Generate detailed procedures
- **AMDEC Insights**: Explain failure patterns
- **Recommendations**: Suggest preventive actions

**Data Flow**:
```
User Input → Embedding → 
→ Semantic Search (IndexedDB vectors) → 
→ Retrieve Top-K Docs → 
→ Augment with Context (Supabase live data) → 
→ LLM Generation → 
→ Response Display
```

---

## User Journey: Complete Scenario

**Scenario**: Maintenance manager wants to schedule maintenance for Machine 2

1. **Dashboard**: Login → View alerts → See "Machine 2: High failure risk"

2. **Breakdown Prediction**: Navigate to prediction → See 75% failure probability

3. **AMDEC Analysis**: Check AMDEC report → Identify "Bearing failure" as most common

4. **Chatbot Query**: Ask "What was the last bearing intervention for Machine 2?"
   - RAG retrieves: Last intervention 45 days ago, cost 1,200€, downtime 6h
   - LLM responds with details + recommendation

5. **Maintenance Calendar**: View calendar → See predicted maintenance in 5 days (70% probability)

6. **Work Order Creation**: 
   - Click "Create WO from event"
   - AI generates description based on past bearing replacements
   - Review and confirm
   - WO saved to Supabase + IndexedDB

7. **Execution**: Technician opens WO → Follows procedure → Completes → Logs details

8. **Data Update**: 
   - Intervention recorded to AMDEC.csv
   - Supabase updated
   - IndexedDB synced
   - Calendar recalculated (next maintenance pushed to +45 days)
   - Dashboard KPIs updated

---

## Visualization Requirements

**For Mermaid Diagram**:
- Show all 7 functionalities as distinct modules
- Data flow from upload → storage (Supabase + IndexedDB)
- RAG workflow for chatbot and work orders
- ML prediction pipeline
- Maintenance forecasting logic
- User interactions at each stage
- Offline/online sync mechanism

**Color Coding**:
- 🔵 Data sources (blue)
- 🟢 Functionalities (green)
- 🟡 User interactions (yellow)
- 🟣 Storage (purple: Supabase, IndexedDB)
- 🔴 AI/ML components (red: RAG, ML models)

**Key Relationships**:
- Solid arrows: Direct data flow
- Dashed arrows: API calls, async operations
- Double arrows: Bi-directional sync (Supabase ⇄ IndexedDB)

---

## Technical Stack Summary

**Frontend**:
- Next.js (React framework)
- React Query (data fetching, caching)
- IndexedDB API (offline storage)
- Chart.js / Recharts (visualizations)

**Backend**:
- FastAPI (Python REST API)
- TensorFlow (ML inference)
- Pandas (data processing)

**Database**:
- Supabase (PostgreSQL + real-time + auth)
- IndexedDB (client-side storage)

**AI/ML**:
- Pre-trained TensorFlow models (.h5 files)
- RAG: Embeddings + LLM (OpenAI GPT-4 or similar)
- Vector search (IndexedDB or separate vector DB)

**Deployment**:
- Frontend: Vercel / Netlify
- Backend: Cloud VPS / Railway / Render
- Supabase: Managed cloud

---

## Success Metrics

**For Users**:
- Reduced unplanned downtime by 30%
- Faster work order creation (AI saves 80% time)
- Improved maintenance scheduling accuracy (85%+ within predicted window)
- Single platform for all maintenance operations (no tool switching)

**For System**:
- Fast response times (<500ms for predictions)
- Offline-first functionality (works without internet)
- 99.9% uptime
- Real-time sync with <1s latency

---

## End of Master Prompt

Use this prompt to generate:
1. Comprehensive Mermaid diagrams
2. System documentation
3. User manuals
4. API specifications
5. Training materials
6. Architecture presentations

Ensure all visualizations clearly show the interconnection between:
- Data sources (CSV files)
- Storage layers (Supabase, IndexedDB)
- Processing (ML models, RAG, forecasting algorithms)
- User interfaces (7 core functionalities)
- AI assistance (chatbot, work order generation, predictions)
