const { ipcRenderer } = require('electron');

const btnNueva = document.getElementById('btnNueva');
const btnAbrir = document.getElementById('btnAbrir');
const modeChooser = document.getElementById('modeChooser');
const btnModoVentana = document.getElementById('btnModoVentana');
const btnModoArea = document.getElementById('btnModoArea');
const btnCancelarModo = document.getElementById('btnCancelarModo');

const picker = document.getElementById('picker');
const sourcesGrid = document.getElementById('sourcesGrid');
const btnIniciar = document.getElementById('btnIniciar');
const btnCancelar = document.getElementById('btnCancelar');

let selectedSource = null;

btnNueva.addEventListener('click', () => {
  modeChooser.style.display = 'block';
});

btnCancelarModo.addEventListener('click', () => {
  modeChooser.style.display = 'none';
});

// ---- Modo: ventana completa ----

btnModoVentana.addEventListener('click', async () => {
  modeChooser.style.display = 'none';
  picker.style.display = 'block';
  sourcesGrid.innerHTML = '<p>Cargando ventanas abiertas...</p>';
  const sources = await ipcRenderer.invoke('get-sources', ['window']);
  renderSources(sources);
});

function renderSources(sources) {
  sourcesGrid.innerHTML = '';
  sources.forEach((s) => {
    const div = document.createElement('div');
    div.className = 'thumb';
    div.innerHTML = `<img src="${s.thumbnail}" /><div class="label">${s.name}</div>`;
    div.addEventListener('click', () => {
      document.querySelectorAll('.thumb').forEach((t) => t.classList.remove('selected'));
      div.classList.add('selected');
      selectedSource = s;
      btnIniciar.disabled = false;
    });
    sourcesGrid.appendChild(div);
  });
}

btnCancelar.addEventListener('click', () => {
  picker.style.display = 'none';
  selectedSource = null;
  btnIniciar.disabled = true;
});

btnIniciar.addEventListener('click', async () => {
  if (!selectedSource) return;
  await ipcRenderer.invoke('start-recording', {
    mode: 'window',
    sourceId: selectedSource.id,
    sourceName: selectedSource.name
  });
  picker.style.display = 'none';
});

// ---- Modo: area de pantalla ----

btnModoArea.addEventListener('click', async () => {
  modeChooser.style.display = 'none';
  const bounds = await ipcRenderer.invoke('select-area');
  if (!bounds) return; // cancelado con Esc
  await ipcRenderer.invoke('start-recording', {
    mode: 'area',
    sourceName: 'Area seleccionada',
    bounds
  });
});

// ---- Abrir proyecto existente ----

btnAbrir.addEventListener('click', async () => {
  await ipcRenderer.invoke('open-project-dialog');
});
