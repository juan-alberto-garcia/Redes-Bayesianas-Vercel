
import { useState } from 'react';

import type {
    RegistroConsulta
} from '../servicios/historialConsultas';

import './HistorialConsultas.css';

type Propiedades = {
    registros: RegistroConsulta[];
    onRecuperar: (registro: RegistroConsulta) => void;
    onEliminar: (id: string) => void;
    onVaciar: () => void;
};

// Convertir una probabilidad a porcentaje
function porcentaje(valor: number): string {
    return `${(valor * 100).toFixed(2)}%`;
}

// Crear identificador de una asignacion
function claveAsignacion(
    asignacion: Record<string, string>
): string {

    return JSON.stringify(
        Object.entries(asignacion).sort(
            ([a], [b]) => a.localeCompare(b)
        )
    );
}

// Mostrar la consulta en formato P(Q | E)
function describirConsulta(
    registro: RegistroConsulta
): string {

    const evidencia = Object.entries(
        registro.evidencias
    ).map(([id, estado]) =>
        `${id}=${estado}`
    ).join(', ');

    if (!evidencia) {
        return `P(${registro.consulta})`;
    }

    return `P(${registro.consulta} | ${evidencia})`;
}

// Obtener descripcion de una asignacion
function describirAsignacion(
    asignacion: Record<string, string>
): string {

    return Object.entries(asignacion)
        .map(([id, estado]) => `${id} = ${estado}`)
        .join(', ');
}

// Formatear fecha registrada
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

    // Dos registros para comparar
    const [seleccionados, setSeleccionados] = useState<
        string[]
    >([]);

    // Eliminar selecciones que ya no existen
    const seleccionValidos = seleccionados.filter(
        id => registros.some(registro => registro.id === id)
    );

    // Buscar los registros seleccionados
    const registroA = registros.find(
        registro => registro.id === seleccionValidos[0]
    );

    const registroB = registros.find(
        registro => registro.id === seleccionValidos[1]
    );

    // Solo se comparan consultas de la misma red
    // y de la misma variable
    const comparables = Boolean(
        registroA &&
        registroB &&
        registroA.firmaRed === registroB.firmaRed &&
        registroA.consulta === registroB.consulta
    );

    // Seleccionar un registro para comparar
    function cambiarSeleccion(id: string) {

        setSeleccionados(anteriores => {

            const validos = anteriores.filter(
                actual => registros.some(
                    registro => registro.id === actual
                )
            );

            if (validos.includes(id)) {
                return validos.filter(actual => actual !== id);
            }

            if (validos.length >= 2) {
                return validos;
            }

            return [...validos, id];
        });
    }

    // Eliminar un registro
    function eliminarRegistro(id: string) {

        setSeleccionados(anteriores =>
            anteriores.filter(actual => actual !== id)
        );

        onEliminar(id);
    }

    // Limpiar el historial completo
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

            <div className="encabezadoHistorial">

                <div>
                    <h2>Historial de consultas</h2>

                    <p>
                        Consulta resultados anteriores y
                        compara diferentes evidencias.
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
                    el primer resultado.
                </p>

            ) : (

                <>
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

                    <div className="listaHistorial">

                        {registros.map(registro => (

                            <article
                                key={registro.id}
                                className="registroHistorial"
                            >

                                <div className="datosRegistro">

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
                                                cambiarSeleccion(registro.id)
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

                                    <p>
                                        <strong>Consulta:</strong>{' '}
                                        {describirConsulta(registro)}
                                    </p>

                                    <p>
                                        <strong>Variable:</strong>{' '}
                                        {registro.consultaNombre}
                                    </p>

                                    <p>
                                        <strong>Resultados:</strong>
                                    </p>

                                    <div className="resumenRegistro">

                                        {registro.resultado.distribucion.map(
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
                                            eliminarRegistro(registro.id)
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

                            <h3>Comparacion de consultas</h3>

                            {!comparables ? (

                                <p className="avisoComparacion">
                                    Para comparar resultados, selecciona
                                    dos consultas realizadas sobre
                                    la misma red, con las mismas CPT
                                    y la misma variable de consulta.
                                </p>

                            ) : (

                                <>
                                    <p>
                                        <strong>Red:</strong>{' '}
                                        {registroA.red.nombre}
                                    </p>

                                    <div className="tablaComparacion">

                                        <table>

                                            <thead>
                                                <tr>
                                                    <th>Estado</th>

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

                                                            const valorB =
                                                                filaB?.probabilidad ??
                                                                0;

                                                            // B menos A en puntos porcentuales
                                                            const diferencia =
                                                                (
                                                                    valorB -
                                                                    filaA.probabilidad
                                                                ) * 100;

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
                                                                            ? porcentaje(valorB)
                                                                            : 'Sin dato'}
                                                                    </td>

                                                                    <td>
                                                                        {filaB
                                                                            ? `${diferencia >= 0 ? '+' : ''}${diferencia.toFixed(2)} pp`
                                                                            : '—'}
                                                                    </td>

                                                                </tr>

                                                            );
                                                        }
                                                    )}

                                            </tbody>

                                        </table>

                                    </div>

                                    <p className="notaComparacion">
                                        La diferencia se expresa en
                                        puntos porcentuales: B menos A.
                                        No se ejecuta nuevamente
                                        la inferencia.
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
