const { app, BrowserWindow, ipcMain, desktopCapturer, globalShortcut, dialog, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { uIOhook, UiohookKey } = require('uiohook-napi');
const { getWindowBoundsByTitle } = require('./window-bounds');

let mainWindow = null;
let editorWindow = null;
let frameWindow = null;
let controlPanelWindow = null;
let areaSelectWindow = null;
let boundsRefreshTimer = null;

// Estado de la grabacion activa
let recording = {
  active: false,
  paused: false,
  mode: null, // 'window' | 'area'
  sourceId: null,
  sourceName: null,
  windowTitle: null,
  bounds: null, // { x, y, width, height } en coordenadas absolutas de pantalla
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
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

function createEditorWindow(projectDir) {
  editorWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  editorWindow.setMenuBarVisibility(false);
  editorWindow.loadFile(path.join(__dirname, '..', 'renderer', 'editor.html'), {
    search: 'project=' + encodeURIComponent(projectDir)
  });
}

app.whenReady().then(() => {
  createMainWindow();

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

ipcMain.handle('get-sources', async (_evt, types) => {
  const sources = await desktopCapturer.getSources({
    types: types || ['window', 'screen'],
    thumbnailSize: { width: 320, height: 200 }
  });
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL()
  }));
});

// ---------- Seleccion de area (drag rectangulo sobre la pantalla) ----------

ipcMain.handle('select-area', async () => {
  return new Promise((resolve) => {
    const displays = screen.getAllDisplays();
    const minX = Math.min(...displays.map((d) => d.bounds.x));
    const minY = Math.min(...displays.map((d) => d.bounds.y));
    const maxX = Math.max(...displays.map((d) => d.bounds.x + d.bounds.width));
    const maxY = Math.max(...displays.map((d) => d.bounds.y + d.bounds.height));

    areaSelectWindow = new BrowserWindow({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    areaSelectWindow.setAlwaysOnTop(true, 'screen-saver');
    areaSelectWindow.loadFile(path.join(__dirname, '..', 'renderer', 'area-select.html'));

    const onSelected = (_e, rect) => {
      ipcMain.removeListener('area-selected', onSelected);
      if (areaSelectWindow) {
        areaSelectWindow.close();
        areaSelectWindow = null;
      }
      if (!rect) return resolve(null);
      // rect llega en coordenadas relativas a la ventana selectora: sumar su offset
      resolve({ x: rect.x + minX, y: rect.y + minY, width: rect.width, height: rect.height });
    };
    ipcMain.on('area-selected', onSelected);
  });
});

// ---------- Marco azul sobre la ventana/area grabada ----------

function createFrameOverlay(bounds) {
  frameWindow = new BrowserWindow({
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: false,
    hasShadow: false,
    webPreferences: { nodeIntegration: false }
  });
  frameWindow.setIgnoreMouseEvents(true, { forward: true });
  frameWindow.setAlwaysOnTop(true, 'screen-saver');
  frameWindow.loadFile(path.join(__dirname, '..', 'renderer', 'frame-overlay.html'));
}

function createControlPanel() {
  const primary = screen.getPrimaryDisplay();
  const w = 260;
  const h = 190;
  controlPanelWindow = new BrowserWindow({
    x: primary.workArea.x + primary.workArea.width - w - 20,
    y: primary.workArea.y + 20,
    width: w,
    height: h,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  controlPanelWindow.setAlwaysOnTop(true, 'screen-saver');
  controlPanelWindow.loadFile(path.join(__dirname, '..', 'renderer', 'control-panel.html'));
}

function closeOverlayWindows() {
  if (frameWindow) { frameWindow.close(); frameWindow = null; }
  if (controlPanelWindow) { controlPanelWindow.close(); controlPanelWindow = null; }
  if (boundsRefreshTimer) { clearInterval(boundsRefreshTimer); boundsRefreshTimer = null; }
}

// ---------- Grabacion ----------

ipcMain.handle('start-recording', async (_evt, opts) => {
  // opts = { mode: 'window'|'area', sourceId, sourceName, bounds }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const projectDir = path.join(projectsRoot(), stamp);
  fs.mkdirSync(projectDir, { recursive: true });

  let bounds = opts.bounds || null;
  if (opts.mode === 'window' && !bounds) {
    bounds = getWindowBoundsByTitle(opts.sourceName) || { x: 40, y: 40, width: 900, height: 600 };
  }

  recording = {
    active: true,
    paused: false,
    mode: opts.mode,
    sourceId: opts.sourceId || null,
    sourceName: opts.sourceName || null,
    windowTitle: opts.sourceName || null,
    bounds,
    projectDir,
    steps: [],
    lastCaptureAt: 0
  };

  writeProjectJson();
  createFrameOverlay(bounds);
  createControlPanel();

  if (opts.mode === 'window') {
    boundsRefreshTimer = setInterval(() => {
      if (!recording.active) return;
      const b = getWindowBoundsByTitle(recording.windowTitle);
      if (b && frameWindow) {
        recording.bounds = b;
        frameWindow.setBounds({
          x: Math.round(b.x), y: Math.round(b.y),
          width: Math.round(b.width), height: Math.round(b.height)
        });
      }
    }, 1000);
  }

  uIOhook.on('mousedown', onCaptureEvent);
  uIOhook.on('keydown', onKeydownEvent);
  uIOhook.start();

  // La ventana principal de CAPIT permanece abierta (no se minimiza) —
  // el control durante la grabacion vive en el panel flotante.
  return { projectDir };
});

ipcMain.handle('toggle-pause', async () => {
  recording.paused = !recording.paused;
  return recording.paused;
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
  closeOverlayWindows();

  const projectDir = recording.projectDir;
  createEditorWindow(projectDir); // guardado automatico + paso directo al editor
  return { projectDir };
}

function onCaptureEvent(evt) {
  captureStep('click', { x: evt.x, y: evt.y });
}

function onKeydownEvent(evt) {
  const isBreakKey = evt.keycode === UiohookKey.Enter || evt.keycode === UiohookKey.Tab;
  const now = Date.now();
  if (!isBreakKey && now - recording.lastCaptureAt < DEBOUNCE_MS) return;
  captureStep('key', { keycode: evt.keycode });
}

async function captureStep(actionType, extra) {
  if (!recording.active || recording.paused) return;
  recording.lastCaptureAt = Date.now();

  try {
    let pngBuffer = null;

    if (recording.mode === 'window') {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 1600, height: 1000 }
      });
      const match = sources.find((s) => s.id === recording.sourceId);
      if (!match) return;
      pngBuffer = match.thumbnail.toPNG();
    } else {
      const display = screen.getDisplayMatching(recording.bounds);
      const scale = display.scaleFactor || 1;
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: Math.round(display.size.width * scale),
          height: Math.round(display.size.height * scale)
        }
      });
      const match = sources.find((s) => String(s.display_id) === String(display.id)) || sources[0];
      if (!match) return;

      const relX = Math.round((recording.bounds.x - display.bounds.x) * scale);
      const relY = Math.round((recording.bounds.y - display.bounds.y) * scale);
      const w = Math.round(recording.bounds.width * scale);
      const h = Math.round(recording.bounds.height * scale);
      const cropped = match.thumbnail.crop({ x: relX, y: relY, width: w, height: h });
      pngBuffer = cropped.toPNG();
    }

    const index = recording.steps.length + 1;
    const fileName = `step-${String(index).padStart(3, '0')}.png`;
    fs.writeFileSync(path.join(recording.projectDir, fileName), pngBuffer);

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
    if (controlPanelWindow) controlPanelWindow.webContents.send('step-added', recording.steps.length);
  } catch (err) {
    console.error('Error capturando step:', err);
  }
}

function writeProjectJson() {
  if (!recording.projectDir) return;
  const data = {
    sourceName: recording.sourceName,
    mode: recording.mode,
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

// Exportadores (docx / pdf / video)
const exporter = require('./exporter');
ipcMain.handle('export-docx', async (_evt, payload) => exporter.exportDocx(payload));
ipcMain.handle('export-pdf', async (_evt, payload) => exporter.exportPdf(payload));
ipcMain.handle('export-video', async (_evt, payload) => exporter.exportVideo(payload));
