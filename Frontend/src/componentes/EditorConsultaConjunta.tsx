
import { useEffect, useState } from 'react';

import type { RedBayes } from '../tipos/red';

import './EditorConsultaConjunta.css';


// Modos disponibles
type ModoConsulta = 'individual' | 'conjunta';


// Propiedades recibidas desde App
type Propiedades = {
    red: RedBayes;

    consultas: string[];

    evidencias: Record<string, string>;

    onCambiarConsultas: (
        nuevas: string[]
    ) => void;

    onCambiarEvidencias: (
        nuevas: Record<string, string>
    ) => void;
};


// Editor de consultas individuales y conjuntas
export default function EditorConsultaConjunta({
    red,
    consultas,
    evidencias,
    onCambiarConsultas,
    onCambiarEvidencias
}: Propiedades) {

    // Modo inicial
    const [modo, setModo] = useState<ModoConsulta>(
        consultas.length > 1
            ? 'conjunta'
            : 'individual'
    );

    // Mensaje de ayuda
    const [aviso, setAviso] = useState('');


    // Adaptar modo cuando se recupera una consulta conjunta
    useEffect(() => {

        if (consultas.length > 1) {
            setModo('conjunta');
        }

    }, [consultas]);


    // Cambiar entre individual y conjunta
    function cambiarModo(nuevoModo: ModoConsulta) {

        setModo(nuevoModo);
        setAviso('');

        // En modo individual conservar solo una variable
        if (
            nuevoModo === 'individual' &&
            consultas.length > 1
        ) {
            onCambiarConsultas([consultas[0]]);
        }
    }


    // Seleccionar una variable
    function seleccionarVariable(idNodo: string) {

        setAviso('');

        // MODO INDIVIDUAL
        // Siempre reemplaza la seleccion anterior
        if (modo === 'individual') {

            if (
                consultas.length === 1 &&
                consultas[0] === idNodo
            ) {
                return;
            }

            onCambiarConsultas([idNodo]);
            return;
        }


        // MODO CONJUNTO
        const seleccionada = consultas.includes(idNodo);

        if (seleccionada) {

            // Mantener minimo una variable
            if (consultas.length === 1) {

                setAviso(
                    'Debe quedar al menos una variable ' +
                    'de consulta. Selecciona otra o ' +
                    'cambia al modo individual.'
                );

                return;
            }

            // Quitar solamente la variable pulsada
            const nuevas = consultas.filter(
                id => id !== idNodo
            );

            onCambiarConsultas(nuevas);

        } else {

            // Agregar solamente la variable pulsada
            onCambiarConsultas([
                ...consultas,
                idNodo
            ]);
        }
    }


    // Seleccionar exclusivamente una variable
    function seleccionarSoloEsta(idNodo: string) {

        setModo('individual');
        setAviso('');

        onCambiarConsultas([idNodo]);
    }


    // Cambiar una evidencia
    function cambiarEvidencia(
        idNodo: string,
        estado: string
    ) {

        const nuevas = {
            ...evidencias
        };

        if (estado === '') {

            delete nuevas[idNodo];

        } else {

            nuevas[idNodo] = estado;
        }

        onCambiarEvidencias(nuevas);
    }


    // Variables que pueden recibir evidencia
    const variablesEvidencia = red.nodos.filter(
        nodo => !consultas.includes(nodo.id)
    );


    // Calcular cantidad de resultados posibles
    const combinaciones = red.nodos
        .filter(nodo =>
            consultas.includes(nodo.id)
        )
        .reduce(
            (total, nodo) =>
                total * nodo.estados.length,
            1
        );


    // Construir expresion de consulta
    const parteConsulta = consultas.join(', ');

    const parteEvidencia = Object.entries(
        evidencias
    )
        .filter(
            ([id]) => !consultas.includes(id)
        )
        .map(
            ([id, estado]) => `${id}=${estado}`
        )
        .join(', ');

    const expresion = parteEvidencia
        ? `P(${parteConsulta} | ${parteEvidencia})`
        : `P(${parteConsulta})`;


    return (

        <div className="editorConsultaConjunta">

            {/* Variables de consulta */}
            <fieldset className="ecc-grupo">

                <legend>
                    Variables de consulta
                </legend>

                <p className="ecc-descripcion">
                    Elige una variable para una
                    consulta individual o varias
                    para una consulta conjunta.
                </p>


                {/* Cambiar modo de seleccion */}
                <div className="ecc-modos">

                    <button
                        type="button"

                        className={
                            modo === 'individual'
                                ? 'ecc-modo ecc-modoActivo'
                                : 'ecc-modo'
                        }

                        aria-pressed={
                            modo === 'individual'
                        }

                        onClick={() =>
                            cambiarModo('individual')
                        }
                    >
                        Individual
                    </button>


                    <button
                        type="button"

                        className={
                            modo === 'conjunta'
                                ? 'ecc-modo ecc-modoActivo'
                                : 'ecc-modo'
                        }

                        aria-pressed={
                            modo === 'conjunta'
                        }

                        onClick={() =>
                            cambiarModo('conjunta')
                        }
                    >
                        Conjunta
                    </button>

                </div>


                {/* Explicar el modo activo */}
                <p className="ecc-ayudaModo">

                    {modo === 'individual'
                        ? 'Al elegir una variable, reemplaza la anterior.'
                        : 'Puedes agregar o quitar variables haciendo clic.'}

                </p>


                {/* Mostrar seleccion actual */}
                <div className="ecc-seleccionActual">

                    <strong>
                        Seleccionadas:
                    </strong>

                    <span>
                        {consultas.join(', ')}
                    </span>

                </div>


                {/* Aviso de seleccion */}
                {aviso && (

                    <p className="ecc-aviso">
                        {aviso}
                    </p>

                )}


                {/* Variables disponibles */}
                <div className="ecc-opcionesConsulta">

                    {red.nodos.map(nodo => {

                        // Comprobar exclusivamente este nodo
                        const seleccionada =
                            consultas.includes(nodo.id);

                        return (

                            <div
                                key={nodo.id}

                                className={
                                    seleccionada
                                        ? 'ecc-tarjeta ecc-tarjetaSeleccionada'
                                        : 'ecc-tarjeta'
                                }
                            >

                                {/* Seleccionar variable */}
                                <button
                                    type="button"

                                    className={
                                        seleccionada
                                            ? 'ecc-variable ecc-variableActiva'
                                            : 'ecc-variable'
                                    }

                                    aria-pressed={seleccionada}

                                    onClick={() =>
                                        seleccionarVariable(nodo.id)
                                    }
                                >

                                    <span className="ecc-indicador">
                                        {seleccionada ? '✓' : '+'}
                                    </span>

                                    <span className="ecc-nombre">

                                        {nodo.nombre}

                                        {' '}

                                        ({nodo.id})

                                    </span>

                                </button>


                                {/* Elegir solo este nodo */}
                                <button
                                    type="button"

                                    className="ecc-solo"

                                    title={
                                        `Consultar solamente ${nodo.nombre}`
                                    }

                                    onClick={() =>
                                        seleccionarSoloEsta(nodo.id)
                                    }
                                >
                                    Solo esta
                                </button>

                            </div>

                        );
                    })}

                </div>

            </fieldset>


            {/* Evidencias observadas */}
            <fieldset className="ecc-grupo">

                <legend>
                    Evidencias observadas
                </legend>

                <p className="ecc-descripcion">
                    Selecciona los estados observados
                    de las variables que no forman
                    parte de la consulta.
                </p>


                {variablesEvidencia.length === 0 ? (

                    <p className="ecc-descripcion">
                        Todas las variables forman
                        parte de la consulta.
                    </p>

                ) : (

                    <div className="ecc-opcionesEvidencia">

                        {variablesEvidencia.map(nodo => (

                            <label
                                key={nodo.id}
                                className="ecc-evidencia"
                            >

                                <span>

                                    {nodo.nombre}

                                    {' '}

                                    ({nodo.id})

                                </span>


                                <select
                                    value={
                                        evidencias[nodo.id] ?? ''
                                    }

                                    onChange={evento =>
                                        cambiarEvidencia(
                                            nodo.id,
                                            evento.target.value
                                        )
                                    }
                                >

                                    <option value="">
                                        Sin evidencia
                                    </option>


                                    {nodo.estados.map(
                                        estado => (

                                            <option
                                                key={estado}
                                                value={estado}
                                            >
                                                {estado}
                                            </option>

                                        )
                                    )}

                                </select>

                            </label>

                        ))}

                    </div>

                )}

            </fieldset>


            {/* Resumen de consulta */}
            <div className="ecc-resumen">

                <h3>
                    Consulta actual
                </h3>

                <p className="ecc-expresion">
                    {expresion}
                </p>

                <p>
                    <strong>
                        Tipo:
                    </strong>{' '}

                    {consultas.length === 1
                        ? 'Individual'
                        : 'Conjunta'}
                </p>

                <p>
                    <strong>
                        Variables seleccionadas:
                    </strong>{' '}

                    {consultas.length}
                </p>

                <p>
                    <strong>
                        Combinaciones posibles:
                    </strong>{' '}

                    {combinaciones}
                </p>


                {combinaciones > 128 && (

                    <p className="ecc-advertencia">

                        La consulta puede generar
                        una tabla extensa.
                        Considera reducir las variables.

                    </p>

                )}

            </div>

        </div>
    );
}