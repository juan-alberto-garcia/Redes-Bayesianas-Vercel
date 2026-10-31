
import { useState } from 'react';

import type {
    RegistroConsulta
} from '../servicios/historialConsultas';

import './HistorialConsultas.css';


type Propiedades = {
    registros: RegistroConsulta[];

    onRecuperar: (
        registro: RegistroConsulta
    ) => void;

    onEliminar: (id: string) => void;

    onVaciar: () => void;
};


// Convertir una probabilidad a porcentaje
function porcentaje(valor: number): string {
    return `${(valor * 100).toFixed(2)}%`;
}


// Identificar una asignacion aunque cambie su orden
function claveAsignacion(
    asignacion: Record<string, string>
): string {

    return JSON.stringify(
        Object.entries(asignacion).sort(
            ([a], [b]) => a.localeCompare(b)
        )
    );
}


// Mostrar los estados de un resultado
function describirAsignacion(
    asignacion: Record<string, string>
): string {

    return Object.entries(asignacion)
        .map(
            ([id, estado]) => `${id} = ${estado}`
        )
        .join(', ');
}


// Construir la consulta del registro
function describirConsulta(
    registro: RegistroConsulta
): string {

    const variables = registro.consultas.join(', ');

    const evidencia = Object.entries(
        registro.evidencias
    )
        .map(
            ([id, estado]) => `${id}=${estado}`
        )
        .join(', ');

    return evidencia
        ? `P(${variables} | ${evidencia})`
        : `P(${variables})`;
}


// Mostrar fecha
function mostrarFecha(fecha: string): string {

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
        return fecha;
    }

    return valor.toLocaleString('es-MX', {
        dateStyle: 'short',
        timeStyle: 'short'
    });
}


// Historial de consultas
export default function HistorialConsultas({
    registros,
    onRecuperar,
    onEliminar,
    onVaciar
}: Propiedades) {

    // Dos registros seleccionados para comparar
    const [seleccionados, setSeleccionados] =
        useState<string[]>([]);

    // Ignorar registros que hayan sido eliminados
    const seleccionValidos = seleccionados.filter(
        id => registros.some(
            registro => registro.id === id
        )
    );

    const registroA = registros.find(
        registro =>
            registro.id === seleccionValidos[0]
    );

    const registroB = registros.find(
        registro =>
            registro.id === seleccionValidos[1]
    );


    // Se compara la misma red y las mismas variables
    const comparables = Boolean(
        registroA &&
        registroB &&

        registroA.firmaRed === registroB.firmaRed &&

        JSON.stringify(
            [...registroA.consultas].sort()
        ) ===

        JSON.stringify(
            [...registroB.consultas].sort()
        )
    );


    // Marcar o desmarcar registro
    function cambiarSeleccion(id: string) {

        setSeleccionados(anteriores => {

            const validos = anteriores.filter(
                actual => registros.some(
                    registro => registro.id === actual
                )
            );

            if (validos.includes(id)) {

                return validos.filter(
                    actual => actual !== id
                );
            }

            if (validos.length >= 2) {
                return validos;
            }

            return [...validos, id];
        });
    }


    // Eliminar registro
    function eliminarRegistro(id: string) {

        setSeleccionados(anteriores =>
            anteriores.filter(
                actual => actual !== id
            )
        );

        onEliminar(id);
    }


    // Limpiar todo el historial
    function vaciarHistorial() {

        if (registros.length === 0) {
            return;
        }

        const confirmar = window.confirm(
            '¿Eliminar todo el historial de consultas?\n\n' +
            'Esta accion no se puede deshacer.'
        );

        if (!confirmar) {
            return;
        }

        setSeleccionados([]);
        onVaciar();
    }


    return (

        <section className="panel historialConsultas">

            {/* Encabezado */}
            <div className="encabezadoHistorial">

                <div>

                    <h2>
                        Historial de consultas
                    </h2>

                    <p>
                        Recupera resultados y compara
                        diferentes evidencias.
                    </p>

                </div>

                <span className="contadorHistorial">
                    {registros.length} / 30
                </span>

            </div>


            {registros.length === 0 ? (

                <p className="historialVacio">
                    Todavia no hay consultas guardadas.
                    Realiza un calculo para agregar
                    el primero.
                </p>

            ) : (

                <>

                    {/* Acciones del historial */}
                    <div className="accionesHistorial">

                        <p>
                            Marca dos registros para compararlos.
                        </p>

                        <button
                            type="button"
                            className="botonLimpiarHistorial"
                            onClick={vaciarHistorial}
                        >
                            Limpiar historial
                        </button>

                    </div>


                    {/* Lista de registros */}
                    <div className="listaHistorial">

                        {registros.map(registro => (

                            <article
                                className="registroHistorial"
                                key={registro.id}
                            >

                                <div className="datosRegistro">

                                    {/* Seleccion de comparacion */}
                                    <label className="compararRegistro">

                                        <input
                                            type="checkbox"

                                            checked={
                                                seleccionValidos.includes(
                                                    registro.id
                                                )
                                            }

                                            disabled={
                                                seleccionValidos.length >= 2 &&
                                                !seleccionValidos.includes(
                                                    registro.id
                                                )
                                            }

                                            onChange={() =>
                                                cambiarSeleccion(
                                                    registro.id
                                                )
                                            }
                                        />

                                        Comparar

                                    </label>


                                    <small>
                                        {mostrarFecha(registro.fecha)}
                                    </small>

                                    <h3>
                                        {registro.red.nombre}
                                    </h3>


                                    {/* Consulta guardada */}
                                    <p>
                                        <strong>
                                            Consulta:
                                        </strong>{' '}

                                        {describirConsulta(registro)}
                                    </p>

                                    <p>
                                        <strong>
                                            Variables:
                                        </strong>{' '}

                                        {registro.consultaNombre}
                                    </p>


                                    {/* Resultados guardados */}
                                    <p>
                                        <strong>
                                            Resultados:
                                        </strong>
                                    </p>

                                    <div className="resumenRegistro">

                                        {registro.resultado
                                            .distribucion.map(
                                                (fila, indice) => (

                                                    <div key={indice}>

                                                        <span>
                                                            {describirAsignacion(
                                                                fila.asignacion
                                                            )}
                                                        </span>

                                                        <strong>
                                                            {porcentaje(
                                                                fila.probabilidad
                                                            )}
                                                        </strong>

                                                    </div>

                                                )
                                            )}

                                    </div>


                                    <p>
                                        <strong>
                                            Probabilidad de evidencia:
                                        </strong>{' '}

                                        {registro.resultado
                                            .probabilidad_evidencia
                                            .toFixed(6)}
                                    </p>

                                </div>


                                {/* Botones del registro */}
                                <div className="botonesRegistro">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            onRecuperar(registro)
                                        }
                                    >
                                        Recuperar
                                    </button>

                                    <button
                                        type="button"
                                        className="botonEliminarHistorial"
                                        onClick={() =>
                                            eliminarRegistro(
                                                registro.id
                                            )
                                        }
                                    >
                                        Eliminar
                                    </button>

                                </div>

                            </article>

                        ))}

                    </div>


                    {/* Comparacion de dos consultas */}
                    {registroA && registroB && (

                        <div className="panelComparacion">

                            <h3>
                                Comparacion de consultas
                            </h3>


                            {!comparables ? (

                                <p className="avisoComparacion">
                                    Selecciona dos consultas con
                                    la misma red, las mismas CPT
                                    y el mismo conjunto de
                                    variables de consulta.
                                </p>

                            ) : (

                                <>

                                    <p>
                                        <strong>
                                            Red:
                                        </strong>{' '}

                                        {registroA.red.nombre}
                                    </p>


                                    <div className="tablaComparacion">

                                        <table>

                                            <thead>

                                                <tr>

                                                    <th>
                                                        Asignacion
                                                    </th>

                                                    <th>
                                                        A:{' '}
                                                        {describirConsulta(
                                                            registroA
                                                        )}
                                                    </th>

                                                    <th>
                                                        B:{' '}
                                                        {describirConsulta(
                                                            registroB
                                                        )}
                                                    </th>

                                                    <th>
                                                        Diferencia
                                                    </th>

                                                </tr>

                                            </thead>


                                            <tbody>

                                                {registroA.resultado
                                                    .distribucion.map(
                                                        (filaA, indice) => {

                                                            // Buscar asignacion equivalente
                                                            const filaB =
                                                                registroB.resultado
                                                                    .distribucion.find(
                                                                        fila =>
                                                                            claveAsignacion(
                                                                                fila.asignacion
                                                                            ) ===
                                                                            claveAsignacion(
                                                                                filaA.asignacion
                                                                            )
                                                                    );

                                                            // Diferencia B - A
                                                            const diferencia =
                                                                filaB
                                                                    ? (
                                                                        filaB.probabilidad -
                                                                        filaA.probabilidad
                                                                    ) * 100
                                                                    : null;

                                                            return (

                                                                <tr key={indice}>

                                                                    <td>
                                                                        {describirAsignacion(
                                                                            filaA.asignacion
                                                                        )}
                                                                    </td>

                                                                    <td>
                                                                        {porcentaje(
                                                                            filaA.probabilidad
                                                                        )}
                                                                    </td>

                                                                    <td>
                                                                        {filaB
                                                                            ? porcentaje(
                                                                                filaB.probabilidad
                                                                            )
                                                                            : 'Sin dato'}
                                                                    </td>

                                                                    <td>
                                                                        {diferencia === null
                                                                            ? '—'
                                                                            : `${diferencia >= 0 ? '+' : ''}${diferencia.toFixed(2)} pp`}
                                                                    </td>

                                                                </tr>

                                                            );
                                                        }
                                                    )}

                                            </tbody>

                                        </table>

                                    </div>


                                    <p className="notaComparacion">
                                        Diferencia en puntos
                                        porcentuales: resultado B
                                        menos resultado A.
                                    </p>

                                </>

                            )}

                        </div>

                    )}

                </>

            )}

        </section>
    );
}
