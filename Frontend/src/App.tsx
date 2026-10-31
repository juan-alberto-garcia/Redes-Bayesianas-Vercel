
import { useEffect, useState } from 'react';
import { clienteApi } from './servicios/clienteApi';
import EditorCpt from './componentes/EditorCpt';

import type {
    RedBayes,
    NodoBayes,
    FilaProbabilidad,
    RespuestaInferencia
} from './tipos/red';

import './App.css';


// Red de prueba
const redEjemplo: RedBayes = {
    nombre: 'Red de prueba IDK',
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
            nombre: 'Cesped mojado',
            estados: ['Si', 'No'],
            padres: ['A'],
            posicion: { x: 350, y: 100 },
            tabla: [
                {
                    condiciones: { A: 'Si' },
                    probabilidades: {
                        Si: 0.9,
                        No: 0.1
                    }
                },
                {
                    condiciones: { A: 'No' },
                    probabilidades: {
                        Si: 0.2,
                        No: 0.8
                    }
                }
            ]
        },
        {
            id: 'C',
            nombre: 'Trafico',
            estados: ['Si', 'No'],
            padres: [],
            posicion: { x: 100, y: 300 },
            tabla: [
                {
                    condiciones: {},
                    probabilidades: {
                        Si: 0.4,
                        No: 0.6
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

        // Buscar los hijos del nodo actual
        for (const nodo of nodos) {
            if (nodo.padres.includes(actual)) {
                pendientes.push(nodo.id);
            }
        }
    }

    return false;
}


// Construir la tabla cuando cambian los padres
function construirTabla(
    nodoHijo: NodoBayes,
    padresNuevos: string[],
    nodos: NodoBayes[]
): FilaProbabilidad[] {

    let combinaciones: Record<string, string>[] = [{}];

    // Generar combinaciones de estados
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

    // Probabilidad uniforme inicial
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


function App() {

    // Red editable
    const [redActual, setRedActual] =
        useState<RedBayes>(redEjemplo);

    // Estado del servidor
    const [conexion, setConexion] =
        useState('Comprobando...');

    // Consulta y evidencia
    const [consulta, setConsulta] = useState('A');

    const [variableEvidencia, setVariableEvidencia] =
        useState('B');

    const [estadoEvidencia, setEstadoEvidencia] =
        useState('Si');

    // Padres seleccionados para cada nodo
    const [padresSeleccionados, setPadresSeleccionados] =
        useState<Record<string, string>>({});

    // Resultados
    const [resultado, setResultado] =
        useState<RespuestaInferencia | null>(null);

    // Mensajes
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


    // Agregar un nodo
    function agregarNodo() {

        // Limitar la red a 10 nodos
        if (redActual.nodos.length >= 10) {
            setMensaje('');
            setError('La red no puede superar los 10 nodos');
            return;
        }

        // Buscar un identificador disponible
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
            tabla: [
                {
                    condiciones: {},
                    probabilidades: {
                        Si: 0.5,
                        No: 0.5
                    }
                }
            ],
            posicion: {
                x: 100 +
                    (redActual.nodos.length % 3) * 220,
                y: 100 +
                    Math.floor(
                        redActual.nodos.length / 3
                    ) * 150
            }
        };

        // Actualizar la red
        setRedActual(anterior => ({
            ...anterior,
            nodos: [
                ...anterior.nodos,
                nuevoNodo
            ]
        }));

        limpiarResultados();
    }


    // Cambiar el nombre de un nodo
    function renombrarNodo(id: string) {

        const nodoSeleccionado = redActual.nodos.find(
            nodo => nodo.id === id
        );

        if (!nodoSeleccionado) {
            return;
        }

        const nuevoNombre = window.prompt(
            'Nuevo nombre del nodo:',
            nodoSeleccionado.nombre
        );

        if (nuevoNombre === null) {
            return;
        }

        if (!nuevoNombre.trim()) {
            setMensaje('');
            setError('El nombre no puede estar vacio');
            return;
        }

        // Actualizar solo el nodo seleccionado
        setRedActual(anterior => ({
            ...anterior,
            nodos: anterior.nodos.map(nodo =>
                nodo.id === id
                    ? {
                        ...nodo,
                        nombre: nuevoNombre.trim()
                    }
                    : nodo
            )
        }));

        limpiarResultados();
    }


    // Eliminar un nodo
    function eliminarNodo(id: string) {

        // Conservar minimo 3 nodos
        if (redActual.nodos.length <= 3) {
            setMensaje('');
            setError(
                'La red debe conservar al menos 3 nodos'
            );
            return;
        }

        // Comprobar si tiene hijos
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

        // Actualizar la red
        setRedActual(anterior => ({
            ...anterior,
            nodos: nodosRestantes
        }));

        // Actualizar variable de consulta
        if (consulta === id) {
            setConsulta(nodosRestantes[0].id);
        }

        // Actualizar evidencia
        if (variableEvidencia === id) {
            setVariableEvidencia('');
            setEstadoEvidencia('Si');
        }

        // Limpiar referencias en selectores de padres
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


    // Agregar una relacion padre-hijo
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

        // Comprobar nodos
        if (!padre || !hijo) {
            setMensaje('');
            setError('Selecciona un nodo padre valido');
            return;
        }

        // Evitar relacion consigo mismo
        if (idPadre === idHijo) {
            setMensaje('');
            setError(
                'Un nodo no puede ser su propio padre'
            );
            return;
        }

        // Evitar relaciones repetidas
        if (hijo.padres.includes(idPadre)) {
            setMensaje('');
            setError('Esta relacion ya existe');
            return;
        }

        // Evitar ciclos dirigidos
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

        // Avisar sobre el cambio de CPT
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

        // Generar tabla con nuevas combinaciones
        const tablaNueva = construirTabla(
            hijo,
            padresNuevos,
            redActual.nodos
        );

        // Guardar relacion y tabla
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

        // Limpiar selector
        setPadresSeleccionados(anterior => ({
            ...anterior,
            [idHijo]: ''
        }));

        limpiarResultados();
    }


    // Eliminar una relacion padre-hijo
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

        // Construir tabla sin ese padre
        const tablaNueva = construirTabla(
            hijo,
            padresNuevos,
            redActual.nodos
        );

        // Actualizar nodo hijo
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


    // Guardar una tabla CPT editada
    function guardarCpt(
        idNodo: string,
        tablaNueva: FilaProbabilidad[]
    ) {

        // Actualizar las probabilidades del nodo
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

        // Invalidar resultados anteriores
        limpiarResultados();
    }


    // Validar la red bayesiana
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


    // Ejecutar eliminacion de variables
    async function calcular() {

        setCargando(true);
        setError('');
        setResultado(null);

        // Preparar evidencia
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


            {/* Panel de red bayesiana */}
            <section className="panel">

                <h2>Red bayesiana</h2>

                <p>{redActual.nombre}</p>

                <p>
                    Nodos: {redActual.nodos.length} / 10
                </p>


                {/* Mostrar tarjetas de nodos */}
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


                            {/* Padres actuales */}
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


                            {/* Seleccionar un nuevo padre */}
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


                {/* Mensajes de la red */}
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


            {/* Editor de tablas CPT */}
            <EditorCpt
                red={redActual}
                onGuardar={guardarCpt}
            />


            {/* Panel de consulta probabilistica */}
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

                                setEstadoEvidencia('Si');
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
                            <option value="Si">
                                Si
                            </option>

                            <option value="No">
                                No
                            </option>

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


            {/* Resultados de inferencia */}
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
