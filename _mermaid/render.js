const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'pele.global.js'), 'utf8') + ';this.pele = pele;', context);
const { pele } = context;

const BLOCK = /<pre class="code mermaid"><code class="mermaid">([\s\S]*?)<\/code><\/pre>/g;
const ENTITIES = { '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&amp;': '&' };

const decode = (text) => text.replace(/&(lt|gt|quot|#39|amp);/g, (m) => ENTITIES[m]);

function* htmlFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(file);
    else if (entry.name.endsWith('.html')) yield file;
  }
}

let failed = false;
for (const file of htmlFiles(process.argv[2])) {
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('<pre class="code mermaid">')) continue;

  let index = 0;
  const out = html.replace(BLOCK, (block, source) => {
    index += 1;
    try {
      const { svg } = pele.render(decode(source), { idPrefix: `mermaid-${index}-` });
      return `<div class="mermaid">${svg}</div>`;
    } catch (e) {
      failed = true;
      console.error(`${file}: diagram ${index}: ${e.message}`);
      return block;
    }
  });
  fs.writeFileSync(file, out);
  console.log(`${file}: ${index} diagram(s)`);
}

process.exit(failed ? 1 : 0);
