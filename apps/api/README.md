# Machine Prediction FastAPI Server

This is a FastAPI server for machine learning predictions using TensorFlow models.

## Setup

1. **Create and activate virtual environment** (if not already done):
   ```powershell
   # Windows PowerShell
   python -m venv env2
   .\env2\Scripts\Activate.ps1
   ```

2. **Install dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

## Running the Server

### Option 1: Using the startup script (Recommended)
```powershell
# Windows PowerShell
.\start_api.ps1

# Linux/Mac
chmod +x start_api.sh
./start_api.sh
```

### Option 2: Manual start
```powershell
# Activate environment
.\env2\Scripts\Activate.ps1

# Start server
python predict.py
```

### Option 3: Using uvicorn directly
```powershell
uvicorn predict:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

Once the server is running, you can access:

- **Health Check**: `GET http://localhost:8000/`
  - Returns server status and loaded models

- **All Predictions**: `GET http://localhost:8000/predictions/all`
  - Returns predictions for all data in the dataset

- **Single Prediction**: `POST http://localhost:8000/predict`
  - Body: `{"captors": [v1, v2, ..., v18]}`
  - Returns predictions for the given captor values

- **Interactive API Documentation**: `http://localhost:8000/docs`
  - Swagger UI for testing endpoints

- **Alternative API Documentation**: `http://localhost:8000/redoc`
  - ReDoc UI

## Integration with Next.js Frontend

The Next.js frontend in `apps/web/app/api/predictions/route.ts` now connects to this FastAPI server instead of spawning Python processes.

Make sure to:
1. Start the FastAPI server first
2. Set the `FASTAPI_URL` environment variable if not using default `http://localhost:8000`

Example `.env.local` in `apps/web`:
```
FASTAPI_URL=http://localhost:8000
```

## Testing

Test the API endpoints:

```powershell
# Health check
curl http://localhost:8000/

# Get all predictions
curl http://localhost:8000/predictions/all

# Single prediction
curl -X POST http://localhost:8000/predict `
  -H "Content-Type: application/json" `
  -d '{"captors": [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0]}'
```

## Environment Variables

- `FASTAPI_URL`: URL of the FastAPI server (used by Next.js frontend, default: `http://localhost:8000`)

## Notes

- Models are loaded on server startup for better performance
- The scaler is fitted on the full dataset during startup
- CORS is enabled for all origins (configure appropriately for production)
- Server runs on `0.0.0.0:8000` by default
