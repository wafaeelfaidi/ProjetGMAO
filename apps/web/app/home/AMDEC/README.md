# AMDEC Module - Documentation

## Overview
The AMDEC (Failure Mode and Effects Analysis) module automatically analyzes maintenance data to calculate key failure statistics per equipment and optionally generates AMDEC documentation using AI.

## Features

### 1. **CSV Upload & Analysis**
- Upload maintenance history CSV files
- Automatic column detection (flexible names)
- Support for French and English column names
- Handles both semicolon and comma separators

### 2. **Equipment Statistics**
For each equipment in the dataset, the system calculates:
- **Failure Frequency**: Number of failures per month
- **Failure Modes**: List of all observed failure types
- **Average Cost**: Mean cost per failure
- **Total Failures**: Total number of failures recorded
- **Total Cost**: Cumulative cost of all failures

### 3. **AMDEC Document Generation**
- Automatic AMDEC document generation using AI
- Risk level assessment (HIGH/MEDIUM/LOW)
- Recommended maintenance actions
- Exportable in Markdown format

## CSV Format

### Required Columns (flexible names)
The system automatically detects columns with these names:

| Purpose | Accepted Column Names (case-insensitive) |
|---------|------------------------------------------|
| **Equipment** | Equipment, Équipement, Equipement, Machine, Désignation, Designation |
| **Date** | Date, Date intervention |
| **Failure Mode** | Mode, Défaillance, Defaillance, Panne, Type, Mode de défaillance, Type de panne |
| **Cost** | Cost, Coût, Cout, Prix, Montant |

### Example CSV Structure

```csv
Équipement;Date intervention;Mode de défaillance;Coût
Pompe P-101;15/01/2024;Fuite joint;1500.50
Pompe P-101;23/02/2024;Défaillance moteur;3200.00
Compresseur C-201;05/01/2024;Surchauffe;2100.75
Pompe P-101;12/03/2024;Vibration excessive;800.00
Compresseur C-201;18/03/2024;Fuite huile;1200.00
```

### Date Formats Supported
- French format: `DD/MM/YYYY` (e.g., `15/01/2024`)
- ISO format: `YYYY-MM-DD` (e.g., `2024-01-15`)

### Number Formats
- French: `1.500,50` (space for thousands, comma for decimal)
- English: `1,500.50` (comma for thousands, dot for decimal)

## Usage

### Step 1: Prepare Your CSV
Ensure your CSV contains maintenance records with:
- Equipment names/identifiers
- Dates of interventions
- Failure modes or types
- Associated costs (optional but recommended)

### Step 2: Upload & Analyze
1. Navigate to `/home/AMDEC`
2. Click "Upload CSV" and select your file
3. (Optional) Check "Generate AMDEC document with LLM" for AI-generated analysis
4. Click "Analyze Data"

### Step 3: Review Results
The system displays:
- **Statistics Table**: Sortable table with all equipment metrics
- **Failure Frequency**: Calculated as failures per month based on date range
- **Failure Modes**: All unique failure types per equipment
- **Cost Analysis**: Average and total costs

### Step 4: Export Results
- **Download CSV**: Export statistics table as CSV
- **Download AMDEC**: Get generated AMDEC document (if generated)

## API Endpoints

### POST `/api/home/amdec/analyze`
Analyze maintenance CSV and generate statistics.

**Request:**
```typescript
FormData {
  file: File;              // CSV file
  generate_amdec: boolean; // Generate AMDEC doc?
}
```

**Response:**
```typescript
{
  success: boolean;
  equipment_stats: Array<{
    equipment: string;
    failure_frequency: number;
    failure_modes: string[];
    average_cost: number;
    total_failures: number;
    total_cost: number;
  }>;
  amdec_generated?: string; // Markdown format
  error?: string;
}
```

## Python Script

### `amdec_analyzer.py`
Located at: `apps/web/public/ml/amdec_analyzer.py`

**Key Functions:**
- `analyze_equipment(df)`: Calculate statistics per equipment
- `generate_amdec_with_llm(equipment_stats)`: Generate AMDEC document
- `parse_french_date(date_str)`: Handle French date formats

**Column Detection Logic:**
The script uses fuzzy matching to find the right columns regardless of exact naming:
```python
# Equipment column
if any(x in col_lower for x in ['equipment', 'équipement', 'machine', 'désignation']):
    col_map['equipment'] = col
```

## Integration with LLM

### Current Implementation
The system includes a placeholder for LLM integration. To connect with your preferred LLM:

**Option 1: OpenAI**
```python
import openai

def generate_amdec_with_llm(equipment_stats):
    prompt = f"Generate detailed AMDEC document:\n{context}"
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content
```

**Option 2: Claude (Anthropic)**
```python
import anthropic

def generate_amdec_with_llm(equipment_stats):
    client = anthropic.Anthropic(api_key="YOUR_API_KEY")
    message = client.messages.create(
        model="claude-3-opus-20240229",
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text
```

## Risk Assessment Logic

The system automatically assigns risk levels based on failure frequency:

| Failure Frequency | Risk Level |
|-------------------|------------|
| > 2 failures/month | HIGH |
| 0.5 - 2 failures/month | MEDIUM |
| < 0.5 failures/month | LOW |

## Troubleshooting

### "Equipment column not found"
- Check your CSV has a column related to equipment names
- Accepted names: Equipment, Équipement, Machine, Désignation

### "Date parsing failed"
- Ensure dates are in `DD/MM/YYYY` format
- Or use ISO format `YYYY-MM-DD`

### "Cost values incorrect"
- French format: Use comma for decimals (`1500,50`)
- English format: Use dot for decimals (`1500.50`)

### Python process timeout
- Large files (>10MB) may timeout
- Consider splitting large datasets
- Adjust timeout in `route.ts` if needed

## Example Output

### Statistics Table
```
Equipment       | Frequency | Failures | Avg Cost | Total Cost
----------------|-----------|----------|----------|------------
Pompe P-101     | 1.5/month | 3        | 1833.50  | 5500.50
Compresseur C-201| 0.8/month | 2        | 1650.38  | 3300.75
```

### Generated AMDEC (excerpt)
```markdown
### Equipment: Pompe P-101

**Criticality Assessment:**
- Failure Frequency: 1.50 failures/month
- Average Cost Impact: 1833.50 DH per failure
- Total Cost: 5500.50 DH

**Identified Failure Modes:**
- Fuite joint
- Défaillance moteur
- Vibration excessive

**Risk Level:** MEDIUM
**Recommended Actions:** Implement preventive maintenance schedule
```

## Future Enhancements

1. **Advanced LLM Integration**: Connect to OpenAI/Claude/Gemini for better AMDEC generation
2. **Risk Matrix**: Visual risk assessment matrix
3. **Trend Analysis**: Failure frequency trends over time
4. **Predictive Maintenance**: ML-based failure prediction
5. **Multi-file Upload**: Batch processing of multiple CSV files
6. **Export Formats**: PDF, Excel, Word documents

## Technical Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Data Processing**: Python, pandas, numpy
- **File Handling**: Temporary file storage with cleanup
- **Encoding**: UTF-8 support for French characters
