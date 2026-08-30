const { ipcRenderer } = require('electron');

const btnNueva = document.getElementById('btnNueva');
const btnAbrir = document.getElementById('btnAbrir');
const picker = document.getElementById('picker');
const sourcesGrid = document.getElementById('sourcesGrid');
const btnIniciar = document.getElementById('btnIniciar');
const btnCancelar = document.getElementById('btnCancelar');

let selectedSource = null;

btnNueva.addEventListener('click', async () => {
  picker.style.display = 'block';
  sourcesGrid.innerHTML = '<p>Cargando ventanas y pantallas...</p>';
  const sources = await ipcRenderer.invoke('get-sources');
  renderSources(sources);
});

btnCancelar.addEventListener('click', () => {
  picker.style.display = 'none';
  selectedSource = null;
  btnIniciar.disabled = true;
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

btnIniciar.addEventListener('click', async () => {
  if (!selectedSource) return;
  await ipcRenderer.invoke('start-recording', {
    sourceId: selectedSource.id,
    sourceName: selectedSource.name
  });
  picker.style.display = 'none';
});

btnAbrir.addEventListener('click', async () => {
  await ipcRenderer.invoke('open-project-dialog');
});
