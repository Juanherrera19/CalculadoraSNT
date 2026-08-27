# Calculadora de Tarifas de Transporte de Gas (SNT)

Sitio estático (HTML/CSS/JS puro, sin backend ni build) que replica la
calculadora de tarifas de transporte de gas del Sistema Nacional de
Transporte. Modela **TGI y Promigas**; los demás transportadores del SNT
(Promioriente, Progasur, Transmetano, Coinogas, Transoccidente) no están
incluidos.

## Cómo usarla

Abre `index.html` directamente en el navegador, o publícala en GitHub Pages:

1. Sube esta carpeta a un repositorio de GitHub.
2. En **Settings → Pages**, selecciona la rama y la carpeta raíz (`/`).
3. GitHub publicará el sitio en `https://<usuario>.github.io/<repo>/`.

No requiere `npm install` ni ningún paso de compilación.

## Estructura

```
index.html                  interfaz (formulario + resultados + mapa)
css/style.css               estilos (tema claro fijo)
js/data.js                  tramos y tarifas vigentes — GENERADO, no editar a mano
js/colombia.js              croquis de Colombia — GENERADO, no editar a mano
js/ubicaciones.js           lat/lon aproximada de cada punto (sí se edita a mano)
js/graph.js                 motor de cálculo: grafo de la red, ruta y costo
js/mapa.js                  mapa geográfico: croquis, gasoductos y flujo animado
js/app.js                   conecta el formulario y el mapa con el motor de cálculo
tools/sincronizar_datos.py  regenera js/data.js desde la hoja TRAMOS del Excel
tools/actualizar_excel.py   reconstruye CALCULADORA, Calculo, la matriz y listas
tools/generar_croquis.py    regenera js/colombia.js desde los límites de geoBoundaries
docs/CALCULADORA_TARIFAS_2026.xlsx   el Excel (fuente de las tarifas)
```

El sitio en sí no tiene dependencias: los dos scripts de `tools/` solo se usan
para mantener el Excel y los datos en sincronía, y necesitan Python + openpyxl.

## Cómo calcula la tarifa

1. La red de tramos (`js/data.js`) se modela como un grafo. Cada operador
   (TGI, Promigas) forma un árbol de tramos sin ciclos, así que entre
   cualquier par de puntos de una misma red existe **una única ruta**,
   encontrada por búsqueda en anchura (BFS) en `graph.js`.
2. Por cada tramo de la ruta:
   - `Fijo ponderado = Fijos_tramo × %CF`
   - `Variable ponderado = Variables_tramo × (1 − %CF)`
   - `AOM` se suma completo, sin ponderar por %CF.
3. Si la ruta usa tramos de TGI y/o de Promigas, se suma **una vez** la
   estampilla de cada operador usado (ponderada de la misma forma).
4. **Cada transportador liquida sus propios cargos** sobre su propia base
   (sus tramos + su estampilla):

   | Transportador | Cuota de fomento | Impuesto local | |
   |---|---|---|---|
   | TGI | 3% por defecto | 0% / 2% / 6% | **editable en el formulario** |
   | Promigas | 3% | 6% | automático |

   ```
   base_T     = Σ (Fijo pond. + Variable pond. + AOM) de sus tramos + su estampilla
   fomento_T  = base_T × % fomento del transportador
   impuesto_T = base_T × % impuesto del transportador
   total_T    = base_T + fomento_T + impuesto_T
   Total      = Σ total_T
   ```
5. Conversión a USD dividiendo por la TRM ingresada.

### Rutas entre redes distintas

Las dos redes no comparten puntos. Si eliges un origen y un destino en redes
distintas, la calculadora arma una **ruta combinada**: lleva cada punto hasta
el **punto de entrada** de su propia red y suma las dos rutas, cobrando
**ambas estampillas, ambas cuotas de fomento y ambos impuestos**.

| Red | Punto de entrada |
|---|---|
| TGI | `Ballenas_tgi` |
| Promigas | `Ballenas_prom` |

## Mapa

Mapa geográfico sobre el croquis de Colombia, con los colores de la lámina
oficial del SNT (TGI en rojo `#e2231a`, Promigas en azul `#1c4f9c`, relleno
`#c3c9dd`). Incluye Panamá, Venezuela, el lago de Maracaibo y los bloques
marinos como contexto, sin nombres. Los ductos se dibujan curvos siguiendo
puntos de paso, no como rectas. La ruta calculada se resalta con un
flujo animado que corre del origen al destino, y puedes hacer clic en cualquier
punto para asignarlo como origen o destino (alternando).

El mapa se recorta en cuadrado sobre la zona donde hay red, y arriba a la
derecha un localizador muestra el país completo con un marco señalando la zona
que se está viendo. El recorte, el localizador y la separación de los nombres
se calculan solos a partir de los datos.

- `js/colombia.js` (el croquis) se genera con `python tools/generar_croquis.py`
  a partir de los límites de [geoBoundaries](https://www.geoboundaries.org/)
  (COL ADM0 y ADM1). No lo edites a mano.
- `js/ubicaciones.js` tiene la lat/lon de cada punto (`UBICACIONES`) y los
  puntos de paso de los ductos (`TRAZADOS`). **Son aproximados**: se trazaron a
  ojo sobre la lámina oficial, no vienen de una fuente georreferenciada del
  operador. Puedes ajustarlos libremente — **no afectan el cálculo de la
  tarifa**, solo el dibujo.
- El lago de Maracaibo y los bloques marinos también son aproximados y están en
  `tools/generar_croquis.py` (no existen en los datasets públicos).
- La animación se desactiva sola si el sistema tiene activado "reducir
  movimiento".
- Los tramos sin puntos de paso definidos se curvan con una desviación
  derivada de un hash de su nombre, así que el dibujo es siempre el mismo; no
  cambia entre recargas ni entre navegadores.

## Actualizar tarifas

La fuente de las tarifas es la hoja **`TRAMOS`** de
`docs/CALCULADORA_TARIFAS_2026.xlsx`. Para actualizarlas:

1. Edita la hoja `TRAMOS` en el Excel (tramos y, si aplica, las estampillas de
   la tabla auxiliar de la derecha).
2. Regenera los datos de la web:

```bash
python tools/sincronizar_datos.py
```

No edites `js/data.js` a mano: se sobrescribe. Los nombres de los puntos deben
coincidir exactamente entre tramos para que el grafo quede conectado.

Si cambias la **fórmula** de cálculo, hay que cambiarla en los dos sitios —
`js/graph.js` y `tools/actualizar_excel.py` (y luego correr ese script) — para
que el Excel y la web no queden descuadrados.

## Supuestos a validar

Estos valores se tomaron de la información entregada (tarifas SNT vigentes)
y de la descripción pública de la calculadora original. Verifícalos contra
la resolución CREG vigente antes de usarlos en producción:

- Cuota de fomento 3% e impuesto local 6% fijos para Promigas.
- Impuesto local de TGI: opciones de 0%, 2% y 6%.
- Combinaciones estándar de %CF: 100/0, 85/15 (estándar), 70/30, 50/50, 30/70, 15/85, 0/100.
- Que el fomento y el impuesto se sumen de forma aditiva sobre la base de cada
  transportador (y no en cascada uno sobre el otro).
- Que las rutas entre redes distintas se liquiden llevando cada punto al punto
  de entrada de su red.
- El archivo Excel del usuario (hoja "Tramos SNT 2026") es la fuente de las tarifas por tramo.
