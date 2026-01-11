#!/bin/bash
# Quick commands for PDR system

# 🟢 START
# ========

# 1. Vérifier Python
echo "Python:"
python --version

# 2. Vérifier packages
echo "Packages installed:"
python -m pip list | grep -E "pandas|numpy|scikit-learn"

# 3. Démarrer Next.js
cd Project_GMAO/apps/web
pnpm dev

# 4. Accéder interface
# http://localhost:3000/home/pdr

# 🧪 TEST
# =======

# Test Python directement
python public/ml/pipeline.py << EOF
{
  "action": "preprocess",
  "data": {
    "preview": [{"col1": 1, "col2": "a"}],
    "column_types": {"col1": "numerical", "col2": "categorical"}
  }
}
EOF

# 🔧 DEBUG
# ========

# Voir logs
tail -f .next/logs/

# Voir erreurs TypeScript
tsc --noEmit

# Vérifier fichiers créés
ls -la apps/web/app/home/pdr/
ls -la apps/web/app/api/home/pdr/
ls -la apps/web/public/ml/pipeline.py

# 📊 STATS
# ========

# Lignes de code créées
wc -l apps/web/app/home/pdr/page.tsx
wc -l apps/web/public/ml/pipeline.py

# Nombre de fichiers
find apps/web/app/home/pdr -type f | wc -l
find apps/web/app/api/home/pdr -type f | wc -l
