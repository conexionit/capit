// Genera el instalador .exe. Archivo separado para que "npm run dist"
// muestre "> node scripts/dist.js" en la consola.
const builder = require('electron-builder');

builder
  .build()
  .then(() => {
    console.log('Instalador de CAPIT generado en la carpeta release/');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error generando el instalador de CAPIT:', err);
    process.exit(1);
  });
