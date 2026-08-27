# Próximos Pasos

Ordenados por prioridad. Cada tarea indica exactamente qué hacer.

---

## 1. Siguiente tarea inmediata

**Confirmar con el usuario tres cosas del mapa nuevo** (`docs/DECISIONES.md` D13):

1. **El efecto de movimiento.** Pidió "el mismo efecto de movimiento del
   repositorio que te mandé", pero el código de ese repositorio nunca se pudo
   inspeccionar (404, ver `docs/PROBLEMAS_Y_SOLUCIONES.md` P5). Lo que hay es
   una reconstrucción: una línea punteada que corre sobre el tramo en el
   sentido origen → destino. Si esperaba otra cosa (p. ej. un punto que viaja,
   o un degradado que avanza), hay que ajustarlo en `js/mapa.js`.
2. **Las coordenadas de los puntos.** `js/ubicaciones.js` las tiene
   **aproximadas**, ubicadas por municipio/campo y por el mapa oficial. Si
   tiene las reales del operador, reemplazarlas ahí (no afectan el cálculo).
3. **El caso `Ballenas_tgi` → `Ballenas_prom`**, que sigue dando **0,00 COP**
   sin estampillas porque los dos extremos son puntos de entrada y ninguna
   ruta aporta tramos. ¿Debería cobrar igual las dos estampillas?

---

## 2. Verificar los supuestos regulatorios contra la CREG

Sigue pendiente leer la resolución vigente para confirmar (ver
`docs/DECISIONES.md` D6, D8 y D10):
- Cuota de fomento 3% e impuesto local 6% fijos para PROMIGAS (los dio el
  usuario, no se leyó la fuente).
- Impuesto local TGI: ¿son 0% / 2% / 6% las únicas opciones?
- Combos de %CF: 100/0, 85/15, 70/30, 50/50, 30/70, 15/85, 0/100.
- Dentro de cada transportador, ¿fomento e impuesto son aditivos sobre su base
  (como se implementó) o alguno va en cascada sobre el otro?
- Si la regla de "dos rutas hasta el punto de entrada" corresponde a la
  metodología real o es una convención comercial del usuario.

---

## 3. Tareas posteriores

### 3.1. Inicializar control de versiones
- Ejecutar `git init` en `C:\PYTHON\PROGRAMAS\CALCULADORA DE TARIFAS` (si
  no existe ya — `PENDIENTE DE CONFIRMAR`, verificar primero con
  `git status` o revisando si existe `.git/`).
- Crear un primer commit con los archivos actuales
  (`index.html`, `css/style.css`, `js/*.js`, `tools/*.py`, `README.md`, el
  Excel de `docs/` y esta documentación). Decidir antes si se conservan los
  dos respaldos (`..._respaldo_v1.xlsx` y
  `..._respaldo_v2_con_promioriente.xlsx`).
- Nota: `js/colombia.js` (33 KB) y `js/data.js` son **generados**, pero
  conviene versionarlos igual: el sitio no tiene paso de compilación y debe
  funcionar recién clonado.
- Preguntar al usuario si quiere conectarlo a un repositorio remoto de
  GitHub (para poder publicar en GitHub Pages).

### 3.2. Publicar en GitHub Pages
- Una vez haya un repositorio remoto, seguir las instrucciones que ya están
  en `README.md` (Settings → Pages → rama y carpeta raíz `/`).
- Verificar que el sitio publicado calcule igual que en local (mismas
  pruebas: Jobo→Ballenas_prom, Medellín→Cali, Barranca→Cartagena,
  Medellín→Jobo — valores esperados en la tabla de `docs/ESTADO_ACTUAL.md`).

### 3.3. Reconciliar contra el sitio original si aparece su código fuente
- Si el usuario consigue la URL correcta del repositorio de
  `comercialgaskr` (el intento anterior dio 404, ver
  `docs/PROBLEMAS_Y_SOLUCIONES.md` P5), comparar su lógica de cálculo
  contra `js/graph.js` y ajustar discrepancias.

---

## 4. Mejoras futuras (funcionalidades del sitio original aún no replicadas)

### 4.1. Tabla de sensibilidad por %CF
Qué hacer: agregar una tabla que muestre el costo total (COP y/o USD) para
la ruta seleccionada, recorriendo **todos** los combos de %CF disponibles
(100/0, 85/15, 70/30, 50/50, 30/70, 15/85, 0/100), no solo el elegido.
Implementación sugerida: en `js/app.js`, llamar `Tarifas.calcular(...)` una
vez por cada valor de %CF (reutilizando `origen`/`destino`/`trm`/
`impuestoPctTGI`/`fomentoPctTGI` ya seleccionados) y pintar una tabla
adicional.

### 4.2. Tabla "base de datos regulada por ruta"
Qué hacer: mostrar una tabla con el costo COP/USD de **todas** las rutas
posibles de la red (no solo la seleccionada). Esto requiere generar todos
los pares Origen-Destino válidos (dentro de la misma componente) y calcular
cada uno. Cuidado con el volumen: con 37 nodos hay potencialmente muchos
pares — decidir si se listan todas las combinaciones o solo rutas
"relevantes" (p. ej. puntos de entrada a puntos de salida conocidos).
`PENDIENTE DE CONFIRMAR` con el usuario qué alcance espera para esta tabla,
ya que el sitio original no se pudo inspeccionar en detalle (solo se tiene
la descripción de que existe).

### 4.3. Mapa del SNT — ✅ HECHO (ver `docs/DECISIONES.md` D13)

Mapa geográfico sobre el croquis de Colombia, con los colores del mapa
oficial, flujo animado sobre la ruta, recorte cuadrado y localizador.

Posibles mejoras futuras (no pedidas): zoom/pan, y mostrar las capacidades
(`Cap Disp Flujo`) sobre cada tramo.

### 4.4. Otras mejoras posibles (no discutidas explícitamente con el usuario, sugerencias)
- Modo oscuro: se eliminó a petición del usuario (D14). Si algún día lo quiere
  de vuelta, hay que reintroducir un bloque que redefina **todas** las
  variables de `:root`, idealmente con un botón manual en vez de seguir la
  preferencia del sistema.
- Tabla de sensibilidad y tabla de rutas reguladas (4.1 y 4.2) son ahora las
  dos únicas funcionalidades del sitio original que siguen sin replicarse.
- Exportar el resultado calculado a PDF o CSV (hoy solo hay botón de
  imprimir, que usa `window.print()`).
- Validación de formulario más rica (p. ej. impedir TRM negativo o cero de
  forma más visible que el actual `trm ? ... : 0`).

Estas últimas no fueron pedidas por el usuario — no implementarlas sin
confirmar que las quiere, para no invertir tiempo en algo fuera de alcance.
