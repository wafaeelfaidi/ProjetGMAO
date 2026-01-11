#!/usr/bin/env python3
"""
AMDEC Analyzer - Calculate failure statistics per equipment
"""

import json
import sys
import io
import warnings
from typing import Dict, List, Any
from datetime import datetime
from collections import defaultdict

warnings.filterwarnings('ignore')

# Force UTF-8
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import pandas as pd
import numpy as np
import os
import requests


def parse_french_date(date_str):
    """Parse French date format DD/MM/YYYY"""
    try:
        return pd.to_datetime(date_str, dayfirst=True)
    except:
        return pd.to_datetime(date_str)


def analyze_equipment(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Analyze by EQUIPMENT + FAILURE MODE (each unique combination)
    
    For each unique equipment + failure mode combination:
    - Total occurrences
    - Frequency (occurrences per month)
    - Average cost
    - Total cost
    """
    
    print(f"[AMDEC] analyze_equipment() called with {len(df)} rows", file=sys.stderr)
    
    # Normalize column names (try to find the right columns)
    col_map = {}
    
    # Find equipment column
    for col in df.columns:
        col_lower = col.lower().strip()
        if any(x in col_lower for x in ['equipment', 'équipement', 'equipement', 'machine', 'désignation', 'designation']):
            col_map['equipment'] = col
            print(f"[AMDEC] Found equipment column: {col}", file=sys.stderr)
            break
    
    # Find date column
    for col in df.columns:
        col_lower = col.lower().strip()
        if any(x in col_lower for x in ['date', 'intervention']):
            col_map['date'] = col
            print(f"[AMDEC] Found date column: {col}", file=sys.stderr)
            break
    
    # Find failure mode column
    for col in df.columns:
        col_lower = col.lower().strip()
        if any(x in col_lower for x in ['mode', 'défaillance', 'defaillance', 'panne', 'type']):
            col_map['failure_mode'] = col
            print(f"[AMDEC] Found failure_mode column: {col}", file=sys.stderr)
            break
    
    # Find cost column
    for col in df.columns:
        col_lower = col.lower().strip()
        if any(x in col_lower for x in ['cost', 'coût', 'cout', 'prix', 'montant']):
            col_map['cost'] = col
            print(f"[AMDEC] Found cost column: {col}", file=sys.stderr)
            break
    
    print(f"[AMDEC] Column mapping: {col_map}", file=sys.stderr)
    
    if 'equipment' not in col_map or 'failure_mode' not in col_map:
        raise ValueError(f"Equipment or Failure mode column not found. Available columns: {df.columns.tolist()}")
    
    # Parse dates if available
    if 'date' in col_map:
        print(f"[AMDEC] Parsing dates in column: {col_map['date']}", file=sys.stderr)
        try:
            df[col_map['date']] = df[col_map['date']].apply(parse_french_date)
            df = df.dropna(subset=[col_map['date']])
            df = df.sort_values(col_map['date'])
            print(f"[AMDEC] Date parsing successful, {len(df)} rows remain", file=sys.stderr)
        except Exception as e:
            print(f"[AMDEC] Date parsing warning: {str(e)}", file=sys.stderr)
    
    # Convert cost to numeric
    if 'cost' in col_map:
        print(f"[AMDEC] Converting cost column: {col_map['cost']}", file=sys.stderr)
        try:
            # Handle French decimal format (comma)
            if df[col_map['cost']].dtype == 'object':
                df[col_map['cost']] = df[col_map['cost']].astype(str).str.replace(',', '.').str.replace(' ', '')
            df[col_map['cost']] = pd.to_numeric(df[col_map['cost']], errors='coerce')
            df[col_map['cost']].fillna(0, inplace=True)
            print(f"[AMDEC] Cost conversion successful", file=sys.stderr)
        except Exception as e:
            print(f"[AMDEC] Cost conversion warning: {str(e)}", file=sys.stderr)
    
    # Group by EQUIPMENT + FAILURE MODE (unique combinations, no duplicates)
    print(f"[AMDEC] Grouping by equipment AND failure mode...", file=sys.stderr)
    equipment_failure_stats = []
    
    # Calculate overall date range for frequency calculation
    if 'date' in col_map:
        try:
            date_range_days = (df[col_map['date']].max() - df[col_map['date']].min()).days
            total_months = max(date_range_days / 30, 1)
        except:
            total_months = 1
    else:
        total_months = 1
    
    print(f"[AMDEC] Total time range: {total_months:.2f} months", file=sys.stderr)
    
    try:
        # Group by both equipment AND failure_mode
        for (equipment, failure_mode), group in df.groupby([col_map['equipment'], col_map['failure_mode']]):
            equipment = str(equipment)
            failure_mode = str(failure_mode)
            
            # Skip NaN or empty
            if equipment.lower() in ['nan', 'none', ''] or failure_mode.lower() in ['nan', 'none', '']:
                continue
            
            print(f"[AMDEC] Processing: {equipment} - {failure_mode} ({len(group)} occurrences)", file=sys.stderr)
            
            # Total occurrences for this combination
            total_occurrences = len(group)
            
            # Frequency per month
            failure_frequency = total_occurrences / total_months
            
            # Cost statistics
            if 'cost' in col_map:
                total_cost = float(group[col_map['cost']].sum())
                average_cost = float(group[col_map['cost']].mean())
            else:
                total_cost = 0.0
                average_cost = 0.0
            
            equipment_failure_stats.append({
                'equipment': equipment,
                'failure_mode': failure_mode,
                'total_occurrences': int(total_occurrences),
                'failure_frequency': float(failure_frequency),
                'average_cost': average_cost,
                'total_cost': total_cost
            })
        
        # Sort by equipment, then by total occurrences (descending)
        equipment_failure_stats.sort(key=lambda x: (x['equipment'], -x['total_occurrences']))
        
        print(f"[AMDEC] Successfully analyzed {len(equipment_failure_stats)} equipment-failure combinations", file=sys.stderr)
        return equipment_failure_stats
    
    except Exception as e:
        print(f"[AMDEC] Error in failure mode grouping: {str(e)}", file=sys.stderr)
        raise


def generate_amdec_for_machine(machine_name: str, machine_stats: List[Dict[str, Any]]) -> str:
    """
    Generate AMDEC document for a specific machine using Mistral AI API
    """
    print(f"[AMDEC] Generating AMDEC for machine: {machine_name}", file=sys.stderr)
    
    # Build data summary for this machine
    data_summary = ""
    for stat in machine_stats:
        data_summary += f"- Mode de défaillance: {stat['failure_mode']} | "
        data_summary += f"Fréquence: {stat['total_occurrences']} occurrences ({stat['failure_frequency']:.2f}/mois) | "
        data_summary += f"Coût moyen: {stat['average_cost']:.2f} DH\n"
    
    # Try to use Mistral API
    api_key = os.getenv('MISTRAL_API_KEY')
    
    if api_key:
        try:
            print(f"[AMDEC] Using Mistral API for machine {machine_name}...", file=sys.stderr)
            
            prompt = f"""Vous êtes expert maintenance AMDEC.
Générez tableau AMDEC HTML, sans texte introductif.
Données : liste de modes de défaillance, fréquence d'occurrence et coût pour la machine {machine_name}.

Pour chaque ligne du tableau :
- Remplissez les colonnes "Criticité (F × G × D)" avec valeurs réalistes entre 1 et 5 en fonction de fréquence et coût de la défaillance et calcule le total 
- Proposez action corrective ou préventive simple et logique
- Respectez la structure HTML complète du tableau :

<table>
<thead>
    <tr>
    <th>Composant</th>
    <th>Mode de défaillance</th>
    <th>Effets potentiels</th>
    <th>Causes potentiels</th>
    <th>Criticité (F × G × D)</th>
    <th>Actions correctives/préventives</th>
    </tr>
</thead>
<tbody>
    <!-- lignes ici -->
</tbody>
</table>

Données machine : {machine_name}

--- DÉBUT DES DONNÉES ---

{data_summary}"""

            response = requests.post(
                'https://api.mistral.ai/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'mistral-large-latest',
                    'messages': [
                        {
                            'role': 'user',
                            'content': prompt
                        }
                    ],
                    'temperature': 0.3,
                    'max_tokens': 2000
                },
                timeout=90
            )
            
            if response.status_code == 200:
                result = response.json()
                amdec_doc = result['choices'][0]['message']['content']
                print(f"[AMDEC] Mistral API successful", file=sys.stderr)
                return amdec_doc
            else:
                print(f"[AMDEC] Mistral API error: {response.status_code}", file=sys.stderr)
                print(f"[AMDEC] Response: {response.text}", file=sys.stderr)
        
        except Exception as e:
            print(f"[AMDEC] Mistral API exception: {str(e)}", file=sys.stderr)
    else:
        print(f"[AMDEC] No MISTRAL_API_KEY found", file=sys.stderr)
        return f"<p>AMDEC generation requires MISTRAL_API_KEY. Please configure the API key.</p>"


def main():
    try:
        # Read input
        print(f"[AMDEC] Starting...", file=sys.stderr)
        request_data = json.loads(sys.stdin.read())
        csv_path = request_data['csv_path']
        generate_amdec = request_data.get('generate_amdec', False)
        selected_machines = request_data.get('selected_machines', [])
        
        print(f"[AMDEC] Generate AMDEC: {generate_amdec}", file=sys.stderr)
        print(f"[AMDEC] Selected Machines Received: {selected_machines}", file=sys.stderr)
        print(f"[AMDEC] Selected Machines Count: {len(selected_machines) if selected_machines else 0}", file=sys.stderr)
        print(f"[AMDEC] Selected Machines Type: {type(selected_machines)}", file=sys.stderr)
        
        print(f"[AMDEC] Reading CSV: {csv_path}", file=sys.stderr)
        
        # Read CSV (handle different separators)
        df = None
        error_messages = []
        
        # Try semicolon separator with UTF-8
        try:
            df = pd.read_csv(csv_path, sep=';', encoding='utf-8')
            print(f"[AMDEC] Successfully read with sep=';', encoding='utf-8'", file=sys.stderr)
        except Exception as e1:
            error_messages.append(f"sep=';' utf-8: {str(e1)}")
            
            # Try comma separator with UTF-8
            try:
                df = pd.read_csv(csv_path, sep=',', encoding='utf-8')
                print(f"[AMDEC] Successfully read with sep=',', encoding='utf-8'", file=sys.stderr)
            except Exception as e2:
                error_messages.append(f"sep=',' utf-8: {str(e2)}")
                
                # Try with latin-1
                try:
                    df = pd.read_csv(csv_path, sep=';', encoding='latin-1')
                    print(f"[AMDEC] Successfully read with sep=';', encoding='latin-1'", file=sys.stderr)
                except Exception as e3:
                    error_messages.append(f"sep=';' latin-1: {str(e3)}")
                    
                    # Last try: comma with latin-1
                    try:
                        df = pd.read_csv(csv_path, sep=',', encoding='latin-1')
                        print(f"[AMDEC] Successfully read with sep=',', encoding='latin-1'", file=sys.stderr)
                    except Exception as e4:
                        error_messages.append(f"sep=',' latin-1: {str(e4)}")
        
        if df is None or df.empty:
            raise ValueError(f"Failed to read CSV. Errors: {'; '.join(error_messages)}")
        
        print(f"[AMDEC] Loaded {len(df)} rows, {len(df.columns)} columns", file=sys.stderr)
        print(f"[AMDEC] Columns: {df.columns.tolist()}", file=sys.stderr)
        print(f"[AMDEC] First row sample: {df.head(1).to_dict('records')}", file=sys.stderr)
        
        # Analyze equipment
        print(f"[AMDEC] Starting analysis...", file=sys.stderr)
        equipment_stats = analyze_equipment(df)
        
        print(f"[AMDEC] Analyzed {len(equipment_stats)} rows", file=sys.stderr)
        
        # Generate AMDEC BY MACHINE if requested
        amdec_by_machine = {}
        if generate_amdec:
            import time
            start_time = time.time()
            print(f"[AMDEC] Generating AMDEC documents by machine...", file=sys.stderr)
            
            # Group stats by equipment/machine
            machines = {}
            for stat in equipment_stats:
                machine = stat['equipment']
                if machine not in machines:
                    machines[machine] = []
                machines[machine].append(stat)
            
            print(f"[AMDEC] Found {len(machines)} machines to process", file=sys.stderr)
            print(f"[AMDEC] All machines in data: {list(machines.keys())}", file=sys.stderr)
            
            # Filter machines if specific ones were requested
            if selected_machines and len(selected_machines) > 0:
                print(f"[AMDEC] Filtering requested - selected_machines: {selected_machines}", file=sys.stderr)
                print(f"[AMDEC] Type check - is list: {isinstance(selected_machines, list)}", file=sys.stderr)
                
                # Check which machines exist
                available = set(machines.keys())
                requested = set(selected_machines)
                print(f"[AMDEC] Available machines (set): {available}", file=sys.stderr)
                print(f"[AMDEC] Requested machines (set): {requested}", file=sys.stderr)
                
                missing = requested - available
                
                if missing:
                    print(f"[AMDEC] ⚠️ WARNING: Requested but not found: {list(missing)}", file=sys.stderr)
                
                # Filter with exact matching (preserving original keys)
                print(f"[AMDEC] Starting filtering...", file=sys.stderr)
                original_count = len(machines)
                machines = {k: v for k, v in machines.items() if k in selected_machines}
                print(f"[AMDEC] Filtered from {original_count} to {len(machines)} machines", file=sys.stderr)
                print(f"[AMDEC] Machines after filtering: {list(machines.keys())}", file=sys.stderr)
            else:
                print(f"[AMDEC] No filter - processing all {len(machines)} machines", file=sys.stderr)
            
            # Generate AMDEC for each machine with progress tracking
            machine_count = 0
            for machine, machine_stats in machines.items():
                machine_count += 1
                machine_start = time.time()
                print(f"[AMDEC] [{machine_count}/{len(machines)}] Generating AMDEC for {machine}...", file=sys.stderr)
                
                amdec_by_machine[machine] = generate_amdec_for_machine(machine, machine_stats)
                
                machine_elapsed = time.time() - machine_start
                print(f"[AMDEC] ✅ {machine} completed in {machine_elapsed:.2f}s", file=sys.stderr)
            
            total_elapsed = time.time() - start_time
            print(f"[AMDEC] Generated AMDEC for {len(amdec_by_machine)} machines in {total_elapsed:.2f}s", file=sys.stderr)
        
        # Return results
        response = {
            'success': True,
            'equipment_stats': equipment_stats,
            'amdec_by_machine': amdec_by_machine if generate_amdec else None
        }
        
        print(f"[AMDEC] Preparing response...", file=sys.stderr)
        print(f"[AMDEC] Equipment stats count: {len(equipment_stats)}", file=sys.stderr)
        print(f"[AMDEC] AMDEC by machine count: {len(amdec_by_machine) if amdec_by_machine else 0}", file=sys.stderr)
        print(f"[AMDEC] AMDEC machines in response: {list(amdec_by_machine.keys()) if amdec_by_machine else []}", file=sys.stderr)
        print(f"[AMDEC] Returning JSON response to stdout...", file=sys.stderr)
        print(json.dumps(response, ensure_ascii=False))
    
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"[AMDEC] ERROR: {str(e)}", file=sys.stderr)
        print(f"[AMDEC] TRACEBACK:\n{error_detail}", file=sys.stderr)
        
        print(json.dumps({
            'success': False,
            'error': str(e),
            'traceback': error_detail
        }, ensure_ascii=False))
        sys.exit(1)


if __name__ == '__main__':
    main()
