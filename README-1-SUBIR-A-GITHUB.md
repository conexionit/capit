# CAPIT — Paso a paso para subir los archivos a GitHub (uno por uno)

Este método evita subidas masivas. Usa "Crear archivo nuevo" en la web de
GitHub, pegando el contenido de cada archivo. Como todos los archivos de
este proyecto son de texto (código, no binarios), este método funciona
perfecto para los 10 archivos.

## Antes de empezar

1. Descomprime el ZIP `capit-proyecto.zip` en tu PC (por ejemplo en `Escritorio\capit`).
2. Ve a tu repositorio en GitHub (créalo primero si no existe: botón verde
   "New" en github.com → nombre `capit` → Create repository).
3. Abre cada archivo del ZIP con el Bloc de notas (o VS Code) para copiar
   su contenido cuando se indique.

## Orden de subida (10 archivos)

Repite estos 4 pasos para **cada** archivo de la lista de abajo:

```
1. En GitHub, dentro del repo → botón "Add file" → "Create new file"
2. En el campo de nombre, escribe la RUTA COMPLETA tal como aparece abajo
   (incluyendo carpetas — GitHub las crea solas al ver el "/")
3. Abre el archivo correspondiente del ZIP, copia TODO su contenido,
   pégalo en el editor grande de GitHub
4. Baja hasta el final de la página → "Commit changes" (o "Commit new file")
```

### Lista de archivos, en este orden:

```
1.  .gitignore
2.  package.json
3.  build/LEEME-ICONO.txt
4.  scripts/start.js
5.  scripts/dist.js
6.  src/main/main.js
7.  src/main/exporter.js
8.  src/main/window-bounds.js
9.  src/renderer/index.html
10. src/renderer/editor.html
11. src/renderer/area-select.html
12. src/renderer/control-panel.html
13. src/renderer/frame-overlay.html
14. src/renderer/css/theme.css
15. src/renderer/js/app.js
16. src/renderer/js/editor.js
17. src/renderer/js/area-select.js
18. src/renderer/js/control-panel.js
```

⚠️ Para el archivo `.gitignore` (empieza con punto): GitHub sí permite
nombres que empiezan con punto en el campo de nombre, solo escríbelo tal
cual.

## Verificación final

Cuando termines los 10, tu repo en GitHub debe verse así (usa la vista de
archivos del repo para comparar):

```
capit/
├── .gitignore
├── package.json
├── build/
│   └── LEEME-ICONO.txt
├── scripts/
│   ├── start.js
│   └── dist.js
└── src/
    ├── main/
    │   ├── main.js
    │   ├── exporter.js
    │   └── window-bounds.js
    └── renderer/
        ├── index.html
        ├── editor.html
        ├── area-select.html
        ├── control-panel.html
        ├── frame-overlay.html
        ├── css/theme.css
        └── js/
            ├── app.js
            ├── editor.js
            ├── area-select.js
            └── control-panel.js
```

Si algo no coincide, entra al archivo con problema en GitHub → ícono de
lápiz (Edit) → corrige o vuelve a pegar el contenido completo → Commit.

## Siguiente paso

Sigue con `README-2-REQUISITOS-PC.md` para preparar tu computador antes de
descargar el proyecto desde GitHub.
