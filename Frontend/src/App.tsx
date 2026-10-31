
import { useEffect, useState } from 'react';

import { clienteApi } from './servicios/clienteApi';
import EditorCpt from './componentes/EditorCpt';
import GrafoBayesiano from './componentes/GrafoBayesiano';
import GestorJson from './componentes/GestorJson';

import type {
    RedBayes,
    NodoBayes,
    FilaProbabilidad,
    RespuestaInferencia
} from './tipos/red';

import './App.css';


// Red bayesiana inicial
const redEjemplo: RedBayes = {
    nombre: 'Lluvia, aspersor y cesped mojado',
    formato: 1,

    nodos: [
        {
            id: 'A',
            nombre: 'Lluvia',
            estados: ['Si', 'No'],
            padres: [],
            posicion: { x: 100, y: 100 },

            tabla: [
                {
                    condiciones: {},
                    probabilidades: {
                        Si: 0.3,
                        No: 0.7
                    }
                }
            ]
        },
        {
            id: 'B',
            nombre: 'Aspersor',
            estados: ['Si', 'No'],
            padres: [],
            posicion: { x: 100, y: 320 },

            tabla: [
                {
                    condiciones: {},
                    probabilidades: {
                        Si: 0.4,
                        No: 0.6
                    }
                }
            ]
        },
        {
            id: 'C',
            nombre: 'Cesped mojado',
            estados: ['Si', 'No'],
            padres: ['A', 'B'],
            posicion: { x: 470, y: 210 },

            tabla: [
                {
                    condiciones: {
                        A: 'Si',
                        B: 'Si'
                    },
                    probabilidades: {
                        Si: 0.99,
                        No: 0.01
                    }
                },
                {
                    condiciones: {
                        A: 'Si',
                        B: 'No'
                    },
                    probabilidades: {
                        Si: 0.90,
                        No: 0.10
                    }
                },
                {
                    condiciones: {
                        A: 'No',
                        B: 'Si'
                    },
                    probabilidades: {
                        Si: 0.80,
                        No: 0.20
                    }
                },
                {
                    condiciones: {
                        A: 'No',
                        B: 'No'
                    },
                    probabilidades: {
                        Si: 0.01,
                        No: 0.99
                    }
                }
            ]
        }
    ]
};


// Comprobar si existe un camino dirigido
function existeCamino(
    origen: string,
    destino: string,
    nodos: NodoBayes[]
): boolean {

    const pendientes = [origen];
    const visitados = new Set<string>();

    while (pendientes.length > 0) {

        const actual = pendientes.pop();

        if (!actual) {
            continue;
        }

        if (actual === destino) {
            return true;
        }

        if (visitados.has(actual)) {
            continue;
        }

        visitados.add(actual);

        // Buscar los hijos
        for (const nodo of nodos) {
            if (nodo.padres.includes(actual)) {
                pendientes.push(nodo.id);
            }
        }
    }

    return false;
}


// Construir la CPT cuando cambian los padres
function construirTabla(
    nodoHijo: NodoBayes,
    padresNuevos: string[],
    nodos: NodoBayes[]
): FilaProbabilidad[] {

    let combinaciones: Record<string, string>[] = [{}];

    for (const idPadre of padresNuevos) {

        const padre = nodos.find(
            nodo => nodo.id === idPadre
        );

        if (!padre) {
            throw new Error('No se encontro el nodo padre');
        }

        combinaciones = combinaciones.flatMap(
            condiciones =>
                padre.estados.map(estado => ({
                    ...condiciones,
                    [idPadre]: estado
                }))
        );
    }

    const probabilidadInicial =
        1 / nodoHijo.estados.length;

    return combinaciones.map(condiciones => ({
        condiciones,
        probabilidades: Object.fromEntries(
            nodoHijo.estados.map(estado => [
                estado,
                probabilidadInicial
            ])
        )
    }));
}


// Aplicacion principal
function App() {

    // Red editable
    const [redActual, setRedActual] =
        useState<RedBayes>(redEjemplo);

    // Reiniciar React Flow cuando se importa otra red
    const [versionGrafo, setVersionGrafo] =
        useState(0);

    // Estado del Backend
    const [conexion, setConexion] =
        useState('Comprobando...');

    // Consulta y evidencia
    const [consulta, setConsulta] =
        useState('A');

    const [
        variableEvidencia,
        setVariableEvidencia
    ] = useState('C');

    const [
        estadoEvidencia,
        setEstadoEvidencia
    ] = useState('Si');

    // Nodo seleccionado en React Flow
    const [
        nodoSeleccionado,
        setNodoSeleccionado
    ] = useState<string | null>(null);

    // Selector de padres
    const [
        padresSeleccionados,
        setPadresSeleccionados
    ] = useState<Record<string, string>>({});

    // Resultado y mensajes
    const [resultado, setResultado] =
        useState<RespuestaInferencia | null>(null);

    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);


    // Comprobar conexion con FastAPI
    useEffect(() => {

        clienteApi.estado()
            .then(datos => setConexion(datos.estado))
            .catch(() => setConexion('Desconectado'));

    }, []);


    // Limpiar resultados anteriores
    function limpiarResultados() {
        setResultado(null);
        setMensaje('');
        setError('');
    }


    // Importar una red validada desde JSON
    function importarRed(nuevaRed: RedBayes) {

        // Reemplazar la red completa
        setRedActual(nuevaRed);

        // Reiniciar la vista de React Flow
        setVersionGrafo(anterior => anterior + 1);

        // Restablecer los selectores
        setConsulta(nuevaRed.nodos[0].id);
        setVariableEvidencia('');
        setEstadoEvidencia(nuevaRed.nodos[0].estados[0]);

        // Limpiar selecciones anteriores
        setNodoSeleccionado(null);
        setPadresSeleccionados({});

        limpiarResultados();

        setMensaje(
            `Red "${nuevaRed.nombre}" cargada correctamente.`
        );
    }


    // Agregar nodo
    function agregarNodo() {

        if (redActual.nodos.length >= 10) {
            setMensaje('');
            setError('La red no puede superar los 10 nodos');
            return;
        }

        let numero = 1;

        while (
            redActual.nodos.some(
                nodo => nodo.id === `N${numero}`
            )
        ) {
            numero++;
        }

        const nuevoNodo: NodoBayes = {
            id: `N${numero}`,
            nombre: `Nodo ${numero}`,
            estados: ['Si', 'No'],
            padres: [],
            posicion: {
                x: 100 +
                    (redActual.nodos.length % 3) * 220,
                y: 100 +
                    Math.floor(
                        redActual.nodos.length / 3
                    ) * 150
            },
            tabla: [
                {
                    condiciones: {},
                    probabilidades: {
                        Si: 0.5,
                        No: 0.5
                    }
                }
            ]
        };

        setRedActual(anterior => ({
            ...anterior,
            nodos: [
                ...anterior.nodos,
                nuevoNodo
            ]
        }));

        limpiarResultados();
    }


    // Renombrar un nodo
    function renombrarNodo(id: string) {

        const nodo = redActual.nodos.find(
            actual => actual.id === id
        );

        if (!nodo) {
            return;
        }

        const nuevoNombre = window.prompt(
            'Nuevo nombre del nodo:',
            nodo.nombre
        );

        if (nuevoNombre === null) {
            return;
        }

        if (!nuevoNombre.trim()) {
            setMensaje('');
            setError('El nombre no puede estar vacio');
            return;
        }

        setRedActual(anterior => ({
            ...anterior,
            nodos: anterior.nodos.map(actual =>
                actual.id === id
                    ? {
                        ...actual,
                        nombre: nuevoNombre.trim()
                    }
                    : actual
            )
        }));

        limpiarResultados();
    }


    // Eliminar nodo
    function eliminarNodo(id: string) {

        if (redActual.nodos.length <= 3) {
            setMensaje('');
            setError(
                'La red debe conservar al menos 3 nodos'
            );
            return;
        }

        const hijos = redActual.nodos.filter(
            nodo => nodo.padres.includes(id)
        );

        if (hijos.length > 0) {
            setMensaje('');
            setError(
                'Primero debes quitar las relaciones de este nodo'
            );
            return;
        }

        const confirmar = window.confirm(
            '¿Eliminar este nodo de la red?'
        );

        if (!confirmar) {
            return;
        }

        const nodosRestantes = redActual.nodos.filter(
            nodo => nodo.id !== id
        );

        setRedActual(anterior => ({
            ...anterior,
            nodos: nodosRestantes
        }));

        setNodoSeleccionado(actual =>
            actual === id ? null : actual
        );

        if (consulta === id) {
            setConsulta(nodosRestantes[0].id);
        }

        if (variableEvidencia === id) {
            setVariableEvidencia('');
            setEstadoEvidencia('Si');
        }

        setPadresSeleccionados(anterior => {

            const nuevos = { ...anterior };

            delete nuevos[id];

            for (const hijoId of Object.keys(nuevos)) {
                if (nuevos[hijoId] === id) {
                    nuevos[hijoId] = '';
                }
            }

            return nuevos;
        });

        limpiarResultados();
    }


    // Agregar relacion padre-hijo
    function agregarRelacion(
        idPadre: string,
        idHijo: string
    ) {

        const padre = redActual.nodos.find(
            nodo => nodo.id === idPadre
        );

        const hijo = redActual.nodos.find(
            nodo => nodo.id === idHijo
        );

        if (!padre || !hijo) {
            setMensaje('');
            setError('Selecciona un nodo padre valido');
            return;
        }

        if (idPadre === idHijo) {
            setMensaje('');
            setError(
                'Un nodo no puede ser su propio padre'
            );
            return;
        }

        if (hijo.padres.includes(idPadre)) {
            setMensaje('');
            setError('Esta relacion ya existe');
            return;
        }

        // Impedir ciclos
        if (
            existeCamino(
                idHijo,
                idPadre,
                redActual.nodos
            )
        ) {
            setMensaje('');
            setError(
                'No se puede crear la relacion: produciria un ciclo'
            );
            return;
        }

        const confirmar = window.confirm(
            'La tabla CPT del nodo hijo se reiniciara ' +
            'con probabilidades uniformes. ¿Continuar?'
        );

        if (!confirmar) {
            return;
        }

        const padresNuevos = [
            ...hijo.padres,
            idPadre
        ];

        const tablaNueva = construirTabla(
            hijo,
            padresNuevos,
            redActual.nodos
        );

        setRedActual(anterior => ({
            ...anterior,
            nodos: anterior.nodos.map(nodo =>
                nodo.id === idHijo
                    ? {
                        ...nodo,
                        padres: padresNuevos,
                        tabla: tablaNueva
                    }
                    : nodo
            )
        }));

        setPadresSeleccionados(anterior => ({
            ...anterior,
            [idHijo]: ''
        }));

        limpiarResultados();
    }


    // Eliminar relacion padre-hijo
    function quitarRelacion(
        idPadre: string,
        idHijo: string
    ) {

        const hijo = redActual.nodos.find(
            nodo => nodo.id === idHijo
        );

        if (!hijo || !hijo.padres.includes(idPadre)) {
            return;
        }

        const confirmar = window.confirm(
            'Se eliminara la relacion y se reiniciara ' +
            'la tabla CPT del hijo. ¿Continuar?'
        );

        if (!confirmar) {
            return;
        }

        const padresNuevos = hijo.padres.filter(
            padre => padre !== idPadre
        );

        const tablaNueva = construirTabla(
            hijo,
            padresNuevos,
            redActual.nodos
        );

        setRedActual(anterior => ({
            ...anterior,
            nodos: anterior.nodos.map(nodo =>
                nodo.id === idHijo
                    ? {
                        ...nodo,
                        padres: padresNuevos,
                        tabla: tablaNueva
                    }
                    : nodo
            )
        }));

        limpiarResultados();
    }


    // Guardar CPT editada
    function guardarCpt(
        idNodo: string,
        tablaNueva: FilaProbabilidad[]
    ) {

        setRedActual(anterior => ({
            ...anterior,
            nodos: anterior.nodos.map(nodo =>
                nodo.id === idNodo
                    ? {
                        ...nodo,
                        tabla: tablaNueva
                    }
                    : nodo
            )
        }));

        limpiarResultados();
    }


    // Actualizar posiciones desde React Flow
    function moverNodos(
        movimientos: {
            id: string;
            posicion: {
                x: number;
                y: number;
            };
        }[]
    ) {

        const posiciones = new Map(
            movimientos.map(movimiento => [
                movimiento.id,
                movimiento.posicion
            ])
        );

        setRedActual(anterior => ({
            ...anterior,
            nodos: anterior.nodos.map(nodo => {

                const posicion = posiciones.get(nodo.id);

                if (!posicion) {
                    return nodo;
                }

                if (
                    nodo.posicion.x === posicion.x &&
                    nodo.posicion.y === posicion.y
                ) {
                    return nodo;
                }

                return {
                    ...nodo,
                    posicion
                };
            })
        }));

        // Mover nodos no altera las CPT
    }


    // Validar red con FastAPI
    async function validar() {

        setError('');
        setMensaje('');

        try {

            const respuesta =
                await clienteApi.validar(redActual);

            setMensaje(respuesta.mensaje);

        } catch (problema) {

            setError(
                problema instanceof Error
                    ? problema.message
                    : 'Error de validacion'
            );
        }
    }


    // Ejecutar inferencia
    async function calcular() {

        setCargando(true);
        setError('');
        setResultado(null);

        const evidencia = variableEvidencia
            ? {
                [variableEvidencia]: estadoEvidencia
            }
            : {};

        try {

            const respuesta = await clienteApi.inferir(
                redActual,
                [consulta],
                evidencia,
                false
            );

            setResultado(respuesta);

        } catch (problema) {

            setError(
                problema instanceof Error
                    ? problema.message
                    : 'Error de inferencia'
            );

        } finally {
            setCargando(false);
        }
    }


    return (

        <main className="aplicacion">

            {/* Encabezado */}
            <header className="encabezado">

                <div>
                    <h1>Redes Bayesianas IDK</h1>
                    <p>Modelos probabilistas</p>
                </div>

                <span className="estado">
                    Backend: {conexion}
                </span>

            </header>


            {/* Editor grafico */}
            <GrafoBayesiano
                key={versionGrafo}
                red={redActual}
                seleccionado={nodoSeleccionado}
                onSeleccionar={setNodoSeleccionado}
                onConectar={agregarRelacion}
                onDesconectar={quitarRelacion}
                onMoverNodos={moverNodos}
            />


            {/* Importacion y exportacion JSON */}
            <GestorJson
                red={redActual}
                onImportar={importarRed}
            />


            {/* Panel de red */}
            <section className="panel">

                <h2>Red bayesiana</h2>

                <p>{redActual.nombre}</p>

                <p>
                    Nodos: {redActual.nodos.length} / 10
                </p>


                {/* Tarjetas de nodos */}
                <div className="nodos">

                    {redActual.nodos.map(nodo => (

                        <div
                            className="nodo"
                            key={nodo.id}
                        >

                            <strong>{nodo.nombre}</strong>

                            <small>
                                ID: {nodo.id}
                            </small>

                            <small>
                                Estados: {
                                    nodo.estados.join(', ')
                                }
                            </small>

                            <small>
                                Padres: {
                                    nodo.padres.join(', ') ||
                                    'Ninguno'
                                }
                            </small>


                            {/* Relaciones actuales */}
                            <div className="listaPadres">

                                {nodo.padres.map(idPadre => (

                                    <button
                                        key={idPadre}
                                        type="button"
                                        className="botonPadre"
                                        title="Quitar relacion"
                                        onClick={() =>
                                            quitarRelacion(
                                                idPadre,
                                                nodo.id
                                            )
                                        }
                                    >
                                        {idPadre} ×
                                    </button>

                                ))}

                            </div>


                            {/* Agregar padre */}
                            <div className="configuracionPadres">

                                <label>

                                    Agregar padre

                                    <select
                                        value={
                                            padresSeleccionados[nodo.id] ||
                                            ''
                                        }
                                        onChange={evento =>
                                            setPadresSeleccionados(
                                                anterior => ({
                                                    ...anterior,
                                                    [nodo.id]:
                                                        evento.target.value
                                                })
                                            )
                                        }
                                    >

                                        <option value="">
                                            Seleccionar
                                        </option>

                                        {redActual.nodos
                                            .filter(posiblePadre =>
                                                posiblePadre.id !== nodo.id &&
                                                !nodo.padres.includes(
                                                    posiblePadre.id
                                                )
                                            )
                                            .map(posiblePadre => (

                                                <option
                                                    key={posiblePadre.id}
                                                    value={posiblePadre.id}
                                                >
                                                    {posiblePadre.nombre}
                                                </option>

                                            ))}

                                    </select>

                                </label>

                                <button
                                    type="button"
                                    className="botonSecundario"
                                    disabled={
                                        !padresSeleccionados[nodo.id]
                                    }
                                    onClick={() =>
                                        agregarRelacion(
                                            padresSeleccionados[nodo.id],
                                            nodo.id
                                        )
                                    }
                                >
                                    Conectar
                                </button>

                            </div>


                            {/* Renombrar nodo */}
                            <button
                                type="button"
                                className="botonRenombrar"
                                onClick={() =>
                                    renombrarNodo(nodo.id)
                                }
                            >
                                Renombrar
                            </button>


                            {/* Eliminar nodo */}
                            <button
                                type="button"
                                className="botonEliminar"
                                onClick={() =>
                                    eliminarNodo(nodo.id)
                                }
                            >
                                Eliminar
                            </button>

                        </div>

                    ))}

                </div>


                {/* Acciones de la red */}
                <div className="accionesRed">

                    <button
                        type="button"
                        onClick={validar}
                    >
                        Validar red
                    </button>

                    <button
                        type="button"
                        onClick={agregarNodo}
                        disabled={
                            redActual.nodos.length >= 10
                        }
                    >
                        + Agregar nodo
                    </button>

                </div>


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


            {/* Editor CPT */}
            <EditorCpt
                red={redActual}
                onGuardar={guardarCpt}
            />


            {/* Consulta probabilistica */}
            <section className="panel">

                <h2>Consulta probabilistica</h2>

                <div className="campos">

                    {/* Variable de consulta */}
                    <label>

                        Variable de consulta

                        <select
                            value={consulta}
                            onChange={evento =>
                                setConsulta(evento.target.value)
                            }
                        >

                            {redActual.nodos.map(nodo => (

                                <option
                                    key={nodo.id}
                                    value={nodo.id}
                                >
                                    {nodo.nombre}
                                </option>

                            ))}

                        </select>

                    </label>


                    {/* Variable de evidencia */}
                    <label>

                        Variable de evidencia

                        <select
                            value={variableEvidencia}
                            onChange={evento => {

                                setVariableEvidencia(
                                    evento.target.value
                                );

                                setEstadoEvidencia(
                                    redActual.nodos.find(
                                        nodo =>
                                            nodo.id ===
                                            evento.target.value
                                    )?.estados[0] || 'Si'
                                );
                            }}
                        >

                            <option value="">
                                Sin evidencia
                            </option>

                            {redActual.nodos.map(nodo => (

                                <option
                                    key={nodo.id}
                                    value={nodo.id}
                                >
                                    {nodo.nombre}
                                </option>

                            ))}

                        </select>

                    </label>


                    {/* Estado de evidencia */}
                    <label>

                        Estado de evidencia

                        <select
                            value={estadoEvidencia}
                            disabled={!variableEvidencia}
                            onChange={evento =>
                                setEstadoEvidencia(
                                    evento.target.value
                                )
                            }
                        >

                            {(
                                redActual.nodos.find(
                                    nodo =>
                                        nodo.id === variableEvidencia
                                )?.estados || ['Si', 'No']
                            ).map(estado => (

                                <option
                                    key={estado}
                                    value={estado}
                                >
                                    {estado}
                                </option>

                            ))}

                        </select>

                    </label>

                </div>


                {/* Ejecutar consulta */}
                <button
                    type="button"
                    onClick={calcular}
                    disabled={cargando}
                >
                    {
                        cargando
                            ? 'Calculando...'
                            : 'Calcular probabilidades'
                    }
                </button>

            </section>


            {/* Resultados */}
            {resultado && (

                <section className="panel">

                    <h2>Resultados de inferencia</h2>

                    {resultado.distribucion.map(
                        (fila, indice) => (

                            <div
                                className="filaResultado"
                                key={indice}
                            >

                                <span>
                                    {
                                        Object.entries(
                                            fila.asignacion
                                        )
                                            .map(
                                                ([variable, estado]) =>
                                                    `${variable} = ${estado}`
                                            )
                                            .join(', ')
                                    }
                                </span>

                                <strong>
                                    {
                                        (
                                            fila.probabilidad * 100
                                        ).toFixed(2)
                                    }%
                                </strong>

                            </div>

                        )
                    )}

                    <p>
                        Probabilidad de evidencia:{' '}
                        {
                            resultado
                                .probabilidad_evidencia
                                .toFixed(6)
                        }
                    </p>

                </section>

            )}

        </main>
    );
}

export default App;
