// Lanza la aplicacion. Existe como archivo separado para que "npm start"
// muestre "> node scripts/start.js" en la consola, en vez del nombre del
// motor interno.
const { spawn } = require('child_process');
const path = require('path');

const appPath = require('electron');
const projectRoot = path.join(__dirname, '..');

const child = spawn(appPath, [projectRoot], { stdio: 'inherit' });
child.on('close', (code) => process.exit(code));
