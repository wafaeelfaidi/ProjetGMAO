import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from fastapi import HTTPException
from pydantic import BaseModel

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AMDEC_PATH = os.path.join(BASE_DIR, "../../DATA/AMDEC.csv")


class ForecastResponse(BaseModel):
    machine: str
    predicted_date: str
    window_start: str
    window_end: str
    probability: float
    failure_type_probabilities: Dict[str, float]
    expected_downtime_hours: float
    expected_material_cost: float


class CalendarEvent(BaseModel):
    id: str
    title: str
    date: str
    probability_band: str  # low, medium, high, past
    machine: str
    event_type: str  # 'prediction' or 'historical'
    meta: Dict


def normalize_machine_name(machine: str) -> str:
    """Normalize machine designation to machine1, machine2, etc."""
    if not machine or pd.isna(machine):
        return None
    machine = str(machine).lower().strip()
    # Already in correct format
    if machine.startswith("machine"):
        return machine
    return machine


def parse_decimal_comma(value) -> Optional[float]:
    """Convert French decimal format (comma) to float"""
    if pd.isna(value) or value == '':
        return None
    try:
        if isinstance(value, str):
            value = value.replace(',', '.')
        return float(value)
    except (ValueError, TypeError):
        return None


def load_amdec_data() -> pd.DataFrame:
    """Load and normalize AMDEC data"""
    try:
        # Read with proper encoding and separator
        # Try multiple encodings to handle French characters
        encodings = ['latin-1', 'iso-8859-1', 'cp1252', 'utf-8']
        df = None
        
        for encoding in encodings:
            try:
                df = pd.read_csv(AMDEC_PATH, sep=';', encoding=encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if df is None:
            raise ValueError("Could not decode CSV file with any known encoding")
        
        # Column mapping from French to snake_case
        column_map = {
            'Type de panne': 'failure_type',
            'Durée arrêt (h)': 'downtime_hours',
            'Résumé intervention': 'intervention_summary',
            'Date intervention': 'intervention_date',
            'Désignation': 'machine',
            'Date demande': 'request_date',
            'Cause': 'cause',
            'Coût matériel': 'material_cost',
            'Organe': 'organ',
            '[Pièce].Désignation': 'part_designation',
            '[Pièce].Référence': 'part_reference',
            '[Pièce].Quantité': 'part_quantity',
            '[Pièce].Prix total': 'part_total_price'
        }
        
        df = df.rename(columns=column_map)
        
        # Parse dates with French format (dayfirst=True)
        df['intervention_date'] = pd.to_datetime(df['intervention_date'], dayfirst=True, errors='coerce')
        df['request_date'] = pd.to_datetime(df['request_date'], dayfirst=True, errors='coerce')
        
        # Convert numeric fields with comma decimal separator
        df['downtime_hours'] = df['downtime_hours'].apply(parse_decimal_comma)
        df['material_cost'] = df['material_cost'].apply(parse_decimal_comma)
        df['part_quantity'] = df['part_quantity'].apply(parse_decimal_comma)
        df['part_total_price'] = df['part_total_price'].apply(parse_decimal_comma)
        
        # Normalize machine names
        df['machine'] = df['machine'].apply(normalize_machine_name)
        
        # Remove rows with invalid intervention dates or machine names
        df = df.dropna(subset=['intervention_date', 'machine'])
        
        # Sort by machine and intervention date
        df = df.sort_values(['machine', 'intervention_date'])
        
        return df
        
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"AMDEC data file not found: {AMDEC_PATH}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading AMDEC data: {str(e)}")


def calculate_tbi_stats(machine_df: pd.DataFrame) -> Dict:
    """Calculate time-between-interventions statistics"""
    if len(machine_df) < 2:
        return {
            'mean': 30.0,
            'median': 30.0,
            'std': 7.0,
            'q25': 23.0,
            'q75': 37.0,
            'count': len(machine_df)
        }
    
    # Calculate TBI (time between interventions) in days
    dates = machine_df['intervention_date'].sort_values()
    tbis = dates.diff().dt.days.dropna()
    
    if len(tbis) == 0:
        return {
            'mean': 30.0,
            'median': 30.0,
            'std': 7.0,
            'q25': 23.0,
            'q75': 37.0,
            'count': len(machine_df)
        }
    
    return {
        'mean': tbis.mean(),
        'median': tbis.median(),
        'std': tbis.std() if len(tbis) > 1 else 7.0,
        'q25': tbis.quantile(0.25),
        'q75': tbis.quantile(0.75),
        'count': len(machine_df)
    }


def calculate_failure_type_probabilities(machine_df: pd.DataFrame, n_recent: int = 15) -> Dict[str, float]:
    """Calculate normalized probabilities for each failure type"""
    # Use recent interventions
    recent_df = machine_df.tail(n_recent)
    
    if len(recent_df) == 0:
        return {}
    
    # Count failure types
    failure_counts = recent_df['failure_type'].value_counts()
    
    # Normalize to probabilities
    total = failure_counts.sum()
    probabilities = (failure_counts / total).to_dict()
    
    return probabilities


def calculate_expected_metrics(machine_df: pd.DataFrame, failure_probs: Dict[str, float]) -> Dict:
    """Calculate expected downtime and cost based on failure type probabilities"""
    if len(machine_df) == 0 or not failure_probs:
        return {
            'expected_downtime_hours': 1.0,
            'expected_material_cost': 0.0
        }
    
    # Calculate weighted averages
    expected_downtime = 0.0
    expected_cost = 0.0
    
    for failure_type, prob in failure_probs.items():
        # Get recent interventions of this type
        type_df = machine_df[machine_df['failure_type'] == failure_type].tail(10)
        
        if len(type_df) > 0:
            # Mean downtime for this failure type
            mean_downtime = type_df['downtime_hours'].mean()
            if pd.notna(mean_downtime):
                expected_downtime += prob * mean_downtime
            
            # Mean cost for this failure type
            mean_cost = type_df['material_cost'].mean()
            if pd.notna(mean_cost):
                expected_cost += prob * mean_cost
    
    # Fallback to overall means if weighted calculation gives zero
    if expected_downtime == 0:
        expected_downtime = machine_df['downtime_hours'].mean()
        if pd.isna(expected_downtime):
            expected_downtime = 1.0
    
    if expected_cost == 0:
        expected_cost = machine_df['material_cost'].mean()
        if pd.isna(expected_cost):
            expected_cost = 0.0
    
    return {
        'expected_downtime_hours': float(expected_downtime),
        'expected_material_cost': float(expected_cost)
    }


def generate_forecast(machine: str, horizon_days: int = 60) -> Optional[ForecastResponse]:
    """Generate maintenance forecast for a specific machine (returns only the first/next prediction)"""
    forecasts = generate_multiple_forecasts(machine, horizon_days)
    return forecasts[0] if forecasts else None


def generate_multiple_forecasts(machine: str, horizon_days: int = 60) -> List[ForecastResponse]:
    """Generate multiple maintenance forecasts for a specific machine within the horizon period"""
    df = load_amdec_data()
    
    # Filter for specific machine
    machine_df = df[df['machine'] == machine].copy()
    
    if len(machine_df) == 0:
        return []
    
    # Get last intervention date from the data (not current time)
    # This ensures we predict from the last known intervention in March 2025
    last_date = machine_df['intervention_date'].max()
    
    # Calculate TBI statistics
    tbi_stats = calculate_tbi_stats(machine_df)
    
    # Determine expected TBI and probability
    if tbi_stats['count'] < 3:
        # Sparse data: use 30 days default
        tbi_days = 30.0
        base_probability = 0.5
    elif tbi_stats['count'] < 5:
        # Use mean with lower confidence
        tbi_days = tbi_stats['mean']
        base_probability = 0.6
    else:
        # Use median for better robustness
        tbi_days = tbi_stats['median']
        base_probability = 0.7
    
    # Calculate failure type probabilities (same for all predictions)
    failure_probs = calculate_failure_type_probabilities(machine_df)
    
    # Calculate expected metrics (same for all predictions)
    metrics = calculate_expected_metrics(machine_df, failure_probs)
    
    # Generate multiple predictions within horizon
    forecasts = []
    current_date = last_date
    prediction_num = 0
    
    while True:
        prediction_num += 1
        # Predict next intervention
        predicted_date = current_date + timedelta(days=tbi_days)
        
        # Check if prediction is within horizon
        if (predicted_date - last_date).days > horizon_days:
            break
        
        # Calculate probability window
        window_start = current_date + timedelta(days=tbi_stats['q25'])
        window_end = current_date + timedelta(days=tbi_stats['q75'])
        
        # If insufficient data, use ±7 days
        if tbi_stats['count'] < 3:
            window_start = predicted_date - timedelta(days=7)
            window_end = predicted_date + timedelta(days=7)
        
        # Decrease probability for future predictions (uncertainty increases)
        probability = base_probability * (0.95 ** (prediction_num - 1))
        probability = max(probability, 0.3)  # Minimum 30% probability
        
        forecasts.append(ForecastResponse(
            machine=machine,
            predicted_date=predicted_date.strftime('%Y-%m-%d'),
            window_start=window_start.strftime('%Y-%m-%d'),
            window_end=window_end.strftime('%Y-%m-%d'),
            probability=round(probability, 2),
            failure_type_probabilities={k: round(v, 3) for k, v in failure_probs.items()},
            expected_downtime_hours=round(metrics['expected_downtime_hours'], 2),
            expected_material_cost=round(metrics['expected_material_cost'], 2)
        ))
        
        # Move to next cycle
        current_date = predicted_date
    
    return forecasts


def generate_calendar_events(start_date: str, end_date: str, machine: Optional[str] = None) -> List[CalendarEvent]:
    """Generate calendar events for maintenance predictions and historical interventions"""
    df = load_amdec_data()
    
    # Parse date range
    try:
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Get unique machines
    machines = [machine] if machine else df['machine'].unique().tolist()
    
    events = []
    
    # Get the last intervention date across all machines to ensure predictions are only after this date
    last_intervention_date = df['intervention_date'].max()
    
    # Add historical interventions
    machine_filter = df['machine'] == machine if machine else df['machine'].isin(machines)
    historical_df = df[machine_filter].copy()
    
    for _, row in historical_df.iterrows():
        intervention_date = row['intervention_date']
        
        # Check if intervention falls within date range
        if pd.notna(intervention_date) and start <= intervention_date <= end:
            event = CalendarEvent(
                id=f"historical_{row['machine']}_{intervention_date.strftime('%Y-%m-%d')}_{_}",
                title=f"Intervention - {row['machine']}",
                date=intervention_date.strftime('%Y-%m-%d'),
                probability_band="past",
                machine=row['machine'],
                event_type="historical",
                meta={
                    "failure_type": row['failure_type'] if pd.notna(row['failure_type']) else 'N/A',
                    "downtime_hours": float(row['downtime_hours']) if pd.notna(row['downtime_hours']) else 0.0,
                    "material_cost": float(row['material_cost']) if pd.notna(row['material_cost']) else 0.0,
                    "cause": row['cause'] if pd.notna(row['cause']) else 'N/A',
                    "intervention_summary": row['intervention_summary'] if pd.notna(row['intervention_summary']) else 'N/A'
                }
            )
            events.append(event)
    
    # Add predictions
    for machine_name in machines:
        # Generate multiple forecasts for the horizon period
        forecasts = generate_multiple_forecasts(machine_name, horizon_days=(end - start).days)
        
        if not forecasts:
            continue
        
        # Add each forecast as a calendar event
        for idx, forecast in enumerate(forecasts):
            # Parse forecast dates
            pred_date = datetime.strptime(forecast.predicted_date, '%Y-%m-%d')
            
            # Only include predictions that are AFTER the last intervention date
            # This ensures we don't predict in the past or overlap with actual historical data
            if start <= pred_date <= end and pred_date > last_intervention_date:
                # Determine probability band
                if forecast.probability >= 0.7:
                    band = "high"
                elif forecast.probability >= 0.4:
                    band = "medium"
                else:
                    band = "low"
                
                event = CalendarEvent(
                    id=f"prediction_{machine_name}_{forecast.predicted_date}_{idx}",
                    title=f"Maintenance prévue - {machine_name}",
                    date=forecast.predicted_date,
                    probability_band=band,
                    machine=machine_name,
                    event_type="prediction",
                    meta={
                        "window_start": forecast.window_start,
                        "window_end": forecast.window_end,
                        "probability": forecast.probability,
                        "failure_type_probabilities": forecast.failure_type_probabilities,
                        "expected_downtime_hours": forecast.expected_downtime_hours,
                        "expected_material_cost": forecast.expected_material_cost
                    }
                )
                events.append(event)
    
    return events


def get_available_machines() -> List[str]:
    """Get list of available machines from AMDEC data"""
    try:
        df = load_amdec_data()
        return sorted(df['machine'].unique().tolist())
    except Exception:
        return []
