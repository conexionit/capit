# CAPIT — Qué instalar en tu computador (Windows 10/11)

Sigue esto una sola vez. Después de esto tu PC queda lista para trabajar en
CAPIT y en cualquier otro proyecto de escritorio de Conexión IT a futuro.

## 1. Node.js (obligatorio)

```
1. Ve a https://nodejs.org
2. Descarga la versión "LTS" (la recomendada, botón grande a la izquierda)
3. Ejecuta el instalador descargado → Next, Next, Next → Finish
4. Reinicia el PC (recomendado, no siempre obligatorio)
```

Verifica que quedó instalado — abre "Símbolo del sistema" (cmd) o
PowerShell y escribe:

```
node --version
npm --version
```

Debe mostrarte un número de versión en ambos (ej. `v20.11.0`). Si dice
"no se reconoce como comando", reinicia el PC e intenta de nuevo.

## 2. Git (obligatorio, para clonar el repo)

```
1. Ve a https://git-scm.com/download/win
2. Se descarga automático el instalador → ejecútalo
3. Deja todas las opciones por defecto → Next varias veces → Install
```

Verifica:
```
git --version
```

## 3. Visual Studio Build Tools (obligatorio para compilar uiohook-napi)

Este paso es el más largo pero solo se hace una vez.

```
1. Ve a https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. Descarga "Build Tools for Visual Studio"
3. Ejecuta el instalador
4. En la pantalla de selección de cargas de trabajo, marca:
   ☑ Desarrollo de escritorio con C++
5. Click "Instalar" (abajo a la derecha) — pesa varios GB, puede tardar
6. Al terminar, reinicia el PC
```

## 4. Cuenta de GitHub (ya la tienes)

Solo confirma que puedes iniciar sesión en https://github.com con tu
usuario.

## 5. Espacio en disco

Deja al menos 3 GB libres para `node_modules` y los archivos temporales
que genera CAPIT al descargar sus componentes internos.

## Checklist final antes de continuar

```
[ ] node --version funciona
[ ] npm --version funciona
[ ] git --version funciona
[ ] Visual Studio Build Tools instalado con "Desarrollo de escritorio con C++"
[ ] Puedo entrar a mi cuenta de GitHub desde el navegador
```

Si los 5 puntos están listos, continúa con
`README-3-EJECUTAR-Y-EMPAQUETAR.md`.
