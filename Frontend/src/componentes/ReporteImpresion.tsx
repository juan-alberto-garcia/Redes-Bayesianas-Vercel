
import type {
    NodoBayes,
    RedBayes,
    RespuestaInferencia
} from '../tipos/red';

import ProcedimientoInferencia from './ProcedimientoInferencia';

import './ReporteImpresion.css';


type Propiedades = {
    red: RedBayes;
    consultas: string[];
    evidencias: Record<string, string>;
    resultado: RespuestaInferencia;
};


// Dimensiones de los nodos
const ANCHO_NODO = 150;
const ALTO_NODO = 64;
const MARGEN = 45;


// Dividir nombres largos
function partirNombre(
    nombre: string
): string[] {

    const palabras = nombre.trim().split(/\s+/);
    const lineas: string[] = [''];

    for (const palabra of palabras) {

        const ultima = lineas.length - 1;

        const propuesta = lineas[ultima]
            ? `${lineas[ultima]} ${palabra}`
            : palabra;

        if (
            propuesta.length <= 22 ||
            lineas.length === 2
        ) {

            lineas[ultima] = propuesta;

        } else {

            lineas.push(palabra);
        }
    }

    return lineas;
}


// Calcular borde de nodo para conectar flechas
function puntoBorde(
    origen: { x: number; y: number },
    destino: { x: number; y: number }
) {

    const dx = destino.x - origen.x;
    const dy = destino.y - origen.y;

    if (dx === 0 && dy === 0) {

        return {
            x: origen.x,
            y: origen.y
        };
    }

    const escala = Math.min(
        dx === 0
            ? Infinity
            : (ANCHO_NODO / 2) / Math.abs(dx),

        dy === 0
            ? Infinity
            : (ALTO_NODO / 2) / Math.abs(dy)
    );

    return {
        x: origen.x + dx * escala,
        y: origen.y + dy * escala
    };
}


// Diagrama SVG independiente de React Flow
function DiagramaImprimible({
    nodos,
    consultas,
    evidencias
}: {
    nodos: NodoBayes[];
    consultas: string[];
    evidencias: Record<string, string>;
}) {

    const posiciones = new Map(
        nodos.map(nodo => [
            nodo.id,

            {
                x: nodo.posicion.x,
                y: nodo.posicion.y
            }
        ])
    );

    const coordenadasX = nodos.map(
        nodo => nodo.posicion.x
    );

    const coordenadasY = nodos.map(
        nodo => nodo.posicion.y
    );

    const izquierda =
        Math.min(...coordenadasX) -
        ANCHO_NODO / 2 -
        MARGEN;

    const arriba =
        Math.min(...coordenadasY) -
        ALTO_NODO / 2 -
        MARGEN;

    const derecha =
        Math.max(...coordenadasX) +
        ANCHO_NODO / 2 +
        MARGEN;

    const abajo =
        Math.max(...coordenadasY) +
        ALTO_NODO / 2 +
        MARGEN;

    const ancho = Math.max(
        derecha - izquierda,
        320
    );

    const alto = Math.max(
        abajo - arriba,
        180
    );

    return (

        <svg
            className="ri-diagrama"

            viewBox={
                `${izquierda} ${arriba} ${ancho} ${alto}`
            }

            role="img"

            aria-label={
                'Grafo dirigido de la red bayesiana'
            }
        >

            <defs>

                <marker
                    id="ri-flecha"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                >

                    <path
                        d="M 0 0 L 10 5 L 0 10 z"
                        fill="#334155"
                    />

                </marker>

            </defs>


            {/* Relaciones dirigidas */}
            {nodos.flatMap(hijo =>

                hijo.padres.map(idPadre => {

                    const origen = posiciones.get(
                        idPadre
                    );

                    const destino = posiciones.get(
                        hijo.id
                    );

                    if (!origen || !destino) {
                        return null;
                    }

                    const inicio = puntoBorde(
                        origen,
                        destino
                    );

                    const fin = puntoBorde(
                        destino,
                        origen
                    );

                    return (

                        <line
                            key={`${idPadre}-${hijo.id}`}

                            x1={inicio.x}
                            y1={inicio.y}

                            x2={fin.x}
                            y2={fin.y}

                            stroke="#334155"
                            strokeWidth="2"

                            markerEnd="url(#ri-flecha)"
                        />

                    );
                })
            )}


            {/* Nodos */}
            {nodos.map(nodo => {

                const consultado =
                    consultas.includes(nodo.id);

                const evidencia =
                    Object.prototype.hasOwnProperty.call(
                        evidencias,
                        nodo.id
                    );

                const color = consultado
                    ? '#dbeafe'
                    : evidencia
                        ? '#dcfce7'
                        : '#f1f5f9';

                const lineas = partirNombre(
                    nodo.nombre
                );

                return (

                    <g key={nodo.id}>

                        <rect
                            x={
                                nodo.posicion.x -
                                ANCHO_NODO / 2
                            }

                            y={
                                nodo.posicion.y -
                                ALTO_NODO / 2
                            }

                            width={ANCHO_NODO}
                            height={ALTO_NODO}

                            rx="7"

                            fill={color}
                            stroke="#334155"
                            strokeWidth="1.5"
                        />

                        <text
                            x={nodo.posicion.x}

                            y={
                                nodo.posicion.y -
                                (lineas.length === 2 ? 14 : 7)
                            }

                            textAnchor="middle"

                            fontSize="12"
                            fontWeight="700"

                            fill="#0f172a"
                        >

                            {lineas.map(
                                (linea, indice) => (

                                    <tspan
                                        key={indice}

                                        x={nodo.posicion.x}

                                        dy={
                                            indice === 0
                                                ? 0
                                                : 14
                                        }

                                        textLength={
                                            linea.length > 23
                                                ? ANCHO_NODO - 14
                                                : undefined
                                        }

                                        lengthAdjust="spacingAndGlyphs"
                                    >
                                        {linea}
                                    </tspan>

                                )
                            )}

                        </text>

                        <text
                            x={nodo.posicion.x}
                            y={nodo.posicion.y + 22}

                            textAnchor="middle"
                            fontSize="10"
                            fill="#334155"
                        >
                            {nodo.id}
                        </text>

                    </g>

                );
            })}

        </svg>
    );
}


// Reporte completo de impresion
export default function ReporteImpresion({
    red,
    consultas,
    evidencias,
    resultado
}: Propiedades) {

    const fecha = new Date().toLocaleString(
        'es-MX'
    );

    const suma = resultado.distribucion.reduce(
        (acumulado, fila) =>
            acumulado + fila.probabilidad,
        0
    );

    const relaciones = red.nodos.reduce(
        (total, nodo) =>
            total + nodo.padres.length,
        0
    );

    const textoEvidencia = Object.entries(
        evidencias
    )
        .map(
            ([variable, estado]) =>
                `${variable}=${estado}`
        )
        .join(', ');

    const expresion = textoEvidencia
        ? `P(${consultas.join(', ')} | ${textoEvidencia})`
        : `P(${consultas.join(', ')})`;

    return (

        <article
            className="ri-reporte"

            aria-label={
                'Reporte imprimible de red bayesiana'
            }
        >

            {/* Encabezado */}
            <header className="ri-encabezado">

                <p className="ri-asignatura">
                    MODELOS PROBABILISTAS
                </p>

                <h1>
                    Reporte de red bayesiana
                </h1>

                <p>
                    <strong>Red:</strong>{' '}
                    {red.nombre}
                </p>

                <p>
                    <strong>Generado:</strong>{' '}
                    {fecha}
                </p>

                <p>
                    <strong>Nodos:</strong>{' '}
                    {red.nodos.length}

                    {' · '}

                    <strong>
                        Relaciones dirigidas:
                    </strong>{' '}

                    {relaciones}
                </p>

            </header>


            {/* 1. Estructura grafica */}
            <section className="ri-seccion">

                <h2>
                    1. Estructura gráfica
                </h2>

                <p className="ri-ayuda">
                    Azul: variables consultadas.
                    Verde: evidencias observadas.
                    Gris: otras variables.
                </p>

                <DiagramaImprimible
                    nodos={red.nodos}
                    consultas={consultas}
                    evidencias={evidencias}
                />

            </section>


            {/* 2. Variables y relaciones */}
            <section className="ri-seccion">

                <h2>
                    2. Variables y dependencias
                </h2>

                <table className="ri-tabla">

                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Estados</th>
                            <th>Padres</th>
                        </tr>
                    </thead>

                    <tbody>

                        {red.nodos.map(nodo => (

                            <tr key={nodo.id}>

                                <td>
                                    {nodo.id}
                                </td>

                                <td>
                                    {nodo.nombre}
                                </td>

                                <td>
                                    {nodo.estados.join(', ')}
                                </td>

                                <td>
                                    {
                                        nodo.padres.join(', ') ||
                                        'Ninguno'
                                    }
                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </section>


            {/* 3. Tablas CPT */}
            <section className="ri-seccion">

                <h2>
                    3. Tablas de probabilidad condicional (CPT)
                </h2>

                {red.nodos.map(nodo => (

                    <div
                        className="ri-bloqueCpt"
                        key={nodo.id}
                    >

                        <h3>
                            {nodo.nombre}
                            {' '}({nodo.id})
                        </h3>

                        <table className="ri-tabla">

                            <thead>
                                <tr>

                                    {nodo.padres.map(idPadre => (

                                        <th key={idPadre}>
                                            {idPadre}
                                        </th>

                                    ))}

                                    {nodo.estados.map(estado => (

                                        <th key={estado}>
                                            P({estado})
                                        </th>

                                    ))}

                                </tr>
                            </thead>

                            <tbody>

                                {nodo.tabla.map(
                                    (fila, indice) => (

                                        <tr key={indice}>

                                            {nodo.padres.map(idPadre => (

                                                <td key={idPadre}>
                                                    {
                                                        fila.condiciones[idPadre] ??
                                                        '—'
                                                    }
                                                </td>

                                            ))}

                                            {nodo.estados.map(estado => (

                                                <td key={estado}>
                                                    {
                                                        fila.probabilidades[estado]
                                                            ?.toFixed(6) ??
                                                        '—'
                                                    }
                                                </td>

                                            ))}

                                        </tr>

                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                ))}

            </section>


            {/* 4. Configuracion */}
            <section className="ri-seccion">

                <h2>
                    4. Configuración de la consulta
                </h2>

                <p className="ri-formula">
                    {expresion}
                </p>

                <p>
                    <strong>
                        Variables consultadas:
                    </strong>{' '}

                    {consultas.join(', ')}
                </p>

                <p>
                    <strong>
                        Evidencias:
                    </strong>{' '}

                    {textoEvidencia || 'Ninguna'}
                </p>

            </section>


            {/* 5. Procedimiento matematico */}
            <section className="ri-seccion">

                <h2>
                    5. Procedimiento de eliminación de variables
                </h2>

                <ProcedimientoInferencia
                    pasos={resultado.pasos}
                    orden={resultado.orden_eliminacion}
                />

            </section>


            {/* 6. Distribucion final */}
            <section className="ri-seccion">

                <h2>
                    6. Distribución calculada
                </h2>

                <table className="ri-tabla">

                    <thead>
                        <tr>
                            <th>Asignación</th>
                            <th>Probabilidad</th>
                            <th>Porcentaje</th>
                        </tr>
                    </thead>

                    <tbody>

                        {resultado.distribucion.map(
                            (fila, indice) => (

                                <tr key={indice}>

                                    <td>
                                        {
                                            Object.entries(
                                                fila.asignacion
                                            )
                                                .map(
                                                    ([id, estado]) =>
                                                        `${id}=${estado}`
                                                )
                                                .join(', ')
                                        }
                                    </td>

                                    <td>
                                        {
                                            fila.probabilidad
                                                .toFixed(6)
                                        }
                                    </td>

                                    <td>
                                        {
                                            (
                                                fila.probabilidad * 100
                                            ).toFixed(2)
                                        } %
                                    </td>

                                </tr>

                            )
                        )}

                    </tbody>

                </table>

                <p>
                    <strong>
                        Probabilidad de la evidencia:
                    </strong>{' '}

                    {
                        resultado.probabilidad_evidencia
                            .toFixed(6)
                    }
                </p>

                <p>
                    <strong>
                        Suma de probabilidades:
                    </strong>{' '}

                    {suma.toFixed(6)}

                    {' ('}

                    {(suma * 100).toFixed(2)}

                    {' %)'}
                </p>

            </section>

            <footer className="ri-pie">
                Reporte generado desde Redes Bayesianas IDK
                — Proyecto de Modelos Probabilistas.
            </footer>

        </article>
    );
}
