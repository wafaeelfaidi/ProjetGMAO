# Mistral AI Setup for AMDEC Generation

## Overview
The AMDEC module can use Mistral AI to generate professional AMDEC documents automatically.

## Setup Instructions

### 1. Get Mistral API Key

1. Go to [Mistral AI Console](https://console.mistral.ai/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-...`)

### 2. Install Python Dependencies

```powershell
# Install requests library for API calls
pip install requests
```

### 3. Configure Environment Variable

**Option A: Set in .env file** (Recommended)
```bash
# Create or edit .env file in project root
MISTRAL_API_KEY=sk-your-actual-key-here
```

**Option B: Set in PowerShell** (Temporary)
```powershell
$env:MISTRAL_API_KEY = "sk-your-actual-key-here"
```

**Option C: Set in Windows System Environment** (Permanent)
1. Open System Properties
2. Environment Variables
3. Add new variable:
   - Name: `MISTRAL_API_KEY`
   - Value: `sk-your-actual-key-here`

### 4. Test the Integration

Upload a CSV file and check "Generate AMDEC document with LLM"

**Expected behavior:**
- ✅ With API key: Uses Mistral AI for intelligent generation
- ⚠️ Without API key: Falls back to template-based generation

## Mistral Models

The system uses `mistral-large-latest` for best quality AMDEC generation.

Available models:
- `mistral-large-latest` - Most capable (recommended)
- `mistral-medium-latest` - Good balance
- `mistral-small-latest` - Faster, lower cost

To change the model, edit `amdec_analyzer.py`:
```python
'model': 'mistral-medium-latest',  # Change this line
```

## API Pricing (as of Nov 2025)

Mistral Large:
- Input: ~€0.004 per 1K tokens
- Output: ~€0.012 per 1K tokens

Typical AMDEC generation:
- Input: ~500-1000 tokens
- Output: ~2000-3000 tokens
- **Cost per generation: ~€0.03-0.05**

## What Mistral Generates

With Mistral AI, the AMDEC includes:

1. **Detailed Analysis**
   - Comprehensive failure mode analysis
   - Root cause identification
   - Effect chain analysis

2. **FMEA Ratings**
   - Severity (Gravité): 1-10
   - Occurrence (Fréquence): 1-10
   - Detection (Détection): 1-10
   - NPR (Risk Priority Number)

3. **Actionable Recommendations**
   - Preventive maintenance strategies
   - Detection improvements
   - Risk mitigation actions

4. **Professional Format**
   - Structured Markdown
   - Tables and lists
   - Ready for export to PDF/Word

## Example Output

**Without Mistral (Template):**
```markdown
### Equipment: Pompe P-101
- Failure Frequency: 1.5/month
- Risk Level: MEDIUM
- Actions: Schedule monthly inspections
```

**With Mistral (AI-Generated):**
```markdown
### Équipement: Pompe P-101

#### Mode de Défaillance: Fuite joint
**Causes Potentielles:**
- Vieillissement du joint
- Serrage insuffisant
- Corrosion chimique
- Vibrations excessives

**Effets:**
- Perte de fluide
- Contamination environnement
- Baisse de performance
- Risque d'arrêt production

**Évaluation:**
- Gravité: 7/10 (perte de production)
- Occurrence: 8/10 (1.5 pannes/mois)
- Détection: 4/10 (visible en inspection)
- **NPR: 224** (Risque élevé)

**Actions Recommandées:**
1. Remplacer les joints tous les 3 mois (préventif)
2. Contrôler le couple de serrage à chaque maintenance
3. Installer détecteur de fuite
4. Former opérateurs à détection précoce
```

## Troubleshooting

### Error: "requests module not found"
```powershell
pip install requests
```

### Error: "Mistral API error: 401"
- Check your API key is correct
- Verify it's set in environment variable
- Restart the dev server after setting the variable

### Error: "Mistral API timeout"
- Network issue - check internet connection
- Try again - temporary service issue
- Increase timeout in code if needed

### Using Template Instead of Mistral
If you see "No MISTRAL_API_KEY found" in logs:
1. Check environment variable is set
2. Restart terminal/dev server
3. Verify `.env` file is in project root

## Security Best Practices

1. **Never commit API keys**
   - Add `.env` to `.gitignore`
   - Use `.env.example` for documentation

2. **Use environment-specific keys**
   - Development key for testing
   - Production key for live system

3. **Rotate keys regularly**
   - Generate new key every 3-6 months
   - Revoke old keys after rotation

4. **Monitor API usage**
   - Check Mistral console for usage
   - Set spending limits if available

## Alternative: Run Without Mistral

The system works perfectly without Mistral API:
- Uses intelligent template-based generation
- Calculates NPR automatically
- Provides risk assessment
- Gives actionable recommendations

**To disable Mistral entirely:**
- Simply don't set `MISTRAL_API_KEY`
- System will use template mode
- No API costs
- Instant generation

## Cost Optimization

**Tips to reduce API costs:**

1. **Generate selectively**
   - Uncheck "Generate AMDEC" if not needed
   - Only generate for important analyses

2. **Use smaller model**
   - Switch to `mistral-small-latest`
   - Faster and cheaper
   - Still good quality

3. **Batch processing**
   - Analyze multiple equipment together
   - One API call for all equipment

4. **Cache results**
   - Save generated AMDECs
   - Reuse for similar equipment

## Support

For Mistral AI issues:
- [Mistral Documentation](https://docs.mistral.ai/)
- [Mistral Discord](https://discord.gg/mistralai)
- [API Status](https://status.mistral.ai/)

For integration issues:
- Check Python logs in terminal
- Review `amdec_analyzer.py` code
- Test with sample data first
