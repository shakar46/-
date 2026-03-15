
const fs = require('fs');
const path = './src/constants.ts';

let content = fs.readFileSync(path, 'utf8');

const startMarker = 'export const ADJECTIVE_COMMENTS = [';
const endMarker = '];';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const arrayContent = content.substring(startIndex + startMarker.length, endIndex);
  const items = arrayContent.match(/"[^"]*"/g).map(s => s.slice(1, -1));
  
  const uniqueItems = [...new Set(items)];
  
  const newArrayContent = '\n  ' + uniqueItems.map(item => `"${item}"`).join(',\n  ') + '\n';
  
  const newContent = content.substring(0, startIndex + startMarker.length) + newArrayContent + content.substring(endIndex);
  
  fs.writeFileSync(path, newContent);
  console.log('De-duplicated ADJECTIVE_COMMENTS successfully');
} else {
  console.log('Could not find ADJECTIVE_COMMENTS array');
}
