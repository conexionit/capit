const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');
const { fabric } = require('fabric');

const params = new URLSearchParams(window.location.search);
const projectDir = params.get('project');

let projectData = null;
let currentIndex = 0;
let canvas = null;

const stepsList = document.getElementById('stepsList');
const stepTexto = document.getElementById('stepTexto');
const stepDuracion = document.getElementById('stepDuracion');
const colorPicker = document.getElementById('colorPicker');

async function init() {
  projectData = await ipcRenderer.invoke('load-project', projectDir);
  canvas = new fabric.Canvas('fabricCanvas');
  renderStepsList();
  if (projectData.pasos.length > 0) loadStep(0);
}

function renderStepsList() {
  stepsList.innerHTML = '';
  projectData.pasos.forEach((step, i) => {
    const div = document.createElement('div');
    div.className = 'step-item' + (i === currentIndex ? ' active' : '');
    const imgPath = path.join(projectDir, step.image);
    div.innerHTML = `<img src="file://${imgPath}" /><div class="n">Paso ${i + 1}</div>`;
    div.addEventListener('click', () => {
      saveCurrentStepLayers();
      loadStep(i);
    });
    stepsList.appendChild(div);
  });
}

function loadStep(index) {
  currentIndex = index;
  const step = projectData.pasos[index];
  const imgPath = path.join(projectDir, step.image);

  fabric.Image.fromURL('file://' + imgPath, (img) => {
    canvas.clear();
    const scale = canvas.getWidth() / img.width;
    img.set({ left: 0, top: 0, selectable: false, evented: false });
    img.scale(scale);
    canvas.setHeight(img.height * scale);
    canvas.add(img);
    canvas.sendToBack(img);

    // Reconstruir capas guardadas
    (step.capas || []).forEach((capaJson) => {
      fabric.util.enlivenObjects([capaJson], (objs) => {
        objs.forEach((o) => canvas.add(o));
      });
    });
  });

  stepTexto.value = step.texto || '';
  stepDuracion.value = step.duracionSeg || 3;
  renderStepsList();
}

function saveCurrentStepLayers() {
  if (!projectData) return;
  const step = projectData.pasos[currentIndex];
  // Todo objeto agregado por el usuario tiene la marca capitLayer=true
  const layers = canvas.getObjects().filter((o) => o.capitLayer);
  step.capas = layers.map((o) => o.toJSON(['capitLayer']));
  step.texto = stepTexto.value;
  step.duracionSeg = parseInt(stepDuracion.value, 10) || 3;
}

async function persist() {
  saveCurrentStepLayers();
  await ipcRenderer.invoke('save-project', { projectDir, data: projectData });
}

// ---------- Herramientas de capas ----------

document.getElementById('toolText').addEventListener('click', () => {
  const text = new fabric.Textbox('Texto aqui', {
    left: 60, top: 60, fill: colorPicker.value, fontSize: 24, fontFamily: 'Montserrat'
  });
  text.capitLayer = true;
  canvas.add(text);
});

document.getElementById('toolRect').addEventListener('click', () => {
  const rect = new fabric.Rect({
    left: 60, top: 60, width: 160, height: 60,
    fill: 'transparent', stroke: colorPicker.value, strokeWidth: 3, rx: 6, ry: 6
  });
  rect.capitLayer = true;
  canvas.add(rect);
});

document.getElementById('toolNumber').addEventListener('click', () => {
  const n = (canvas.getObjects().filter((o) => o.capitLayer && o.isNumberBadge).length + 1);
  const circle = new fabric.Circle({ radius: 18, fill: colorPicker.value, originX: 'center', originY: 'center' });
  const label = new fabric.Text(String(n), {
    fontSize: 18, fill: '#fff', originX: 'center', originY: 'center', fontFamily: 'Montserrat'
  });
  const group = new fabric.Group([circle, label], { left: 60, top: 60 });
  group.capitLayer = true;
  group.isNumberBadge = true;
  canvas.add(group);
});

document.getElementById('toolArrow').addEventListener('click', () => {
  const line = new fabric.Line([50, 50, 200, 50], {
    stroke: colorPicker.value, strokeWidth: 4
  });
  const arrowHead = new fabric.Triangle({
    left: 200, top: 50, angle: 90, width: 16, height: 16, fill: colorPicker.value, originX: 'center', originY: 'center'
  });
  const group = new fabric.Group([line, arrowHead], { left: 60, top: 120 });
  group.capitLayer = true;
  canvas.add(group);
});

document.getElementById('toolBlur').addEventListener('click', () => {
  // Aproximacion: rectangulo semi-opaco. Blur real requiere procesado de pixeles
  // sobre la imagen de fondo (mejora pendiente con canvas.filters).
  const rect = new fabric.Rect({
    left: 60, top: 200, width: 160, height: 40,
    fill: 'rgba(20,20,20,0.85)'
  });
  rect.capitLayer = true;
  rect.isBlur = true;
  canvas.add(rect);
});

document.getElementById('toolDelete').addEventListener('click', () => {
  const active = canvas.getActiveObject();
  if (active) canvas.remove(active);
});

document.getElementById('btnGuardar').addEventListener('click', async () => {
  await persist();
  alert('Paso guardado.');
});

// ---------- Exportacion ----------

function flattenAllSteps() {
  saveCurrentStepLayers();
  // Genera dataURL aplanado por cada step usando un canvas oculto temporal
  return new Promise((resolve) => {
    const results = [];
    let pending = projectData.pasos.length;
    if (pending === 0) return resolve(results);

    projectData.pasos.forEach((step, i) => {
      const tempCanvasEl = document.createElement('canvas');
      const tempCanvas = new fabric.Canvas(tempCanvasEl);
      const imgPath = path.join(projectDir, step.image);

      fabric.Image.fromURL('file://' + imgPath, (img) => {
        tempCanvas.setWidth(img.width);
        tempCanvas.setHeight(img.height);
        tempCanvas.add(img);

        fabric.util.enlivenObjects(step.capas || [], (objs) => {
          objs.forEach((o) => tempCanvas.add(o));
          tempCanvas.renderAll();
          results[i] = {
            imageDataUrl: tempCanvas.toDataURL({ format: 'png' }),
            texto: step.texto || '',
            duracionSeg: step.duracionSeg || 3
          };
          pending -= 1;
          if (pending === 0) resolve(results);
        });
      });
    });
  });
}

document.getElementById('btnExportDocx').addEventListener('click', async () => {
  const steps = await flattenAllSteps();
  const outPath = await ipcRenderer.invoke('export-docx', { projectDir, steps, titulo: 'Manual CAPIT' });
  alert('Documento generado: ' + outPath);
});

document.getElementById('btnExportPdf').addEventListener('click', async () => {
  const steps = await flattenAllSteps();
  const outPath = await ipcRenderer.invoke('export-pdf', { projectDir, steps, titulo: 'Manual CAPIT' });
  alert('PDF generado: ' + outPath);
});

document.getElementById('btnExportVideo').addEventListener('click', async () => {
  const steps = await flattenAllSteps();
  const outPath = await ipcRenderer.invoke('export-video', { projectDir, steps });
  alert('Video generado: ' + outPath);
});

init();
