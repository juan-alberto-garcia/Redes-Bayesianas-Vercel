
import { useState } from 'react';

import { redesEjemplo } from '../ejemplos/redesEjemplo';
import { redesMaestro } from '../ejemplos/redesM';

import type { EjemploRed } from '../ejemplos/redesEjemplo';

import './SelectorEjemplos.css';


// Propiedades recibidas desde App
type Propiedades = {
    onCargar: (ejemplo: EjemploRed) => void;
};


// Unir los catalogos
const todosLosEjemplos: EjemploRed[] = [
    ...redesMaestro,
    ...redesEjemplo
];


// Componente del catalogo
export default function SelectorEjemplos({
    onCargar
}: Propiedades) {

    // Ejemplo elegido en el selector
    const [idEjemplo, setIdEjemplo] = useState(
        redesEjemplo[0].id
    );

    // Obtener sus datos para la vista previa
    const ejemplo = todosLosEjemplos.find(
        actual => actual.id === idEjemplo
    ) || todosLosEjemplos[0];

    // Identificar ejercicios del maestro
    const ejemploMaestro = redesMaestro.find(
        actual => actual.id === ejemplo.id
    );

    // Variable que se quiere consultar
    const nodoConsulta = ejemplo.red.nodos.find(
        nodo => nodo.id === ejemplo.consulta
    );

    // Crear descripcion de las evidencias
    const evidenciasTexto = Object.entries(
        ejemplo.evidencias
    ).map(([id, estado]) => {

        const nodo = ejemplo.red.nodos.find(
            actual => actual.id === id
        );

        return `${nodo?.nombre || id} = ${estado}`;

    }).join(', ');


    // Construir consulta de referencia
    const condiciones = Object.entries(
        ejemplo.evidencias
    ).map(([id, estado]) =>
        `${id}=${estado}`
    ).join(', ');

    const expresion = ejemploMaestro
        ? condiciones
            ? `P(${ejemplo.consulta}=${ejemploMaestro.estadoConsulta} | ${condiciones})`
            : `P(${ejemplo.consulta}=${ejemploMaestro.estadoConsulta})`
        : '';


    // Cambiar solamente la vista previa
    function seleccionarEjemplo(id: string) {

        const existe = todosLosEjemplos.some(
            actual => actual.id === id
        );

        if (!existe) {
            return;
        }

        // No modifica la red actual
        setIdEjemplo(id);
    }


    // Reemplazar la red cuando se pulsa el boton
    function cargarEjemplo() {

        const confirmar = window.confirm(
            `¿Quieres cargar "${ejemplo.titulo}"?\n\n` +
            'La red actual sera reemplazada.\n\n' +
            'Si deseas conservar tus cambios, ' +
            'exporta la red a JSON antes de continuar.'
        );

        // Si cancela, no hacer nada
        if (!confirmar) {
            return;
        }

        // Enviar el ejemplo a App
        onCargar(ejemplo);
    }


    return (

        <section className="panel catalogoEjemplos">

            <h2>Redes de ejemplo</h2>

            <p>
                Selecciona una red para consultar su
                informacion. Presiona el boton
                para cargarla en el editor grafico.
            </p>


            {/* Selector: solo cambia la vista previa */}
            <label className="selectorEjemplos">

                Red disponible

                <select
                    value={idEjemplo}

                    onChange={evento =>
                        seleccionarEjemplo(
                            evento.target.value
                        )
                    }
                >

                    <optgroup label="Ejercicios del maestro">

                        {redesMaestro.map(actual => (

                            <option
                                key={actual.id}
                                value={actual.id}
                            >
                                {actual.titulo}
                            </option>

                        ))}

                    </optgroup>


                    <optgroup label="Ejemplos adicionales">

                        {redesEjemplo.map(actual => (

                            <option
                                key={actual.id}
                                value={actual.id}
                            >
                                {actual.titulo}
                            </option>

                        ))}

                    </optgroup>

                </select>

            </label>


            {/* Informacion de la red seleccionada */}
            <div className="detallesEjemplo">

                <h3>{ejemplo.titulo}</h3>

                <p>{ejemplo.descripcion}</p>

                <p>
                    <strong>Numero de nodos:</strong>{' '}
                    {ejemplo.red.nodos.length}
                </p>

                <p>
                    <strong>Variable de consulta:</strong>{' '}
                    {nodoConsulta?.nombre || ejemplo.consulta}
                </p>

                <p>
                    <strong>Evidencias sugeridas:</strong>{' '}
                    {evidenciasTexto || 'Ninguna'}
                </p>


                {/* Informacion adicional del maestro */}
                {ejemploMaestro && (

                    <div className="referenciaEjemplo">

                        <p>
                            <strong>Documento:</strong>{' '}
                            Eliminacion de Variables -
                            10 Ejercicios
                        </p>

                        <p>
                            <strong>Ejercicio:</strong>{' '}
                            {ejemploMaestro.ejercicio}
                        </p>

                        <p>
                            <strong>Pagina:</strong>{' '}
                            {ejemploMaestro.pagina}
                        </p>

                        <p>
                            <strong>Consulta de referencia:</strong>{' '}
                            {expresion}
                        </p>

                        <p>
                            <strong>Resultado esperado:</strong>{' '}

                            <span className="resultadoReferencia">
                                {(
                                    ejemploMaestro.resultadoEsperado * 100
                                ).toFixed(2)}%
                            </span>
                        </p>

                    </div>

                )}

            </div>


            {/* Boton de carga manual */}
            <button
                type="button"
                onClick={cargarEjemplo}
            >
                Cargar red de ejemplo
            </button>

        </section>
    );
}
