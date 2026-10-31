
import type { RedBayes } from '../tipos/red';

import './EditorEvidencias.css';


// Datos recibidos desde App
type Propiedades = {
    red: RedBayes;
    consulta: string;
    evidencias: Record<string, string>;

    onCambiar: (
        evidencias: Record<string, string>
    ) => void;
};


export default function EditorEvidencias({
    red,
    consulta,
    evidencias,
    onCambiar
}: Propiedades) {

    // Variables que todavia pueden agregarse
    const disponibles = red.nodos.filter(nodo =>
        nodo.id !== consulta &&
        !Object.prototype.hasOwnProperty.call(
            evidencias,
            nodo.id
        )
    );

    // Variables que ya tienen evidencia
    const observadas = red.nodos.filter(nodo =>
        nodo.id !== consulta &&
        Object.prototype.hasOwnProperty.call(
            evidencias,
            nodo.id
        )
    );


    // Agregar una evidencia
    function agregarEvidencia(id: string) {

        const nodo = disponibles.find(
            actual => actual.id === id
        );

        if (!nodo) {
            return;
        }

        onCambiar({
            ...evidencias,
            [id]: nodo.estados[0]
        });
    }


    // Cambiar el estado observado
    function cambiarEstado(
        id: string,
        estado: string
    ) {

        const nodo = red.nodos.find(
            actual => actual.id === id
        );

        if (!nodo || !nodo.estados.includes(estado)) {
            return;
        }

        onCambiar({
            ...evidencias,
            [id]: estado
        });
    }


    // Eliminar una evidencia
    function quitarEvidencia(id: string) {

        const nuevas = { ...evidencias };

        delete nuevas[id];

        onCambiar(nuevas);
    }


    return (

        <div className="editorEvidencias">

            <h3>Evidencias</h3>

            <p>
                Selecciona las variables observadas
                y sus respectivos estados.
            </p>


            {/* Agregar una nueva variable observada */}
            <div className="selectorEvidencia">

                <label>

                    Agregar evidencia

                    <select
                        value=""
                        disabled={disponibles.length === 0}

                        onChange={evento =>
                            agregarEvidencia(
                                evento.target.value
                            )
                        }
                    >

                        <option value="">
                            Seleccionar variable
                        </option>

                        {disponibles.map(nodo => (

                            <option
                                key={nodo.id}
                                value={nodo.id}
                            >
                                {nodo.nombre}
                            </option>

                        ))}

                    </select>

                </label>

            </div>


            {/* Evidencias seleccionadas */}
            {observadas.length === 0 ? (

                <p className="sinEvidencias">
                    Sin evidencias seleccionadas.
                    La consulta sera incondicional.
                </p>

            ) : (

                <div className="listaEvidencias">

                    {observadas.map(nodo => (

                        <div
                            key={nodo.id}
                            className="filaEvidencia"
                        >

                            {/* Nombre de la variable */}
                            <div className="nombreEvidencia">

                                <span>Variable</span>

                                <strong>
                                    {nodo.nombre}
                                </strong>

                            </div>


                            {/* Estado observado */}
                            <label>

                                Estado observado

                                <select
                                    value={evidencias[nodo.id]}

                                    onChange={evento =>
                                        cambiarEstado(
                                            nodo.id,
                                            evento.target.value
                                        )
                                    }
                                >

                                    {nodo.estados.map(estado => (

                                        <option
                                            key={estado}
                                            value={estado}
                                        >
                                            {estado}
                                        </option>

                                    ))}

                                </select>

                            </label>


                            {/* Quitar evidencia */}
                            <button
                                type="button"
                                className="botonQuitarEvidencia"

                                onClick={() =>
                                    quitarEvidencia(nodo.id)
                                }
                            >
                                Quitar
                            </button>

                        </div>

                    ))}

                </div>

            )}


            <p className="resumenEvidencias">

                {observadas.length} evidencia(s)
                seleccionada(s)

            </p>

        </div>
    );
}
