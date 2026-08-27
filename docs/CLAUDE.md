# CLAUDE.md — Calculadora de Tarifas de Transporte de Gas (SNT)

> Punto de entrada para Claude Code. Lee esto primero. Para detalle, ve a `docs/`.

## Qué es este proyecto

Réplica propia (HTML/CSS/JS estático, sin backend) de una calculadora pública de
tarifas de transporte de gas natural en Colombia:
https://comercialgaskr.github.io/Calculadora-de-Tarifas/

Calcula el costo unitario de transportar gas entre un punto de origen y un punto
de destino de la red SNT (Sistema Nacional de Transporte). **Solo se modelan
TGI y Promigas** (ver `docs/DECISIONES.md` D12): cargos fijos, variables, AOM,
estampillas, cuota de fomento e impuestos locales regulados por la CREG.

Este mismo trabajo produjo **dos entregables en paralelo**:

1. Un **Excel simplificado** (`CALCULADORA_TARIFAS_2026.xlsx`) — entregado al
   usuario por chat, **no vive en este repositorio**. Ver `docs/CONTEXTO_PROYECTO.md`.
2. La **réplica web** (este repositorio) — `index.html` + `css/` + `js/`.

## Objetivo principal

Que el usuario tenga, en su propio repositorio, una calculadora funcional y
mantenible (sin depender del sitio original de terceros), publicable en
GitHub Pages, con la misma lógica de cálculo que su Excel de tarifas vigentes.

## Estado actual (resumen — detalle en `docs/ESTADO_ACTUAL.md`)

- ✅ Réplica web funcional: calcula la ruta automáticamente y el costo COP/USD.
  Verificada contra el Excel recalculado en Excel real (COM): resultados
  idénticos en 4 escenarios de prueba (diferencia < 1e-11 COP).
- ✅ **Solo TGI y PROMIGAS** (D12, 2026-08-27): PROMIORIENTE se eliminó de
  todo el proyecto. Quedan 32 tramos (25 TGI + 7 PROMIGAS) y 34 nodos.
- ✅ **Cargos por transportador** (D8): la cuota de fomento y el impuesto local
  se liquidan por transportador, no sobre el costo base global.
  TGI editable; PROMIGAS fijo en 3% fomento / 6% impuesto.
- ✅ Archivos en esta carpeta: `index.html`, `css/style.css`, `js/data.js`,
  `js/colombia.js`, `js/ubicaciones.js`, `js/graph.js`, `js/mapa.js`,
  `js/app.js`, `README.md`, y en `tools/`: `actualizar_excel.py`,
  `sincronizar_datos.py`, `generar_croquis.py`.
- ✅ El Excel `CALCULADORA_TARIFAS_2026.xlsx` **sí vive ahora en `docs/`**
  (el usuario lo copió ahí), junto con `..._respaldo_v1.xlsx` (modelo anterior).
- ✅ **Ruta combinada** (D10): si Origen y Destino están en redes distintas,
  se suman las dos rutas hasta el punto de entrada de cada red y se cobran
  ambas estampillas, ambos fomentos y ambos impuestos.
- ✅ **Mapa geográfico del SNT** (D13): `js/mapa.js` dibuja el croquis real de
  Colombia (`js/colombia.js`, generado) con los gasoductos ubicados por lat/lon
  (`js/ubicaciones.js`), **tramos curvos con waypoints** (`TRAZADOS`), contexto
  geográfico (Panamá, Venezuela, lago de Maracaibo y bloques marinos, sin
  nombres) y colores de la lámina oficial (TGI `#e2231a`, PROMIGAS `#1c4f9c`,
  relleno `#c3c9dd`). Ruta resaltada con flujo animado, selección por clic,
  recorte cuadrado y localizador del país (café) arriba a la derecha.
- ✅ **Paleta rediseñada** (D14): azul marino + blanco + grises, con verde y
  azul de acento. **Tema claro fijo**: la página no sigue `prefers-color-scheme`
  (no hay modo oscuro, a petición del usuario).
- ❌ **No implementado todavía**: tabla de sensibilidad por %CF y tabla de
  "base de datos regulada por ruta" (todas las rutas a la vez).
  El sitio original sí los tenía (según descripción
  obtenida por WebFetch; su código fuente real nunca se pudo inspeccionar,
  el repo `github.com/comercialgaskr/Calculadora-de-Tarifas` devolvió 404).
- ⚠️ No se ha inicializado un repositorio git en esta carpeta todavía
  (`PENDIENTE DE CONFIRMAR` si el usuario ya lo hizo por su cuenta).
- ⚠️ Varios parámetros regulatorios (cuota de fomento 3%, impuesto local
  0/2/6%, combos de %CF) son **supuestos** tomados de la descripción del sitio
  original, no verificados contra el texto exacto de la resolución CREG vigente.

**Última tarea realizada (2026-08-27):** (1) PROMIORIENTE eliminado de todo
(D12), (2) mapa rehecho como mapa geográfico de Colombia con flujo animado
(D13), (3) paleta de la interfaz rediseñada (D14), (4) la matriz del Excel
ahora se genera con BFS. Los dos motores validados entre sí en 6 escenarios.
Siguiente: `docs/PROXIMOS_PASOS.md`.

## Reglas importantes para trabajar en este proyecto

- **No reinventar el motor de cálculo.** La lógica de tarifas (peso %CF sobre
  Fijos/Variables, AOM siempre al 100%, estampilla una sola vez por
  transportador usado en la ruta, y **cuota de fomento + impuesto local
  liquidados por transportador sobre su propia base**) ya está implementada y
  validada en `js/graph.js` y replicada en el Excel. Si hay que ajustarla,
  hacerlo en **ambos** lugares: `js/graph.js` y `tools/actualizar_excel.py`
  (después correr el script), para que no queden descuadrados.
- **Porcentajes por transportador** (ver `docs/DECISIONES.md` D8): TGI usa los
  que el usuario elija en la interfaz; PROMIGAS usa 3% de fomento y 6% de
  impuesto, fijos. En la web están en `CONFIG_TRANSPORTADOR` (`js/graph.js`);
  en el Excel, en `Calculo!B10` y `Calculo!B11`.
- **Solo TGI y PROMIGAS** (`docs/DECISIONES.md` D12). Agregar un transportador
  implica: sus tramos en la hoja `TRAMOS`, su entrada en `CONFIG_TRANSPORTADOR`
  (`js/graph.js`) **y** en `CONFIG`/`ORDEN_TRANSPORTADORES`
  (`tools/actualizar_excel.py`), y las coordenadas de sus puntos en
  `js/ubicaciones.js`.
- **No usar frameworks ni build step.** Es un sitio estático puro (HTML/CSS/JS
  sin dependencias), pensado para abrirse directo o publicarse en GitHub Pages
  sin `npm install`. Ver decisión en `docs/DECISIONES.md` (D1).
- **La fuente de tarifas es la hoja `TRAMOS`** de
  `docs/CALCULADORA_TARIFAS_2026.xlsx` (34 tramos + 2 filas de estampilla,
  originalmente de la hoja "Tramos SNT 2026" del Excel viejo). `js/data.js`
  **se genera** desde ahí con `python tools/sincronizar_datos.py` — no editarlo
  a mano. Si el usuario trae tarifas nuevas: actualizar `TRAMOS` y correr el
  script.
- **La red son 2 árboles disjuntos (sin ciclos)**: TGI y PROMIGAS. El
  pathfinding usa BFS + XOR de caminos desde una raíz — no cambiar este enfoque
  sin entender por qué se eligió (ver `docs/DECISIONES.md` D5). Las raíces son
  los **puntos de entrada**: `Ballenas_tgi` y `Ballenas_prom`.
- **Rutas entre redes distintas** (`docs/DECISIONES.md` D10): no dan error —
  se suman las dos rutas hasta el punto de entrada de cada red, con ambas
  estampillas, ambos fomentos y ambos impuestos. El mapa y el Excel también.
- **El mapa es geográfico** (`docs/DECISIONES.md` D13). El croquis
  (`js/colombia.js`) **se genera** con `python tools/generar_croquis.py` — no
  editarlo a mano. Las coordenadas de los puntos sí van a mano en
  `js/ubicaciones.js`, y son **aproximadas**: no se usan para calcular.
- **La matriz de pertenencia del Excel ya no se escribe a mano**: la recalcula
  con BFS `tools/actualizar_excel.py` cada vez que corre.
- **La fuente del sitio original SÍ es accesible** (`docs/DECISIONES.md` D27):
  `https://comercialgaskr.github.io/Calculadora-de-Tarifas/cargos_data.js`.
  El repo da 404, pero Pages sirve los archivos. Las tarifas de TGI y PROMIGAS
  ya están alineadas con esa fuente.
- **Los tramos "en cero" llevan 0,00001, no cero** (`docs/DECISIONES.md` D28).
  Cualquier filtro sobre ellos debe comparar contra un umbral, no contra 0.
- **No inventar valores regulatorios.** Todo lo marcado `PENDIENTE DE CONFIRMAR`
  en `docs/` debe verificarse contra la resolución CREG real antes de darlo
  por definitivo — no asumir que ya está validado.
- **No repetir soluciones descartadas.** Ver `docs/PROBLEMAS_Y_SOLUCIONES.md`
  antes de tocar fórmulas de Excel (hay errores ya resueltos ahí, p. ej. el
  prefijo `_xlfn.` para funciones nuevas de Excel escritas con openpyxl).

## Arquitectura general

```
index.html   → estructura de la página (formulario + resultados)
css/style.css → estilos, con modo claro/oscuro vía prefers-color-scheme
js/data.js      → tramos (32) + estampillas (2) + nodos (34)  [GENERADO]
js/colombia.js  → croquis de Colombia: país + departamentos     [GENERADO]
js/ubicaciones.js → lat/lon aproximada de cada punto + TRAZADOS (waypoints)
js/graph.js     → motor: grafo, BFS de ruta (directa o combinada), cálculo
js/mapa.js      → mapa geográfico: croquis, gasoductos, flujo animado, clic
js/app.js       → conecta el formulario del DOM con js/graph.js y js/mapa.js
README.md       → instrucciones de uso/publicación + supuestos a validar
tools/actualizar_excel.py   → reconstruye CALCULADORA, Calculo, la matriz y listas
tools/sincronizar_datos.py  → regenera js/data.js desde la hoja TRAMOS
tools/generar_croquis.py    → regenera js/colombia.js desde geoBoundaries
tools/servidor_local.py     → servidor de desarrollo SIN caché (usar este)
docs/CALCULADORA_TARIFAS_2026.xlsx → el Excel (fuente de tarifas)
```

Flujo: `app.js` lee el formulario → llama a `Tarifas.calcular(...)` en
`graph.js` → `graph.js` usa `TARIFAS_DATA` de `data.js` para encontrar la
ruta (BFS; si los extremos están en redes distintas arma la ruta combinada,
ver `docs/DECISIONES.md` D10) y sumar los cargos → `app.js` pinta el resultado
en el DOM y le pasa los tramos usados a `Mapa.actualizar(...)` para resaltarlos.

## Convenciones

- Nombres de puntos (nodos) deben coincidir **exactamente** (mayúsculas,
  guiones bajos, tildes) entre todos los tramos de `js/data.js` para que el
  grafo quede conectado — igual que en la hoja `TRAMOS` del Excel.
- Comentarios y textos de UI en español (así están todos los archivos).
- **Estructura de la página** (`docs/DECISIONES.md` D16 y D17): títulos sin
  numerar; el mapa va en el panel de resultado pero **fuera de `#results`**
  (debe poder clicarse sin ruta elegida); leyenda en caja plegable abajo a la
  derecha del mapa; tabla en ventana flotante. Si se agranda la caja de
  referencias, verificar que no tape nada del mapa.
- **La calculadora arranca sin origen ni destino** (D17). No volver a
  preseleccionarlos.
- **No hay botón de calcular** (`docs/DECISIONES.md` D18): todo recalcula al
  cambiar cualquier opción.
- **Las animaciones del mapa NO se apagan con `prefers-reduced-motion`** (D18),
  a petición expresa del usuario: quiere movimiento constante.
- **Impuesto local de TGI por defecto: 6%** (D18) y **%CF por defecto 0/100**
  (D24), iguales en la web y el Excel. Si cambias un valor por defecto en uno,
  cámbialo en el otro y vuelve a validar: los totales de referencia se mueven.
- **Para probar en el navegador usa `python tools/servidor_local.py`**
  (`docs/DECISIONES.md` D22). Con `python -m http.server` el navegador cachea
  `css/` y `js/` y se ven versiones viejas: ya hizo dar por fallidos dos
  cambios que estaban bien.
- **La tabla de resultados tiene una estructura fija** que dio el usuario
  (`docs/DECISIONES.md` D15). En su fila `Total (COP)` la última columna es
  mayor que la suma de las otras tres a propósito: incluye fomento e impuesto,
  que no tienen desglose por componente. No "corregirlo".
- **Sin modo oscuro** (`docs/DECISIONES.md` D14). No reintroducir un bloque
  `prefers-color-scheme: dark` sin que el usuario lo pida.
- **Colores solo por variables CSS** de `:root`; nada en crudo.
- Formato de números: COP con `toLocaleString("es-CO", ...)`, USD con
  `toLocaleString("en-US", ...)` con 4 decimales.

## Restricciones importantes

- No hay backend ni API — todo el cálculo ocurre en el navegador del usuario.
- No se debe depender de conexión a internet para calcular (solo para
  cargar Google Fonts si se llegaran a usar, que hoy no se usan).
- El Excel (`CALCULADORA_TARIFAS_2026.xlsx`) vive en `docs/`. El script
  original que lo generó (`build_excel.py`) se perdió con el entorno cloud
  anterior; en su lugar hay `tools/actualizar_excel.py`, que **reescribe** las
  hojas `CALCULADORA` y `Calculo` (incluida la matriz de pertenencia, que se
  recalcula con BFS) y las columnas de nodos de `listas`, sin tocar `TRAMOS`.
- Para validar fórmulas del Excel se usa **Excel real vía COM** (PowerShell);
  LibreOffice no está instalado en esta máquina.

## Antes de modificar código

Lee, en este orden:
1. `docs/CONTEXTO_PROYECTO.md` — qué es esto y por qué existe.
2. `docs/ESTADO_ACTUAL.md` — qué funciona, qué no, qué está bloqueado.
3. `docs/DECISIONES.md` — decisiones ya tomadas (no las repropongas sin motivo nuevo).
4. `docs/PROBLEMAS_Y_SOLUCIONES.md` — errores ya resueltos, para no repetirlos.
5. `docs/PROXIMOS_PASOS.md` — qué sigue, en orden de prioridad.
