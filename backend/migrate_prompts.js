const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const db = new Database('./agent_brain.db');

console.log('Starting DB migration Phase 3...');

try {
  db.exec('ALTER TABLE template_agents ADD COLUMN system_prompt TEXT;');
  console.log('Added system_prompt to template_agents');
} catch(e) { console.log(e.message); }

try {
  db.exec('ALTER TABLE company_agents ADD COLUMN system_prompt TEXT;');
  console.log('Added system_prompt to company_agents');
} catch(e) { console.log(e.message); }

const PROMPT_DIR = path.join(__dirname, 'prompts');
if (fs.existsSync(PROMPT_DIR)) {
  const files = fs.readdirSync(PROMPT_DIR);
  const updateTpl = db.prepare('UPDATE template_agents SET system_prompt = ? WHERE agent_key = ?');
  const updateCo = db.prepare('UPDATE company_agents SET system_prompt = ? WHERE agent_key = ?');
  
  let migrated = 0;
  for (const f of files) {
    if (f.endsWith('.md')) {
      const key = f.replace('.md', '').toUpperCase();
      let content = fs.readFileSync(path.join(PROMPT_DIR, f), 'utf8');
      
      const r1 = updateTpl.run(content, key);
      const r2 = updateCo.run(content, key);
      console.log(`Migrated ${key}: ${r1.changes} template rows, ${r2.changes} company rows`);
      migrated++;
    }
  }
  console.log(`Successfully migrated ${migrated} prompt files!`);
} else {
  console.log('No prompts folder found!');
}
