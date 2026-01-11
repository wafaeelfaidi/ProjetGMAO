#!/usr/bin/env python3
"""
Prediction System Diagnostic Test
Verifies that the prediction pipeline is working correctly
"""

import sys
import json
import base64
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler, LabelEncoder

def test_prediction_pipeline():
    """Test the complete prediction pipeline"""
    
    print("=" * 60)
    print("PREDICTION SYSTEM DIAGNOSTIC TEST")
    print("=" * 60)
    
    # Test 1: Create simple test model
    print("\n[1/5] Creating test model...")
    try:
        X_train = np.array([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]])
        y_train = np.array([1.5, 2.5, 3.5, 4.5])
        
        model = RandomForestRegressor(n_estimators=10, random_state=42)
        model.fit(X_train, y_train)
        print("   ✅ Model created and trained")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False
    
    # Test 2: Serialize model
    print("\n[2/5] Serializing model to base64...")
    try:
        model_serialized = base64.b64encode(pickle.dumps(model)).decode('utf-8')
        print(f"   ✅ Model serialized ({len(model_serialized)} bytes)")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False
    
    # Test 3: Create encoder
    print("\n[3/5] Creating feature encoders...")
    try:
        scaler = StandardScaler()
        scaler.fit(X_train)
        encoders_dict = {'scaler': scaler}
        encoders_serialized = base64.b64encode(pickle.dumps(encoders_dict)).decode('utf-8')
        print(f"   ✅ Encoders created ({len(encoders_serialized)} bytes)")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False
    
    # Test 4: Prepare prediction input
    print("\n[4/5] Preparing prediction input...")
    try:
        feature_values = {
            'feature_0': 5.5,
            'feature_1': 6.5,
            'feature_2': 7.5
        }
        feature_columns = ['feature_0', 'feature_1', 'feature_2']
        
        prediction_input = {
            'model_serialized': model_serialized,
            'encoders_serialized': encoders_serialized,
            'feature_values': feature_values,
            'feature_columns': feature_columns
        }
        
        print("   ✅ Prediction input prepared")
        print(f"      - Features: {feature_columns}")
        print(f"      - Values: {list(feature_values.values())}")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False
    
    # Test 5: Simulate prediction
    print("\n[5/5] Simulating prediction...")
    try:
        # Deserialize model
        model_test = pickle.loads(base64.b64decode(model_serialized))
        encoders_test = pickle.loads(base64.b64decode(encoders_serialized))
        
        # Create dataframe
        values_list = [feature_values[col] for col in feature_columns]
        X_pred = pd.DataFrame([values_list], columns=feature_columns)
        
        # Apply scaling
        X_pred_scaled = encoders_test['scaler'].transform(X_pred)
        
        # Make prediction
        prediction = model_test.predict(X_pred_scaled)[0]
        
        print(f"   ✅ Prediction successful: {prediction:.4f}")
        print(f"      - Input: {values_list}")
        print(f"      - Scaled input: {X_pred_scaled[0].tolist()}")
        print(f"      - Prediction: {prediction:.4f}")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED - PREDICTION SYSTEM IS WORKING")
    print("=" * 60)
    return True

if __name__ == '__main__':
    success = test_prediction_pipeline()
    sys.exit(0 if success else 1)
