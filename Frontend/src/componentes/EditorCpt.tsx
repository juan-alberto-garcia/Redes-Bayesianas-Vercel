
import { useEffect, useState } from 'react';
import type {
    RedBayes,
    FilaProbabilidad
} from '../tipos/red';


// Datos que recibe el editor
interface PropiedadesEditorCpt {
    red: RedBayes;
    onGuardar: (
        idNodo: string,
        tabla: FilaProbabilidad[]
    ) => void;
}


function EditorCpt({
    red,
    onGuardar
}: PropiedadesEditorCpt) {

    // Nodo que se esta editando
    const [idNodo, setIdNodo] = useState(
        red.nodos[0]?.id ?? ''
    );

    // Valores escritos por el usuario
    const [valores, setValores] =
        useState<Record<string, string>>({});

    // Mensajes
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    // Buscar el nodo seleccionado
    const nodoSeleccionado = red.nodos.find(
        nodo => nodo.id === idNodo
    ) ?? red.nodos[0];


    // Limpiar valores cuando cambia la red
    useEffect(() => {
        setValores({});
    }, [red]);


    // Cambiar el nodo que estamos editando
    function seleccionarNodo(id: string) {
        setIdNodo(id);
        setValores({});
        setError('');
        setMensaje('');
    }


    // Modificar una probabilidad temporalmente
    function cambiarProbabilidad(
        clave: string,
        valor: string
    ) {
        setValores(anterior => ({
            ...anterior,
            [clave]: valor
        }));

        setError('');
        setMensaje('');
    }


    // Comprobar las probabilidades y guardar la tabla
    function guardarTabla() {

        if (!nodoSeleccionado) {
            return;
        }

        const tablaNueva: FilaProbabilidad[] = [];

        // Revisar cada fila de la CPT
        for (
            let indice = 0;
            indice < nodoSeleccionado.tabla.length;
            indice++
        ) {

            const fila = nodoSeleccionado.tabla[indice];

            const probabilidades: Record<string, number> = {};

            let suma = 0;

            // Revisar cada estado del nodo
            for (const estado of nodoSeleccionado.estados) {

                const clave =
                    `${nodoSeleccionado.id}:${indice}:${estado}`;

                const texto = valores[clave] ??
                    String(fila.probabilidades[estado] ?? '');

                // Aceptar punto o coma decimal
                const numero = Number(
                    texto.trim().replace(',', '.')
                );

                // Comprobar rango de probabilidad
                if (
                    texto.trim() === '' ||
                    !Number.isFinite(numero) ||
                    numero < 0 ||
                    numero > 1
                ) {
                    setMensaje('');
                    setError(
                        `Fila ${indice + 1}, estado ${estado}: ` +
                        'la probabilidad debe estar entre 0 y 1'
                    );
                    return;
                }

                probabilidades[estado] = numero;
                suma += numero;
            }

            // Cada distribucion debe sumar 1
            if (Math.abs(suma - 1) > 0.000001) {
                setMensaje('');
                setError(
                    `La fila ${indice + 1} suma ` +
                    `${suma.toFixed(6)}. Debe sumar 1`
                );
                return;
            }

            // Preparar la fila validada
            tablaNueva.push({
                condiciones: { ...fila.condiciones },
                probabilidades
            });
        }

        // Enviar la tabla al componente principal
        onGuardar(nodoSeleccionado.id, tablaNueva);

        setValores({});
        setError('');
        setMensaje('Tabla CPT guardada correctamente');
    }


    // Evitar mostrar el editor si no hay nodos
    if (!nodoSeleccionado) {
        return null;
    }


    return (
        <section className="panel editorCpt">

            <h2>Editor de probabilidades (CPT)</h2>

            <p>
                Configura las probabilidades de cada estado.
                Cada fila debe sumar 1.
            </p>

            {/* Elegir nodo */}
            <label className="selectorNodoCpt">

                Nodo a editar

                <select
                    value={nodoSeleccionado.id}
                    onChange={evento =>
                        seleccionarNodo(evento.target.value)
                    }
                >
                    {red.nodos.map(nodo => (
                        <option
                            key={nodo.id}
                            value={nodo.id}
                        >
                            {nodo.nombre}
                        </option>
                    ))}
                </select>

            </label>


            {/* Informacion del nodo */}
            <div className="informacionCpt">

                <strong>{nodoSeleccionado.nombre}</strong>

                <span>
                    Estados: {
                        nodoSeleccionado.estados.join(', ')
                    }
                </span>

                <span>
                    Padres: {
                        nodoSeleccionado.padres.join(', ') ||
                        'Ninguno'
                    }
                </span>

            </div>


            {/* Filas de probabilidades */}
            <div className="filasCpt">

                {nodoSeleccionado.tabla.map(
                    (fila, indice) => (

                        <div
                            className="filaCpt"
                            key={indice}
                        >

                            {/* Condiciones de los padres */}
                            <div className="condicionesCpt">

                                <strong>
                                    Fila {indice + 1}
                                </strong>

                                <span>
                                    {
                                        nodoSeleccionado.padres.length === 0
                                            ? 'Sin padres'
                                            : nodoSeleccionado.padres.map(
                                                idPadre => {

                                                    const padre = red.nodos.find(
                                                        nodo =>
                                                            nodo.id === idPadre
                                                    );

                                                    return (
                                                        `${padre?.nombre ?? idPadre}` +
                                                        ` = ${fila.condiciones[idPadre]}`
                                                    );
                                                }
                                            ).join(' | ')
                                    }
                                </span>

                            </div>


                            {/* Probabilidades de los estados */}
                            <div className="probabilidadesCpt">

                                {nodoSeleccionado.estados.map(
                                    estado => {

                                        const clave =
                                            `${nodoSeleccionado.id}:${indice}:${estado}`;

                                        return (
                                            <label key={estado}>

                                                P({estado})

                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={
                                                        valores[clave] ??
                                                        String(
                                                            fila.probabilidades[estado] ?? ''
                                                        )
                                                    }
                                                    onChange={evento =>
                                                        cambiarProbabilidad(
                                                            clave,
                                                            evento.target.value
                                                        )
                                                    }
                                                    aria-label={
                                                        `Probabilidad ${estado}, fila ${indice + 1}`
                                                    }
                                                />

                                            </label>
                                        );
                                    }
                                )}

                            </div>

                        </div>
                    )
                )}

            </div>


            {/* Guardar cambios */}
            <button
                type="button"
                onClick={guardarTabla}
            >
                Guardar CPT
            </button>


            {/* Mensajes */}
            {mensaje && (
                <p className="exito">{mensaje}</p>
            )}

            {error && (
                <p className="error">{error}</p>
            )}

        </section>
    );
}

export default EditorCpt;
