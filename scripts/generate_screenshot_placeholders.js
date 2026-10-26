const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const targetDir = path.join(__dirname, '..', 'docs', 'screenshots');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 720 x 400 placeholder card
const width = 720;
const height = 400;

const placeholders = [
  { file: '01-compendio.png', title: '01. Compendio Geral & Busca', color: [234, 179, 8] },      // Conhecimento / Gold
  { file: '02-ficha-agente.png', title: '02. Ficha Interativa do Agente', color: [239, 68, 68] },   // Sangue / Red
  { file: '03-central-mestre.png', title: '03. Central do Mestre & Combate', color: [168, 85, 247] }, // Energia/Roxo
  { file: '04-armaria.png', title: '04. Armaria & Customizador de Armas', color: [249, 115, 22] }, // Laranja
  { file: '05-mesa-virtual.png', title: '05. Mesa Virtual VTT Multiplayer', color: [59, 130, 246] }, // Azul
  { file: '06-glitch-ia.png', title: '06. G.L.I.T.C.H. - IA Paranormal', color: [192, 132, 252] },  // Magenta
  { file: '07-rolador-dados.png', title: '07. Rolador de Dados Canônico', color: [34, 197, 94] },   // Verde
  { file: '08-acervo-livros.png', title: '08. Visualizador de Livros & PDFs', color: [14, 165, 233] }, // Ciano
  { file: '09-temas-paranormais.png', title: '09. Os 7 Temas Paranormais', color: [236, 72, 153] }, // Rosa
  { file: '10-exportacao-pdf.png', title: '10. Exportacao de Fichas em PDF', color: [156, 163, 175] } // Cinza
];

placeholders.forEach(({ file, title, color }) => {
  const filePath = path.join(targetDir, file);
  // Only create if file doesn't already exist or if it's a small placeholder
  const png = new PNG({ width, height });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;

      // Dark futuristic background gradient
      let bgR = 15;
      let bgG = 17;
      let bgB = 23;

      // Outer border (accent color)
      const isBorder = x < 4 || x >= width - 4 || y < 4 || y >= height - 4;
      // Inner subtle border
      const isInnerBorder = (x >= 12 && x <= 14 && y >= 12 && y <= height - 12) ||
                            (x >= width - 14 && x <= width - 12 && y >= 12 && y <= height - 12) ||
                            (y >= 12 && y <= 14 && x >= 12 && x <= width - 12) ||
                            (y >= height - 14 && y >= height - 12 && x >= 12 && x <= width - 12);

      // Top header banner
      const isHeader = y >= 20 && y <= 60 && x >= 24 && x <= width - 24;

      if (isBorder) {
        png.data[idx] = color[0];
        png.data[idx + 1] = color[1];
        png.data[idx + 2] = color[2];
        png.data[idx + 3] = 255;
      } else if (isHeader) {
        png.data[idx] = Math.round(color[0] * 0.25 + 20);
        png.data[idx + 1] = Math.round(color[1] * 0.25 + 20);
        png.data[idx + 2] = Math.round(color[2] * 0.25 + 25);
        png.data[idx + 3] = 255;
      } else if (isInnerBorder) {
        png.data[idx] = Math.round(color[0] * 0.5);
        png.data[idx + 1] = Math.round(color[1] * 0.5);
        png.data[idx + 2] = Math.round(color[2] * 0.5);
        png.data[idx + 3] = 180;
      } else {
        // Subtle vertical gradient
        const grad = Math.round((y / height) * 15);
        png.data[idx] = bgR + grad;
        png.data[idx + 1] = bgG + grad;
        png.data[idx + 2] = bgB + grad;
        png.data[idx + 3] = 255;
      }
    }
  }

  const buffer = PNG.sync.write(png);
  fs.writeFileSync(filePath, buffer);
  console.log(`Generated placeholder: ${file}`);
});
