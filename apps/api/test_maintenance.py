"""
Basic unit tests for maintenance forecasting module
"""
from datetime import datetime
import pandas as pd
from maintenance import (
    normalize_machine_name,
    parse_decimal_comma,
    load_amdec_data,
    calculate_tbi_stats,
    calculate_failure_type_probabilities,
    generate_forecast
)


def test_normalize_machine_name():
    """Test machine name normalization"""
    assert normalize_machine_name("machine1") == "machine1"
    assert normalize_machine_name("Machine1") == "machine1"
    assert normalize_machine_name("  machine2  ") == "machine2"
    assert normalize_machine_name(None) is None
    

def test_parse_decimal_comma():
    """Test decimal comma parsing"""
    assert parse_decimal_comma("1,5") == 1.5
    assert parse_decimal_comma("10,25") == 10.25
    assert parse_decimal_comma("100") == 100.0
    assert parse_decimal_comma("") is None
    assert parse_decimal_comma(None) is None


def test_load_amdec_data():
    """Test AMDEC data loading and parsing"""
    try:
        df = load_amdec_data()
        
        # Check that data was loaded
        assert len(df) > 0, "AMDEC data should not be empty"
        
        # Check required columns exist
        required_cols = ['machine', 'intervention_date', 'failure_type', 'downtime_hours']
        for col in required_cols:
            assert col in df.columns, f"Column {col} should exist"
        
        # Check date parsing worked
        assert pd.api.types.is_datetime64_any_dtype(df['intervention_date'])
        
        # Check machine names are normalized
        assert all(df['machine'].str.startswith('machine'))
        
        print(f"✓ Successfully loaded {len(df)} AMDEC records")
        print(f"✓ Machines: {df['machine'].unique().tolist()}")
        
    except Exception as e:
        raise AssertionError(f"Failed to load AMDEC data: {e}")


def test_calculate_tbi_stats():
    """Test TBI statistics calculation"""
    # Create sample data
    dates = pd.date_range('2025-01-01', periods=10, freq='7D')
    df = pd.DataFrame({
        'intervention_date': dates,
        'machine': ['machine1'] * 10,
        'failure_type': ['Hydraulique'] * 10
    })
    
    stats = calculate_tbi_stats(df)
    
    assert 'mean' in stats
    assert 'median' in stats
    assert 'count' in stats
    assert stats['count'] == 10
    # With 7-day intervals, TBI should be around 7
    assert 6 <= stats['median'] <= 8


def test_calculate_failure_type_probabilities():
    """Test failure type probability calculation"""
    df = pd.DataFrame({
        'failure_type': ['Hydraulique', 'Hydraulique', 'Mécanique', 'Électrique'] * 5
    })
    
    probs = calculate_failure_type_probabilities(df)
    
    assert len(probs) == 3  # 3 unique failure types
    assert 'Hydraulique' in probs
    assert 'Mécanique' in probs
    assert 'Électrique' in probs
    
    # Check probabilities sum to approximately 1
    total = sum(probs.values())
    assert 0.99 <= total <= 1.01


def test_generate_forecast():
    """Test forecast generation for real machines"""
    try:
        # Try to generate forecast for machine1
        forecast = generate_forecast('machine1', horizon_days=60)
        
        if forecast:
            assert forecast.machine == 'machine1'
            assert isinstance(forecast.predicted_date, str)
            assert 0 <= forecast.probability <= 1
            assert isinstance(forecast.failure_type_probabilities, dict)
            assert forecast.expected_downtime_hours >= 0
            assert forecast.expected_material_cost >= 0
            
            print(f"✓ Forecast for machine1:")
            print(f"  - Predicted date: {forecast.predicted_date}")
            print(f"  - Probability: {forecast.probability}")
            print(f"  - Expected downtime: {forecast.expected_downtime_hours}h")
            print(f"  - Expected cost: €{forecast.expected_material_cost}")
        else:
            print("⚠ No forecast available for machine1 (insufficient data)")
            
    except Exception as e:
        raise AssertionError(f"Failed to generate forecast: {e}")


if __name__ == "__main__":
    # Run tests
    print("Testing maintenance forecasting module...")
    print("=" * 60)
    
    test_normalize_machine_name()
    print("✓ Machine name normalization tests passed")
    
    test_parse_decimal_comma()
    print("✓ Decimal comma parsing tests passed")
    
    test_load_amdec_data()
    
    test_calculate_tbi_stats()
    print("✓ TBI statistics tests passed")
    
    test_calculate_failure_type_probabilities()
    print("✓ Failure type probability tests passed")
    
    test_generate_forecast()
    
    print("=" * 60)
    print("All tests completed!")
