
import { useEffect, useState } from 'react';

import type { RedBayes } from '../tipos/red';

import './EditorEstados.css';


// Resultado de guardar los estados
type ResultadoGuardado = {
    correcto: boolean;
    mensaje: string;
};


// Propiedades recibidas desde App
type Propiedades = {
    red: RedBayes;

    onGuardar: (
        idNodo: string,
        estados: string[]
    ) => ResultadoGuardado;
};


// Editor de estados de un nodo
export default function EditorEstados({
    red,
    onGuardar
}: Propiedades) {

    // Nodo seleccionado en el editor
    const [idNodo, setIdNodo] = useState(
        red.nodos[0]?.id || ''
    );

    // Texto que escribe el usuario
    const [textoEstados, setTextoEstados] =
        useState('');

    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    // Obtener el nodo seleccionado
    const nodo = red.nodos.find(
        actual => actual.id === idNodo
    ) || red.nodos[0];


    // Actualizar el formulario al cambiar de nodo
    useEffect(() => {

        if (!nodo) {
            return;
        }

        setTextoEstados(
            nodo.estados.join('\n')
        );

        setMensaje('');
        setError('');

    }, [nodo?.id, nodo?.estados]);


    // Validar y guardar los nuevos estados
    function guardarEstados() {

        if (!nodo) {
            return;
        }

        setMensaje('');
        setError('');

        // Aceptar un estado por linea o separado por coma
        const estados = textoEstados
            .split(/[\n,]+/)
            .map(estado => estado.trim())
            .filter(estado => estado.length > 0);

        // Minimo dos estados
        if (estados.length < 2) {

            setError(
                'El nodo debe tener al menos dos estados.'
            );

            return;
        }

        // Limitar la cantidad de estados
        if (estados.length > 6) {

            setError(
                'Se permiten como maximo seis estados por nodo.'
            );

            return;
        }

        // Evitar nombres demasiado largos
        if (
            estados.some(
                estado => estado.length > 40
            )
        ) {

            setError(
                'Cada estado debe tener como maximo 40 caracteres.'
            );

            return;
        }

        // Comprobar estados repetidos
        const nombres = estados.map(
            estado => estado.toLocaleLowerCase('es')
        );

        if (
            new Set(nombres).size !== nombres.length
        ) {

            setError(
                'No se permiten estados repetidos.'
            );

            return;
        }

        // Comprobar si realmente hubo modificaciones
        if (
            estados.length === nodo.estados.length &&
            estados.every(
                (estado, indice) =>
                    estado === nodo.estados[indice]
            )
        ) {

            setMensaje(
                'No hay cambios en los estados.'
            );

            return;
        }

        // Solicitar actualizacion a App
        const resultado = onGuardar(
            nodo.id,
            estados
        );

        if (resultado.correcto) {
            setMensaje(resultado.mensaje);
        } else {
            setError(resultado.mensaje);
        }
    }


    return (

        <section className="panel editorEstados">

            <h2>Personalizar estados</h2>

            <p>
                Configura los estados posibles de cada
                variable de la red bayesiana.
            </p>


            {/* Seleccionar el nodo */}
            <label className="campoEstados">

                Nodo a modificar

                <select
                    value={nodo?.id || ''}

                    onChange={evento => {
                        setIdNodo(evento.target.value);
                    }}
                >

                    {red.nodos.map(actual => (

                        <option
                            key={actual.id}
                            value={actual.id}
                        >
                            {actual.nombre} ({actual.id})
                        </option>

                    ))}

                </select>

            </label>


            {/* Editar estados */}
            <label className="campoEstados">

                Estados posibles

                <textarea
                    value={textoEstados}
                    rows={5}

                    onChange={evento => {
                        setTextoEstados(evento.target.value);
                        setMensaje('');
                        setError('');
                    }}

                    placeholder={
                        'Bajo\nMedio\nAlto'
                    }
                />

            </label>


            <p className="ayudaEstados">
                Escribe un estado por linea.
                Se permiten entre 2 y 6 estados
                diferentes.
            </p>


            {/* Advertencia sobre las CPT */}
            <div className="avisoEstados">

                <strong>Importante</strong>

                <p>
                    Al cambiar los estados se reiniciaran
                    con probabilidades uniformes la CPT
                    de este nodo y las CPT de sus hijos
                    directos.
                </p>

                <p>
                    Tendras que ajustar nuevamente
                    las probabilidades en el editor CPT.
                </p>

            </div>


            {/* Guardar cambios */}
            <button
                type="button"
                onClick={guardarEstados}
            >
                Guardar estados
            </button>


            {/* Mensajes */}
            {mensaje && (
                <p className="exito">
                    {mensaje}
                </p>
            )}

            {error && (
                <p className="error">
                    {error}
                </p>
            )}

        </section>
    );
}
