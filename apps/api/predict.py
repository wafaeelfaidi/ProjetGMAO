import os
import json
import pandas as pd
import numpy as np
import tensorflow as tf
from sklearn.preprocessing import StandardScaler
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
from contextlib import asynccontextmanager
import uvicorn

# Import maintenance module
from maintenance import (
    generate_forecast,
    generate_calendar_events,
    get_available_machines,
    ForecastResponse,
    CalendarEvent
)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "../../DATA/Final copy.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Global variables for models and scaler
loaded_models = {}
scaler = StandardScaler()

# Pydantic models
class PredictionInput(BaseModel):
    captors: List[float]  # 18 captor values

class PredictionResponse(BaseModel):
    predictions: Dict[str, float]
    success: bool
    message: Optional[str] = None

def load_data():
    df = pd.read_csv(DATA_PATH)
    # Ensure columns are stripped of whitespace
    df.columns = df.columns.str.strip()
    return df

def preprocess_data(df):
    # Extract features (Captor 1 to Captor 18)
    # Assuming columns are named "Captor 1", "Captor 2", ...
    feature_cols = [f"Captor {i}" for i in range(1, 19)]
    
    # Check if columns exist
    missing_cols = [col for col in feature_cols if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing columns: {missing_cols}")
        
    X = df[feature_cols].values
    
    # Scale data
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    return X_scaled, feature_cols

def load_models():
    """Load all machine learning models on startup"""
    models = {}
    for i in range(1, 4):
        model_path = os.path.join(MODELS_DIR, f"machine_{i}_model.h5")
        if os.path.exists(model_path):
            try:
                models[f"Machine {i}"] = tf.keras.models.load_model(model_path)
                print(f"Loaded model: machine_{i}_model.h5")
            except Exception as e:
                print(f"Error loading machine_{i}_model.h5: {e}")
    return models

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    # Startup
    global loaded_models, scaler
    try:
        # Load models
        loaded_models = load_models()
        print(f"Loaded {len(loaded_models)} models successfully")
        
        # Load data and fit scaler
        df = load_data()
        feature_cols = [f"Captor {i}" for i in range(1, 19)]
        X = df[feature_cols].values
        scaler.fit(X)
        print("Scaler fitted successfully")
    except Exception as e:
        print(f"Error during startup: {e}")
    
    yield
    
    # Shutdown
    print("Shutting down...")

# Initialize FastAPI app with lifespan
app = FastAPI(title="Machine Prediction API", version="1.0.0", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "models_loaded": len(loaded_models),
        "models": list(loaded_models.keys())
    }

@app.get("/predictions/all")
async def get_all_predictions():
    """Get predictions for all data in the dataset"""
    try:
        df = load_data()
        X_scaled, feature_cols = preprocess_data(df)
        
        if not loaded_models:
            raise HTTPException(status_code=503, detail="Models not loaded")
        
        results = []
        
        # Make predictions
        predictions = {}
        for machine_name, model in loaded_models.items():
            preds = model.predict(X_scaled, verbose=0)
            predictions[f"{machine_name}_Prediction"] = preds.flatten().tolist()
            
        # Construct result list
        for idx, row in df.iterrows():
            item = {
                "Time": row["Time"],
                "id": int(idx)
            }
            # Add features
            for col in feature_cols:
                item[col] = float(row[col])
            
            # Add actuals
            for i in range(1, 4):
                machine_col = f"Machine {i}"
                if machine_col in df.columns:
                    item[machine_col] = int(row[machine_col])
            
            # Add predictions
            for machine_name in loaded_models.keys():
                pred_key = f"{machine_name}_Prediction"
                if pred_key in predictions:
                    item[pred_key] = float(predictions[pred_key][idx])
            
            results.append(item)
            
        return {"success": True, "data": results, "count": len(results)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict")
async def predict_single(input_data: PredictionInput):
    """Make prediction for a single set of captor values"""
    try:
        if not loaded_models:
            raise HTTPException(status_code=503, detail="Models not loaded")
        
        if len(input_data.captors) != 18:
            raise HTTPException(
                status_code=400, 
                detail=f"Expected 18 captor values, got {len(input_data.captors)}"
            )
        
        # Prepare input
        X = np.array([input_data.captors])
        X_scaled = scaler.transform(X)
        
        # Make predictions
        predictions = {}
        for machine_name, model in loaded_models.items():
            pred = model.predict(X_scaled, verbose=0)
            predictions[machine_name] = float(pred[0][0])
        
        return PredictionResponse(
            success=True,
            predictions=predictions,
            message="Prediction completed successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Maintenance endpoints
@app.get("/maintenance/machines")
async def get_machines():
    """Get list of available machines"""
    try:
        machines = get_available_machines()
        return {"success": True, "machines": machines}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/maintenance/forecast", response_model=List[ForecastResponse])
async def get_maintenance_forecast(
    horizon_days: int = Query(60, ge=7, le=365),
    machine: Optional[str] = Query(None)
):
    """Get maintenance forecast for specified machine(s)"""
    try:
        from maintenance import generate_multiple_forecasts
        
        machines = [machine] if machine else get_available_machines()
        forecasts = []
        
        for machine_name in machines:
            machine_forecasts = generate_multiple_forecasts(machine_name, horizon_days)
            forecasts.extend(machine_forecasts)
        
        return forecasts
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/maintenance/calendar", response_model=List[CalendarEvent])
async def get_maintenance_calendar(
    start: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end: str = Query(..., description="End date (YYYY-MM-DD)"),
    machine: Optional[str] = Query(None, description="Filter by machine")
):
    """Get calendar events for maintenance predictions"""
    try:
        events = generate_calendar_events(start, end, machine)
        return events
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("predict:app", host="0.0.0.0", port=8000, reload=True)
