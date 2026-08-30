# CAPIT — Descargar, ejecutar, probar y generar el instalador .exe

Requiere que ya hayas terminado `README-2-REQUISITOS-PC.md`.

## 1. Descargar el proyecto desde GitHub a tu PC

Abre PowerShell o "Símbolo del sistema" donde quieras guardar el proyecto
(ej. `Documentos`), y escribe:

```
git clone https://github.com/TU-USUARIO/capit.git
```

(cambia `TU-USUARIO` por tu usuario real de GitHub — o el de la
organización `conexionit` si lo subiste ahí)

Esto crea una carpeta `capit` con todos los archivos.

## 2. Entrar a la carpeta e instalar las librerías

```
cd capit
npm install
```

Esto puede tardar varios minutos la primera vez (descarga los componentes
internos de CAPIT — motor de ventanas, editor de capas, ffmpeg, etc. —
pesa cerca de 300-500 MB en `node_modules`).

Si ves errores relacionados con "gyp", "MSBuild" o "Visual Studio", vuelve
a `README-2-REQUISITOS-PC.md` y confirma el paso 3 (Build Tools).

## 3. Ejecutar la app en modo desarrollo (probarla)

```
npm start
```

Se abre la ventana de CAPIT. Prueba:

```
[ ] Botón "Nueva grabación" → elegir "Una ventana completa" muestra la
    lista de ventanas abiertas
[ ] Al elegir una ventana y dar "Iniciar grabación": aparece un marco
    azul alrededor de esa ventana + un panel flotante arriba a la derecha
    (la ventana principal de CAPIT NO se minimiza)
[ ] Haz clic dentro de la ventana marcada — el contador de "pasos
    capturados" del panel flotante sube en vivo
[ ] Botón "Pausar" del panel — verifica que deja de contar pasos aunque
    sigas haciendo clic; "Reanudar" vuelve a contar
[ ] Mueve o cambia de tamaño la ventana grabada — el marco azul debe
    seguirla (se actualiza cada segundo)
[ ] Botón "Nueva grabación" → "Un área de la pantalla": debe verse un
    overlay para arrastrar un rectángulo; suéltalo y confirma que arranca
    igual que el modo ventana (marco azul + panel flotante)
[ ] Botón "Detener" del panel (o Ctrl+Shift+S): el proyecto se guarda
    solo y se abre el Editor automáticamente
[ ] En el Editor: selecciona un paso, agrega una capa (Texto, Flecha,
    Resaltado, Número), mueve la capa con el mouse, click en "Guardar paso"
[ ] Prueba "Exportar Word" y "Exportar PDF" — revisa que el archivo se
    genera dentro de la carpeta del proyecto
[ ] Prueba "Exportar Video" — puede tardar unos segundos, revisa que
    capit-video.mp4 se genera y se reproduce
```

Si algo falla, copia el mensaje de error de la consola (se abre sola si
hay un error, o revisa la ventana de PowerShell donde corriste `npm
start`) y compártelo para corregirlo antes de generar el instalador.

## 4. Agregar el ícono (opcional pero recomendado)

Antes de empaquetar, reemplaza `build/LEEME-ICONO.txt` con un archivo real
`build/icon.ico` (256x256) con el logo de Conexión IT. Si no lo haces, el
instalador se genera igual con un ícono genérico.

## 5. Generar el instalador .exe

```
npm run dist
```

Esto puede tardar varios minutos. Al terminar, busca el instalador en:

```
capit\release\CAPIT Setup 1.0.0.exe
```

Ese es el archivo que compartes o distribuyes — al ejecutarlo instala
CAPIT como cualquier programa de Windows (con acceso directo en el
escritorio y en el menú inicio).

## 6. Probar el instalador

```
[ ] Ejecuta el .exe generado en una carpeta distinta (o en otro PC si
    tienes uno disponible)
[ ] Confirma que se instala sin errores
[ ] Abre CAPIT desde el acceso directo generado
[ ] Repite el checklist de pruebas del paso 3
```

## Actualizaciones futuras

Cuando yo te entregue cambios nuevos al código:

```
1. Reemplaza los archivos modificados en tu carpeta local capit\
   (o vuelve a hacer git pull si ya subiste los cambios a GitHub)
2. npm install   (solo si cambiaron las dependencias en package.json)
3. npm start     (para probar)
4. npm run dist  (para generar el nuevo instalador)
```
