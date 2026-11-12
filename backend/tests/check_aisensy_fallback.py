# Verifies AiSensy hardcoded fallback keys equal .env values (no key printing)
import os, sys, re
from dotenv import dotenv_values
import dotenv

env = dotenv_values("/app/backend/.env")
src = open("/app/backend/server.py").read()
for k in ["AISENSY_API_KEY", "AISENSY_API_KEY_UC"]:
    m = re.search(rf'^{k}\s*=\s*os\.environ\.get\("{k}"\)\s*or\s*"([^"]+)"', src, re.M)
    print(k, "literal_found:", bool(m), "literal==env:", bool(m) and m.group(1) == env.get(k))

# Import server with env keys absent and dotenv disabled
os.environ.pop("AISENSY_API_KEY", None); os.environ.pop("AISENSY_API_KEY_UC", None)
dotenv.load_dotenv = lambda *a, **kw: False
sys.path.insert(0, "/app/backend")
import server
for k in ["AISENSY_API_KEY", "AISENSY_API_KEY_UC"]:
    v = getattr(server, k)
    print(k, "import_nonempty:", bool(v), "import==env:", v == env.get(k), "env_var_present:", k in os.environ)
