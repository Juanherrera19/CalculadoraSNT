# Problemas y Soluciones

Registro de problemas técnicos encontrados durante la construcción de los
dos entregables (Excel + réplica web). **Léelo antes de tocar el motor de
cálculo o el generador del Excel**, para no repetir intentos que ya
fallaron.

---

## P1. `AttributeError: 'MergedCell' object attribute 'value' is read-only` al generar el Excel

**Problema:** al construir la hoja `CALCULADORA` con openpyxl, se intentó
escribir un valor auxiliar en la columna `D` de las filas de inputs, pero
esas celdas ya habían sido fusionadas (`merge_cells(f"C{r}:D{r}")`) para
mostrar el valor del dropdown a lo ancho.

**Causa:** en openpyxl, una vez fusionado un rango, solo la celda superior
izquierda es escribible; las demás celdas del rango (`MergedCell`) son de
solo lectura. El código intentaba escribir en `D{r}`, que ya era parte de
la fusión `C{r}:D{r}`.

**Intentos realizados:**
- ❌ Escribir directamente en `ws_m[f"D{r}"] = ...` → falla con
  `AttributeError`.

**Qué NO funcionó:** seguir usando la columna `D` para los valores
auxiliares numéricos (helper values que alimentan la hoja `Calculo`).

**Qué funcionó:** mover esos valores auxiliares a la **columna `H`** (no
fusionada, y luego ocultada con `ws_m.column_dimensions["H"].hidden = True`),
y actualizar las fórmulas de la hoja `Calculo` para leer de
`CALCULADORA!H5:H9` en vez de `CALCULADORA!D5:D9`.

**Estado actual:** resuelto. La hoja `CALCULADORA` usa la columna `H` (oculta)
como puente numérico entre los dropdowns (columna `C`, con etiquetas tipo
"85% Fijo / 15% Variable (estandar)") y la hoja `Calculo` (que necesita el
número `0.85`, no el texto).

---

## P2. Fórmula `TEXTJOIN(...IF(...))` para el texto de la ruta devolvía `#VALUE!`

**Problema:** la celda que arma el texto de "tramos utilizados"
(`Calculo!B71`, referenciada desde `CALCULADORA!C13`) usa
`TEXTJOIN(" -> ", TRUE, IF(rango_incluido=1, rango_nombres, ""))` — una
fórmula que necesita evaluarse en contexto de arreglo (la parte `IF` opera
sobre un rango completo, no sobre una celda).

**Causa:** escrita como fórmula normal (no de arreglo), Excel/LibreOffice no
evalúa el `IF` sobre todo el rango, y falla.

**Intentos realizados:**
1. ❌ Fórmula normal (`ws_c[...] = "=IF(...)"` como string plano) →
   recalculada con LibreOffice headless, dio **`#VALUE!`**.
2. ❌ Envolver la fórmula en `openpyxl.worksheet.formula.ArrayFormula` pero
   dejando el nombre de función como `TEXTJOIN` (sin prefijo) → recalculada,
   dio **`#NAME?`** (LibreOffice no reconoció la función).

**Qué NO funcionó:** usar `TEXTJOIN` sin el prefijo `_xlfn.` al escribir el
archivo directamente con openpyxl (fuera de una sesión real de Excel).

**Qué funcionó:**
- Envolver la fórmula en `ArrayFormula` **Y ADEMÁS** prefijar la función con
  `_xlfn.` → `_xlfn.TEXTJOIN(" -> ", TRUE, IF(...))`. Recalculada con
  LibreOffice, devolvió el texto correcto de la ruta
  (`"Ballenas_prom - La Mami -> La Mami - Barranquilla -> ..."`).

**Por qué pasa esto:** las funciones de Excel introducidas después de
Excel 2007 (p. ej. `TEXTJOIN`, de Excel 2016) se guardan internamente en el
XML del archivo con el prefijo `_xlfn.` cuando el archivo es generado
directamente (no por una sesión real de Excel que las traduce
automáticamente al guardar). El archivo original del usuario ya mostraba
este patrón con funciones más nuevas (`_xlfn.VSTACK`, `_xlfn._xlws.FILTER`,
`_xlfn._xlws.SORT`), lo cual fue la pista para la solución.

**Estado actual:** resuelto. **Regla a mantener:** cualquier función de
Excel 2016+ escrita con openpyxl debe llevar el prefijo `_xlfn.` (y algunas
funciones de arreglos dinámicos de Excel 365 necesitan además
`_xlfn._xlws.`, como se ve en fórmulas del archivo original). Si en el
futuro se agregan más fórmulas con funciones modernas (`XLOOKUP`, `FILTER`,
`UNIQUE`, etc.) al Excel, aplicar el mismo prefijo y probar con LibreOffice
headless antes de dar por buena la fórmula.

---

## P3. Encontrar la ruta entre dos puntos en una red con bifurcaciones, dentro de fórmulas de Excel

**Problema:** Excel no tiene una función nativa de "camino más corto en un
grafo". Había que encontrar, para un Origen y Destino cualquiera (37 nodos
posibles), la secuencia de tramos entre ellos, usando solo fórmulas.

**Intentos realizados:**
- Se descartó reimplementar el mecanismo del archivo original (columna `Y`
  marcada a mano en `Tabla Tarifas x Tramo`) — ya se había comprobado que
  estaba desactualizado/roto (ver `docs/DECISIONES.md` D3).

**Qué funcionó:**
1. Se verificó (en Python) que la red son 3 árboles sin ciclos (nodos =
   aristas + 1 en cada componente).
2. Se calculó, para cada uno de los 37 nodos, el conjunto de tramos entre
   ese nodo y la raíz de su componente (BFS), y se volcó como una matriz
   estática 0/1 (37 filas × 34 columnas) dentro de la hoja `Calculo`
   (encabezado en fila 80, datos en filas 81-117, columnas `C` a `AJ`).
3. La inclusión de un tramo en la ruta = diferencia absoluta entre el flag
   del origen y el flag del destino para ese tramo
   (`ABS(flag_origen - flag_destino)`), usando `INDEX`/`MATCH` para ubicar
   la fila de cada nodo en la matriz.
4. Se agregó una verificación previa de "misma red" (comparando el id de
   componente de origen y destino) para evitar resultados sin sentido
   cuando no hay ruta (ver P4).

**Estado actual:** resuelto y verificado con 2 rutas de prueba (una directa
dentro de una rama, otra que cruza una bifurcación). Ver
`docs/DECISIONES.md` D5 para el detalle del algoritmo.

---

## P4. El XOR de caminos no distingue "sin ruta" de "ruta válida"

**Problema:** si Origen y Destino están en **componentes distintos** del
grafo (p. ej. uno en la red TGI y otro en PROMIGAS sin conexión), la
diferencia simétrica de sus caminos hacia sus respectivas raíces **no da
error** — da un resultado numérico sin sentido (mezcla tramos de caminos
hacia raíces distintas).

**Causa:** el método XOR asume implícitamente que ambos nodos comparten la
misma raíz/componente; no lo valida por sí solo.

**Qué NO funcionó (evitado a propósito):** confiar en que un resultado
"vacío" o "cero" de la fórmula XOR indicaría automáticamente que no hay
ruta — no es así, puede dar un conjunto de tramos que no forma una ruta real.

**Qué funcionó:** agregar una comprobación explícita **antes** de calcular
cualquier tramo incluido:
- Buscar el id de componente (`Red`) de Origen y de Destino.
- Si son iguales → `"SI"` (ruta válida, se procede con el cálculo).
- Si son distintos → `"NO - Origen y Destino no estan en la misma red de
  gasoductos"` (se muestran ceros en todos los resultados).
- Si Origen = Destino → `"ORIGEN = DESTINO"` (caso especial, se maneja
  antes que el anterior).

Implementado en **ambos** entregables:
- Excel: `Calculo!B16` (`Ruta valida?`), gatea la columna `Incluido` de la
  tabla de detalle por tramo (`Calculo!G19:G52`).
- JS: `findPath()` en `js/graph.js` devuelve
  `{ok:false, reason:"SIN_RUTA"}` o `{ok:false, reason:"ORIGEN_IGUAL_DESTINO"}`
  antes de intentar cualquier cálculo.

**Estado actual:** resuelto y probado.

> ⚠️ **ACTUALIZADO el 2026-08-26 (ver `docs/DECISIONES.md` D10):** la
> comprobación de "misma red" **sigue existiendo y sigue siendo necesaria**,
> pero ya **no bloquea el cálculo**. Ahora decide entre dos fórmulas:
> misma red → XOR (`ABS(fo - fd)`); redes distintas → **suma** (`fo + fd`),
> que arma la ruta combinada hasta el punto de entrada de cada red. El caso
> Barranca → Cartagena ya no da error: da 12.383,78 COP con las dos
> estampillas, los dos fomentos y los dos impuestos.

---

## P5. No se pudo acceder al código fuente del sitio original

**Problema:** se intentó inspeccionar el repositorio de GitHub del sitio
original para replicar su lógica exacta.

**Intentos realizados:**
- ❌ `WebFetch` a `https://github.com/comercialgaskr/Calculadora-de-Tarifas`
  → **404** (repo no encontrado con ese nombre/mayúsculas).
- ❌ `WebSearch` de `"comercialgaskr Calculadora-de-Tarifas github
  repository"` → no devolvió el repositorio correcto (resultados de otros
  proyectos no relacionados).
- ❌ `gh` CLI → no instalado en el entorno (`gh: command not found`).
- ❌ `curl` directo a la API de GitHub (`api.github.com/repos/...`) →
  `403`, con mensaje "sessions are bound to their configured repositories"
  (el entorno de la sesión no tenía ese repo vinculado para usar la API sin
  restricciones).

**Qué funcionó (alternativa, no el objetivo original):** `WebFetch` **a la
página renderizada** (`https://comercialgaskr.github.io/Calculadora-de-Tarifas/`)
sí funcionó y dio una descripción textual de los inputs/outputs de la
calculadora (ver `docs/CONTEXTO_PROYECTO.md`). Esa descripción, combinada
con los datos del Excel del usuario, fue la base para reconstruir la lógica.

**Estado actual: sin resolver del todo — es una limitación conocida, no un
bloqueo.** La lógica de cálculo de la réplica es una reconstrucción
razonada, **no una copia verificada** del sitio original. Si en el futuro
aparece el repositorio real (URL correcta, u otro nombre de usuario/repo),
habría que comparar y ajustar. No repetir los mismos intentos de búsqueda
sin nueva información (p. ej., preguntar directamente al usuario si conoce
la URL correcta del repositorio).

---

## P6. Advertencias de openpyxl al leer el Excel original

**Problema:** al abrir `CALCULADORA_TARIFAS_2025.xlsx` con openpyxl aparecían
warnings:
```
UserWarning: Data Validation extension is not supported and will be removed
UserWarning: Print area cannot be set to Defined name: #N/A.
```

**Causa:** el archivo original usa extensiones de validación de datos y un
área de impresión con un nombre definido roto (`#N/A`), específicas del
formato de Excel moderno que openpyxl no soporta del todo al leer.

**Qué se hizo:** no se intentó corregir el archivo original — son solo
advertencias de lectura, no impiden extraer los datos necesarios (valores
de celdas vía `data_only=True`). No aplica al Excel **nuevo** (`Calculo`,
`CALCULADORA`, etc.), que se generó desde cero y no hereda estas advertencias.

**Estado actual:** irrelevante para el proyecto actual — no vuelvas a
intentar "arreglar" estas advertencias, son del archivo original que ya no
se usa directamente (solo se leyeron sus datos).
