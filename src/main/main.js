const { app, BrowserWindow, ipcMain, desktopCapturer, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { uIOhook, UiohookKey } = require('uiohook-napi');

let mainWindow = null;
let editorWindow = null;

// Estado de la grabación activa
let recording = {
  active: false,
  sourceId: null,
  sourceName: null,
  projectDir: null,
  steps: [],
  lastCaptureAt: 0
};

const DEBOUNCE_MS = 400; // agrupa tipeo consecutivo en un solo step

function projectsRoot() {
  const dir = path.join(app.getPath('documents'), 'CAPIT', 'proyectos');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

function createEditorWindow(projectDir) {
  editorWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  editorWindow.setMenuBarVisibility(false);
  const url = path.join(__dirname, '..', 'renderer', 'editor.html') +
    '?project=' + encodeURIComponent(projectDir);
  editorWindow.loadFile(path.join(__dirname, '..', 'renderer', 'editor.html'), {
    search: 'project=' + encodeURIComponent(projectDir)
  });
}

app.whenReady().then(() => {
  createMainWindow();

  // Atajo global para detener la grabación desde cualquier ventana (incluida SAP GUI)
  globalShortcut.register('Control+Shift+S', () => {
    if (recording.active) stopRecording();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (recording.active) stopRecording();
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') app.quit();
});

// ---------- Fuentes de captura (ventanas / pantallas) ----------

ipcMain.handle('get-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 320, height: 200 }
  });
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL()
  }));
});

// ---------- Grabación ----------

ipcMain.handle('start-recording', async (_evt, { sourceId, sourceName }) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const projectDir = path.join(projectsRoot(), stamp);
  fs.mkdirSync(projectDir, { recursive: true });

  recording = {
    active: true,
    sourceId,
    sourceName,
    projectDir,
    steps: [],
    lastCaptureAt: 0
  };

  writeProjectJson();

  uIOhook.on('mousedown', onCaptureEvent);
  uIOhook.on('keydown', onKeydownEvent);
  uIOhook.start();

  if (mainWindow) mainWindow.minimize();

  return { projectDir };
});

ipcMain.handle('stop-recording', async () => {
  return stopRecording();
});

function stopRecording() {
  if (!recording.active) return null;
  uIOhook.stop();
  uIOhook.removeAllListeners();
  recording.active = false;
  writeProjectJson();

  const projectDir = recording.projectDir;
  if (mainWindow) mainWindow.restore();
  createEditorWindow(projectDir);
  return { projectDir };
}

function onCaptureEvent(evt) {
  captureStep('click', { x: evt.x, y: evt.y });
}

function onKeydownEvent(evt) {
  // Tab / Enter siempre cortan a un step nuevo; el resto de teclas se agrupa (debounce)
  const isBreakKey = evt.keycode === UiohookKey.Enter || evt.keycode === UiohookKey.Tab;
  const now = Date.now();
  if (!isBreakKey && now - recording.lastCaptureAt < DEBOUNCE_MS) {
    return; // tipeo consecutivo: no crear step nuevo todavia
  }
  captureStep('key', { keycode: evt.keycode });
}

async function captureStep(actionType, extra) {
  if (!recording.active) return;
  recording.lastCaptureAt = Date.now();

  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 1600, height: 1000 }
    });
    const match = sources.find((s) => s.id === recording.sourceId);
    if (!match) return;

    const index = recording.steps.length + 1;
    const fileName = `step-${String(index).padStart(3, '0')}.png`;
    const filePath = path.join(recording.projectDir, fileName);
    fs.writeFileSync(filePath, match.thumbnail.toPNG());

    recording.steps.push({
      id: `step-${index}`,
      image: fileName,
      timestamp: Date.now(),
      actionType,
      ...extra,
      capas: [],
      audio: null,
      duracionSeg: 3
    });

    writeProjectJson();
  } catch (err) {
    console.error('Error capturando step:', err);
  }
}

function writeProjectJson() {
  if (!recording.projectDir) return;
  const data = {
    sourceName: recording.sourceName,
    createdAt: new Date().toISOString(),
    pasos: recording.steps
  };
  fs.writeFileSync(
    path.join(recording.projectDir, 'project.json'),
    JSON.stringify(data, null, 2)
  );
}

// ---------- Abrir proyecto existente ----------

ipcMain.handle('open-project-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecciona la carpeta del proyecto CAPIT',
    properties: ['openDirectory'],
    defaultPath: projectsRoot()
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const projectDir = result.filePaths[0];
  if (!fs.existsSync(path.join(projectDir, 'project.json'))) {
    dialog.showErrorBox('Proyecto invalido', 'Esa carpeta no contiene un project.json de CAPIT.');
    return null;
  }
  createEditorWindow(projectDir);
  return { projectDir };
});

// ---------- Puente para el editor (lectura/escritura del proyecto) ----------

ipcMain.handle('load-project', async (_evt, projectDir) => {
  const raw = fs.readFileSync(path.join(projectDir, 'project.json'), 'utf-8');
  return JSON.parse(raw);
});

ipcMain.handle('save-project', async (_evt, { projectDir, data }) => {
  fs.writeFileSync(path.join(projectDir, 'project.json'), JSON.stringify(data, null, 2));
  return true;
});

// Exportadores (docx / pdf / video) delegan a src/main/exporter.js
const exporter = require('./exporter');
ipcMain.handle('export-docx', async (_evt, payload) => exporter.exportDocx(payload));
ipcMain.handle('export-pdf', async (_evt, payload) => exporter.exportPdf(payload));
ipcMain.handle('export-video', async (_evt, payload) => exporter.exportVideo(payload));
