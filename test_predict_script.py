#!/usr/bin/env python3
"""
Test script to verify predict.py can be called independently
"""

import json
import subprocess
import sys
import base64
import pickle
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler

# Create test model
X_train = np.array([[1, 2], [2, 3], [3, 4], [4, 5], [5, 6]])
y_train = np.array([1.0, 2.0, 3.0, 4.0, 5.0])

model = RandomForestRegressor(n_estimators=5, random_state=42)
model.fit(X_train, y_train)

scaler = StandardScaler()
scaler.fit(X_train)

# Serialize
model_serialized = base64.b64encode(pickle.dumps(model)).decode('utf-8')
encoders_serialized = base64.b64encode(pickle.dumps({'scaler': scaler})).decode('utf-8')

# Create prediction input
prediction_input = {
    'model_serialized': model_serialized,
    'encoders_serialized': encoders_serialized,
    'feature_values': {'feature1': 3.0, 'feature2': 4.0},
    'feature_columns': ['feature1', 'feature2']
}

# Run predict.py
print("Testing predict.py script...")
print("-" * 50)

try:
    python_path = r"C:\Users\pc\Desktop\Expertise\Project_GMAO\env\Scripts\python.exe"
    script_path = r"C:\Users\pc\Desktop\Expertise\Project_GMAO\apps\web\public\ml\predict.py"
    
    process = subprocess.Popen(
        [python_path, script_path],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    stdout, stderr = process.communicate(
        input=json.dumps(prediction_input),
        timeout=10
    )
    
    if process.returncode == 0:
        result = json.loads(stdout)
        print("✅ predict.py executed successfully")
        print(f"   Result: {json.dumps(result, indent=2)}")
    else:
        print(f"❌ predict.py failed with return code {process.returncode}")
        print(f"   stderr: {stderr}")
        
except Exception as e:
    print(f"❌ Error running predict.py: {e}")

print("-" * 50)
