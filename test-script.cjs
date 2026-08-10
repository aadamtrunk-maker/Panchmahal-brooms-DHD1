const fs = require('fs');

const files = [
  'src/components/SkuCard.tsx'
];

const replacements = {
  '\\[#5A5A40\\]': 'primary',
  '\\[#2D2D2A\\]': 'textMain',
  '\\[#8E8E7E\\]': 'muted',
  '\\[#A68A64\\]': 'accent',
  '\\[#F5F5F0\\]': 'surface',
  '\\[#FDFCF8\\]': 'bg',
  '\\[#EAEAEA\\]': 'surfaceHover',
  '\\[#434330\\]': 'primary-dark',
  '\\[#4a4a32\\]': 'primary-dark',
  '\\[#8E7554\\]': 'accent-dark',
  '\\[#D9C5B2\\]': 'accent-light'
};

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  for (const [pattern, replacement] of Object.entries(replacements)) {
    const regex = new RegExp(pattern, 'gi');
    content = content.replace(regex, replacement);
  }
  fs.writeFileSync(file, content, 'utf8');
});

console.log("Replacements complete.");
