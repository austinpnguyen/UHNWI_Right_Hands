import sqlite3
import os
import re

db_path = "/Users/austin/AntiGravity/PROJECTS/CLAUDE CODE COMPANY/brain/agent_brain.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

try:
    cur.execute("ALTER TABLE company_agents ADD COLUMN system_prompt TEXT;")
except sqlite3.OperationalError:
    pass

try:
    cur.execute("ALTER TABLE template_agents ADD COLUMN system_prompt TEXT;")
except sqlite3.OperationalError:
    pass

prompt_map = {
    'CEO':        '../agents/company/ceo.md',
    'CPO':        '../agents/company/cpo.md',
    'CFO':        '../agents/company/cfo.md',
    'CMO':        '../agents/company/cmo.md',
    'COO':        '../agents/company/coo.md',
    'COS':        '../agents/inner_circle/cos.md',
    'CIO':        '../agents/inner_circle/cio.md',
    'CISO':       '../agents/inner_circle/ciso.md',
    'FIXER':      '../agents/inner_circle/fixer.md',
    'WHISPERER':  '../agents/inner_circle/whisperer.md',
    'MKT_ANALYST':'../agents/market/market_analyst.md',
    'COMPETITOR': '../agents/market/competitor_simulator.md',
    'TARGET_BUYER':'../agents/market/target_buyer.md',
    'UNAWARE':    '../agents/market/unaware_audience.md',
    'AUDITOR':    '../agents/shield/auditor.md',
    'CLO':        '../agents/shield/clo.md',
}

base_dir = "/Users/austin/AntiGravity/PROJECTS/CLAUDE CODE COMPANY/UHNWI_Right_Hands/backend"
count = 0
for key, rel_path in prompt_map.items():
    full_path = os.path.join(base_dir, rel_path)
    if os.path.exists(full_path):
        with open(full_path, 'r') as f:
            content = f.read()
            content = re.sub(r'^---[\s\S]+?---\n', '', content)
            cur.execute("UPDATE template_agents SET system_prompt = ? WHERE agent_key = ?", (content, key))
            cur.execute("UPDATE company_agents SET system_prompt = ? WHERE agent_key = ?", (content, key))
            count += 1
conn.commit()
print(f"Migrated {count} prompts.")
