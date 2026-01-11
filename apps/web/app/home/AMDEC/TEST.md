# Test AMDEC Analyzer

## Quick Test

Run this command to test the AMDEC analyzer:

```powershell
# Navigate to project root
cd c:\Users\pc\Desktop\Expertise\Project_GMAO

# Test with sample data
$testInput = @{
    csv_path = "apps\web\app\home\AMDEC\sample_data.csv"
    generate_amdec = $true
} | ConvertTo-Json

$testInput | python apps\web\public\ml\amdec_analyzer.py
```

## Expected Output Structure

```json
{
  "success": true,
  "equipment_stats": [
    {
      "equipment": "Convoyeur CV-401",
      "failure_frequency": 1.5,
      "failure_modes": ["Courroie cassée", "Défaut roulement"],
      "average_cost": 766.67,
      "total_failures": 6,
      "total_cost": 4600.0
    },
    ...
  ],
  "amdec_generated": "# AMDEC Document...\n..."
}
```

## Manual Test via Frontend

1. Start the development server:
```powershell
cd c:\Users\pc\Desktop\Expertise\Project_GMAO
pnpm turbo dev
```

2. Navigate to: `http://localhost:3000/home/AMDEC`

3. Upload the sample CSV file: `apps/web/app/home/AMDEC/sample_data.csv`

4. Check the results display correctly

## Verify Key Metrics

For the sample data, you should see:

| Equipment | Expected Frequency | Expected Failures |
|-----------|-------------------|-------------------|
| Convoyeur CV-401 | ~1.5/month | 6 |
| Pompe P-101 | ~1.0/month | 4 |
| Compresseur C-201 | ~0.8/month | 4 |
| Pompe P-102 | ~1.0/month | 4 |

## Debugging

If errors occur, check:
1. Python stderr output in browser console
2. Next.js terminal output
3. CSV encoding (should be UTF-8)
4. Column names are detected correctly
