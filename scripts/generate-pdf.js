const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const mdPath = path.join(__dirname, '../README.md');
const htmlPath = path.join(__dirname, 'readme.html');
const pdfPath = '/Users/manandewan/Desktop/Aptify_Documentation.pdf';

function mdToHtml(md) {
  // Escape HTML chars
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  // Code blocks: ```js ... ```
  html = html.replace(/```(\w*)\n([\s\S]*?)\n```/g, '<pre><code>$2</code></pre>');
  
  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Headers
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')
             .replace(/^## (.*$)/gim, '<h2>$1</h2>')
             .replace(/^### (.*$)/gim, '<h3>$1</h3>');
             
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Simple table parser
  const lines = html.split('\n');
  let insideTable = false;
  const newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|')) {
      if (!insideTable) {
        insideTable = true;
        newLines.push('<table>');
      }
      if (line.includes('---')) {
        continue; // skip separator row
      }
      const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      const isHeader = newLines[newLines.length - 1] === '<table>';
      const cellTag = isHeader ? 'th' : 'td';
      
      let rowHtml = '  <tr>\n' + cells.map(c => `    <${cellTag}>${c}</${cellTag}>`).join('\n') + '\n  </tr>';
      newLines.push(rowHtml);
    } else {
      if (insideTable) {
        insideTable = false;
        newLines.push('</table>');
      }
      newLines.push(lines[i]);
    }
  }
  html = newLines.join('\n');
  
  // Parse lists
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>')
             .replace(/^- (.*$)/gim, '<li>$1</li>');
             
  // Simple paragraph wrap
  const splitLines = html.split('\n');
  let insidePre = false;
  const finalLines = splitLines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('<pre') || trimmed.startsWith('<code')) {
      insidePre = true;
      return line;
    }
    if (trimmed.endsWith('</pre>') || trimmed.endsWith('</code>')) {
      insidePre = false;
      return line;
    }
    if (insidePre) return line;
    if (trimmed === '') return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<hr') || trimmed.startsWith('<table') || trimmed.startsWith('<tr') || trimmed.startsWith('<td') || trimmed.startsWith('<th') || trimmed.startsWith('</table') || trimmed.startsWith('<li>') || trimmed.startsWith('<ul>') || trimmed.startsWith('</ul')) {
      return line;
    }
    return `<p>${line}</p>`;
  });
  
  return finalLines.join('\n');
}

async function main() {
  try {
    console.log('Reading README.md...');
    const mdContent = fs.readFileSync(mdPath, 'utf8');
    
    console.log('Converting Markdown to HTML...');
    const bodyContent = mdToHtml(mdContent);
    
    const styledHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Aptify Documentation</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;750;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      line-height: 1.6;
      color: #1e293b;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      background-color: #ffffff;
    }
    h1 {
      font-size: 2.5em;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 10px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    h2 {
      font-size: 1.8em;
      font-weight: 750;
      color: #1e293b;
      margin-top: 40px;
      margin-bottom: 16px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
    }
    h3 {
      font-size: 1.3em;
      font-weight: 600;
      color: #334155;
      margin-top: 25px;
      margin-bottom: 10px;
    }
    p {
      margin-bottom: 16px;
      color: #475569;
    }
    strong {
      color: #0f172a;
      font-weight: 600;
    }
    code {
      font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.9em;
      background-color: #f1f5f9;
      padding: 3px 6px;
      border-radius: 4px;
      color: #0f172a;
    }
    pre {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
      margin-bottom: 20px;
    }
    pre code {
      background-color: transparent;
      padding: 0;
      border-radius: 0;
      color: #334155;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 25px 0;
      font-size: 0.95em;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 12px 16px;
      text-align: left;
    }
    th {
      background-color: #f8fafc;
      font-weight: 600;
      color: #0f172a;
    }
    tr:nth-child(even) td {
      background-color: #fafafa;
    }
    a {
      color: #4f46e5;
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
    }
    hr {
      border: 0;
      height: 1px;
      background: #e2e8f0;
      margin: 40px 0;
    }
    li {
      margin-bottom: 8px;
      color: #475569;
    }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>
    `;
    
    fs.writeFileSync(htmlPath, styledHtml);
    console.log('HTML page generated at scripts/readme.html');
    
    console.log('Generating PDF via headless Google Chrome...');
    const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    
    exec(`"${chromePath}" --headless --disable-gpu --print-to-pdf="${pdfPath}" "${htmlPath}"`, (err, stdout, stderr) => {
      if (err) {
        console.error('Failed to run Google Chrome headless command:', err);
        return;
      }
      console.log(`Success! PDF Document compiled and saved to: ${pdfPath}`);
      
      // Delete temporary HTML file
      try {
        fs.unlinkSync(htmlPath);
      } catch (e) {}
    });
    
  } catch (err) {
    console.error('Error generating PDF:', err);
  }
}

main();
