import sys
import os
import importlib

# Voeg de backend map toe aan het Python-pad.
# Op Vercel staat de repo in /var/task, lokaal is het relatief aan dit bestand.
_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_backend = os.path.join(_root, "backend")
if _backend not in sys.path:
    sys.path.insert(0, _backend)

app = importlib.import_module("app.main").app
