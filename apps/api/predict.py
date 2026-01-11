"""
Updated Prediction API with GRU Time Series Models
This module provides endpoints for machine breakdown predictions using trained GRU models.
"""

import os
import json
import pandas as pd
import numpy as np
import tensorflow as tf
from sklearn.preprocessing import StandardScaler
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from contextlib import asynccontextmanager
import uvicorn
import joblib

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
scaler = None
model_info = None
SEQ_LENGTH = 12  # Default, will be updated from model_info
_cached_df = None  # Cached raw data
_cached_features_df = None  # Cached data with features
_cached_scaled_X = None  # Cached scaled features
_cached_predictions = None  # Cached predictions for all machines

# Pydantic models
class PredictionInput(BaseModel):
    captors: List[float]  # 18 captor values

class PredictionResponse(BaseModel):
    predictions: Dict[str, float]
    risk_levels: Dict[str, str]
    success: bool
    message: Optional[str] = None

class BenchmarkResult(BaseModel):
    model: str
    machine: str
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    auc: float

class ModelInfoResponse(BaseModel):
    best_model_type: str
    seq_length: int
    machines: List[str]
    feature_count: int

def load_data():
    """Load and preprocess the main dataset"""
    df = pd.read_csv(DATA_PATH)
    df.columns = df.columns.str.strip()
    df['Time'] = pd.to_datetime(df['Time'])
    df = df.sort_values('Time').reset_index(drop=True)
    return df

def create_features(df):
    """Create time-based features matching training - optimized version"""
    feature_cols = [f'Captor {i}' for i in range(1, 19)]
    
    # Time features
    df = df.copy()
    df['hour'] = df['Time'].dt.hour
    df['day_of_week'] = df['Time'].dt.dayofweek
    df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
    
    # Pre-allocate all new columns using pd.concat for better performance
    new_cols = {}
    
    # Rolling statistics - vectorized
    window_sizes = [3, 6, 12]
    for col in feature_cols:
        col_data = df[col]
        for window in window_sizes:
            new_cols[f'{col}_rolling_mean_{window}'] = col_data.rolling(window=window, min_periods=1).mean()
            new_cols[f'{col}_rolling_std_{window}'] = col_data.rolling(window=window, min_periods=1).std().fillna(0)
    
    # Lag features for key captors
    key_captors = ['Captor 1', 'Captor 3', 'Captor 8']
    for col in key_captors:
        col_data = df[col]
        for lag in [1, 2, 3]:
            new_cols[f'{col}_lag_{lag}'] = col_data.shift(lag).bfill()
    
    # Concatenate all new columns at once
    new_df = pd.concat([df, pd.DataFrame(new_cols, index=df.index)], axis=1)
    
    return new_df

def get_cached_data():
    """Get cached data with features, loading/creating if necessary"""
    global _cached_df, _cached_features_df, _cached_scaled_X
    
    if _cached_features_df is not None and _cached_scaled_X is not None:
        return _cached_features_df, _cached_scaled_X
    
    # Load and process data
    print("Loading data...")
    df = load_data()
    print("Creating features...")
    df = create_features(df)
    
    # Get feature columns
    feature_cols = model_info['feature_cols'] if model_info else [f'Captor {i}' for i in range(1, 19)]
    available_cols = [col for col in feature_cols if col in df.columns]
    
    X = df[available_cols].values
    X_scaled = scaler.transform(X)
    
    # Cache the results
    _cached_features_df = df
    _cached_scaled_X = X_scaled
    
    return df, X_scaled

def get_cached_predictions():
    """Get cached predictions, computing if necessary"""
    global _cached_predictions
    
    if _cached_predictions is not None:
        return _cached_predictions
    
    df, X_scaled = get_cached_data()
    machines = ['Machine 1', 'Machine 2', 'Machine 3']
    n_samples = len(df)
    
    # Initialize predictions dict
    predictions = {machine: np.zeros(n_samples) for machine in machines}
    
    # Build all sequences at once for batch prediction
    print("Computing predictions...")
    valid_indices = list(range(SEQ_LENGTH - 1, n_samples))
    
    if valid_indices:
        # Create batch of sequences
        sequences = np.array([
            X_scaled[idx - SEQ_LENGTH + 1:idx + 1] 
            for idx in valid_indices
        ])
        
        # Batch predict for each machine
        for machine, model in loaded_models.items():
            try:
                batch_preds = model.predict(sequences, verbose=0, batch_size=64).flatten()
                for i, idx in enumerate(valid_indices):
                    predictions[machine][idx] = float(batch_preds[i])
            except Exception as e:
                print(f"Error batch predicting {machine}: {e}")
    
    _cached_predictions = predictions
    print("Predictions cached")
    return predictions

def get_risk_level(probability: float) -> str:
    """Convert probability to risk level"""
    if probability >= 0.7:
        return "High"
    elif probability >= 0.4:
        return "Medium"
    return "Low"

def get_risk_color(probability: float) -> str:
    """Get color based on risk level"""
    if probability >= 0.7:
        return "#ef4444"  # Red
    elif probability >= 0.4:
        return "#f59e0b"  # Orange
    return "#22c55e"  # Green

def load_models():
    """Load GRU models and configuration"""
    global scaler, model_info, SEQ_LENGTH
    
    models = {}
    
    # Load model info
    model_info_path = os.path.join(MODELS_DIR, "model_info.json")
    if os.path.exists(model_info_path):
        with open(model_info_path, 'r') as f:
            model_info = json.load(f)
            SEQ_LENGTH = model_info.get('seq_length', 12)
            print(f"Loaded model info: {model_info['best_model_type']} with seq_length={SEQ_LENGTH}")
    
    # Load scaler
    scaler_path = os.path.join(MODELS_DIR, "feature_scaler.joblib")
    if os.path.exists(scaler_path):
        scaler = joblib.load(scaler_path)
        print("Loaded feature scaler")
    
    # Load GRU models for each machine
    machines = ['Machine 1', 'Machine 2', 'Machine 3']
    for machine in machines:
        safe_name = machine.replace(' ', '_').lower()
        model_path = os.path.join(MODELS_DIR, f"best_{safe_name}_model.keras")
        
        if os.path.exists(model_path):
            try:
                models[machine] = tf.keras.models.load_model(model_path)
                print(f"Loaded GRU model for {machine}")
            except Exception as e:
                print(f"Error loading {machine} model: {e}")
                # Fallback to old model
                old_model_path = os.path.join(MODELS_DIR, f"machine_{machine[-1]}_model.h5")
                if os.path.exists(old_model_path):
                    models[machine] = tf.keras.models.load_model(old_model_path)
                    print(f"Loaded fallback model for {machine}")
        else:
            # Try old model format
            old_model_path = os.path.join(MODELS_DIR, f"machine_{machine[-1]}_model.h5")
            if os.path.exists(old_model_path):
                models[machine] = tf.keras.models.load_model(old_model_path)
                print(f"Loaded old model for {machine}")
    
    return models

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    global loaded_models, scaler, _cached_df, _cached_features_df, _cached_scaled_X
    try:
        loaded_models = load_models()
        print(f"Loaded {len(loaded_models)} models successfully")
        
        # If scaler wasn't loaded from file, fit it on data
        if scaler is None:
            print("Warning: Scaler not loaded from file, fitting on data...")
            df = load_data()
            df = create_features(df)
            feature_cols = model_info['feature_cols'] if model_info else [f'Captor {i}' for i in range(1, 19)]
            available_cols = [col for col in feature_cols if col in df.columns]
            X = df[available_cols].values
            scaler = StandardScaler()
            scaler.fit(X)
            print("Fitted scaler on data")
        
        # Pre-cache data at startup for faster requests
        print("Pre-caching data...")
        get_cached_data()
        print("Data cached successfully")
        
        # Pre-cache predictions at startup
        print("Pre-computing predictions (this may take a moment)...")
        get_cached_predictions()
        print("Predictions cached successfully")
        
    except Exception as e:
        print(f"Error during startup: {e}")
    
    yield
    print("Shutting down...")

# Initialize FastAPI app with lifespan
app = FastAPI(
    title="Machine Breakdown Prediction API", 
    version="2.0.0",
    description="API for predicting machine breakdowns using GRU time series models",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        "models": list(loaded_models.keys()),
        "model_type": model_info.get('best_model_type', 'Unknown') if model_info else 'Legacy',
        "version": "2.0.0"
    }

@app.get("/model-info")
async def get_model_info():
    """Get information about loaded models"""
    if not model_info:
        raise HTTPException(status_code=503, detail="Model info not available")
    
    return {
        "best_model_type": model_info['best_model_type'],
        "seq_length": model_info['seq_length'],
        "machines": model_info['machines'],
        "feature_count": len(model_info['feature_cols'])
    }

@app.get("/benchmark")
async def get_benchmark_results():
    """Get benchmark results for all models"""
    if not model_info or 'benchmark_results' not in model_info:
        raise HTTPException(status_code=503, detail="Benchmark results not available")
    
    return {
        "success": True,
        "best_model": model_info['best_model_type'],
        "results": model_info['benchmark_results']
    }

@app.get("/predictions/all")
async def get_all_predictions():
    """Get predictions for all data in the dataset with time series features"""
    try:
        if not loaded_models:
            raise HTTPException(status_code=503, detail="Models not loaded")
        
        # Use cached data and predictions
        df, _ = get_cached_data()
        predictions = get_cached_predictions()
        
        results = []
        machines = ['Machine 1', 'Machine 2', 'Machine 3']
        
        for idx in range(len(df)):
            row = df.iloc[idx]
            item = {
                "Time": row["Time"].isoformat() if hasattr(row["Time"], 'isoformat') else str(row["Time"]),
                "id": int(idx)
            }
            
            # Add captor values
            for i in range(1, 19):
                item[f'Captor {i}'] = float(row[f'Captor {i}'])
            
            # Add actual values
            for machine in machines:
                if machine in df.columns:
                    item[machine] = int(row[machine])
            
            # Use cached predictions
            if idx >= SEQ_LENGTH - 1:
                for machine in machines:
                    pred = predictions[machine][idx]
                    item[f"{machine}_Prediction"] = pred
                    item[f"{machine}_Risk"] = get_risk_level(pred)
                    item[f"{machine}_RiskColor"] = get_risk_color(pred)
            else:
                # Not enough history for prediction
                for machine in machines:
                    item[f"{machine}_Prediction"] = 0.0
                    item[f"{machine}_Risk"] = "Insufficient Data"
                    item[f"{machine}_RiskColor"] = "#6b7280"
            
            results.append(item)
        
        return {"success": True, "data": results, "count": len(results)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predictions/latest")
async def get_latest_predictions(count: int = Query(50, ge=1, le=500)):
    """Get predictions for the most recent data points"""
    try:
        if not loaded_models:
            raise HTTPException(status_code=503, detail="Models not loaded")
        
        # Use cached data and predictions
        df, _ = get_cached_data()
        predictions = get_cached_predictions()
        
        results = []
        machines = ['Machine 1', 'Machine 2', 'Machine 3']
        
        # Get the last 'count' rows
        start_idx = max(SEQ_LENGTH - 1, len(df) - count)
        
        for idx in range(start_idx, len(df)):
            row = df.iloc[idx]
            item = {
                "Time": row["Time"].isoformat() if hasattr(row["Time"], 'isoformat') else str(row["Time"]),
                "id": int(idx)
            }
            
            # Add captor values
            for i in range(1, 19):
                item[f'Captor {i}'] = float(row[f'Captor {i}'])
            
            # Add actual values
            for machine in machines:
                if machine in df.columns:
                    item[machine] = int(row[machine])
            
            # Use cached predictions
            for machine in machines:
                pred = predictions[machine][idx]
                item[f"{machine}_Prediction"] = pred
                item[f"{machine}_Risk"] = get_risk_level(pred)
                item[f"{machine}_RiskColor"] = get_risk_color(pred)
            
            results.append(item)
        
        # Summary stats
        summary = {}
        for machine in machines:
            preds = [r[f"{machine}_Prediction"] for r in results]
            summary[machine] = {
                "avg_risk": float(np.mean(preds)),
                "max_risk": float(np.max(preds)),
                "high_risk_count": sum(1 for p in preds if p >= 0.7),
                "medium_risk_count": sum(1 for p in preds if 0.4 <= p < 0.7),
                "low_risk_count": sum(1 for p in preds if p < 0.4)
            }
        
        return {
            "success": True, 
            "data": results, 
            "count": len(results),
            "summary": summary
        }
        
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
        
        # For single prediction, we need historical context
        # Use cached data
        df, _ = get_cached_data()
        
        feature_cols = model_info['feature_cols'] if model_info else [f'Captor {i}' for i in range(1, 19)]
        available_cols = [col for col in feature_cols if col in df.columns]
        
        # Get last SEQ_LENGTH-1 rows and add new data
        X_history = df[available_cols].iloc[-(SEQ_LENGTH-1):].values
        
        # Create features for the new input
        new_row = {f'Captor {i}': input_data.captors[i-1] for i in range(1, 19)}
        new_row['hour'] = df['hour'].iloc[-1]  # Use same hour as last data point
        new_row['day_of_week'] = df['day_of_week'].iloc[-1]
        new_row['is_weekend'] = df['is_weekend'].iloc[-1]
        
        # Add rolling features (approximate with last known values)
        for col in available_cols:
            if col not in new_row:
                new_row[col] = df[col].iloc[-1]
        
        X_new = np.array([[new_row.get(col, 0) for col in available_cols]])
        X_combined = np.vstack([X_history, X_new])
        X_scaled = scaler.transform(X_combined)
        X_seq = X_scaled.reshape(1, SEQ_LENGTH, -1)
        
        # Make predictions
        predictions = {}
        risk_levels = {}
        
        for machine, model in loaded_models.items():
            pred = model.predict(X_seq, verbose=0)[0][0]
            pred = float(pred)
            predictions[machine] = pred
            risk_levels[machine] = get_risk_level(pred)
        
        return PredictionResponse(
            success=True,
            predictions=predictions,
            risk_levels=risk_levels,
            message="Prediction completed using GRU time series model"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predictions/trend")
async def get_prediction_trend(hours: int = Query(48, ge=1, le=168)):
    """Get prediction trend over time for trend analysis"""
    try:
        if not loaded_models:
            raise HTTPException(status_code=503, detail="Models not loaded")
        
        # Use cached data and predictions
        df, _ = get_cached_data()
        predictions = get_cached_predictions()
        
        # Calculate number of data points (2-hour intervals)
        num_points = hours // 2
        start_idx = max(SEQ_LENGTH - 1, len(df) - num_points)
        
        machines = ['Machine 1', 'Machine 2', 'Machine 3']
        trends = {machine: [] for machine in machines}
        times = []
        
        for idx in range(start_idx, len(df)):
            row = df.iloc[idx]
            times.append(row['Time'].isoformat() if hasattr(row['Time'], 'isoformat') else str(row['Time']))
            
            for machine in machines:
                trends[machine].append(float(predictions[machine][idx]))
        
        return {
            "success": True,
            "times": times,
            "trends": trends,
            "period_hours": hours
        }
        
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
