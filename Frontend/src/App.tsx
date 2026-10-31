
import { useEffect, useState } from 'react';

import { clienteApi } from './servicios/clienteApi';

import EditorCpt from './componentes/EditorCpt';
import GrafoBayesiano from './componentes/GrafoBayesiano';
import GestorJson from './componentes/GestorJson';
import EditorEvidencias from './componentes/EditorEvidencias';
import EditorEstados from './componentes/EditorEstados';

import type {
    RedBayes,
    NodoBayes,
    FilaProbabilidad,
    RespuestaInferencia
} from './tipos/red';

import './App.css';


// Red de ejemplo
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
                    condiciones: { A: 'Si', B: 'Si' },
                    probabilidades: {
                        Si: 0.99,
                        No: 0.01
                    }
                },
                {
                    condiciones: { A: 'Si', B: 'No' },
                    probabilidades: {
                        Si: 0.90,
                        No: 0.10
                    }
                },
                {
                    condiciones: { A: 'No', B: 'Si' },
                    probabilidades: {
                        Si: 0.80,
                        No: 0.20
                    }
                },
                {
                    condiciones: { A: 'No', B: 'No' },
                    probabilidades: {
                        Si: 0.01,
                        No: 0.99
                    }
                }
            ]
        }
    ]
};


// Limite para evitar tablas excesivamente grandes
const LIMITE_FILAS_CPT = 512;


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

        for (const nodo of nodos) {

            if (nodo.padres.includes(actual)) {
                pendientes.push(nodo.id);
            }
        }
    }

    return false;
}


// Calcular cantidad de filas necesarias para una CPT
function contarFilasCpt(
    padres: string[],
    nodos: NodoBayes[]
): number {

    let cantidad = 1;

    for (const idPadre of padres) {

        const padre = nodos.find(
            nodo => nodo.id === idPadre
        );

        if (!padre) {
            throw new Error(
                `No existe el nodo padre ${idPadre}`
            );
        }

        cantidad *= padre.estados.length;
    }

    return cantidad;
}


// Construir tabla CPT con probabilidades uniformes
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
            throw new Error(
                'No se encontro el nodo padre'
            );
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

    // Red actual
    const [redActual, setRedActual] =
        useState<RedBayes>(redEjemplo);

    // Versiones para reiniciar componentes al importar
    const [versionGrafo, setVersionGrafo] =
        useState(0);

    const [versionCpt, setVersionCpt] =
        useState(0);

    // Estado del Backend
    const [conexion, setConexion] =
        useState('Comprobando...');

    // Consulta
    const [consulta, setConsulta] =
        useState('A');

    // Evidencias multiples
    const [evidencias, setEvidencias] =
        useState<Record<string, string>>({
            C: 'Si'
        });

    // Seleccion de nodos
    const [
        nodoSeleccionado,
        setNodoSeleccionado
    ] = useState<string | null>(null);

    // Padres seleccionados en los formularios
    const [
        padresSeleccionados,
        setPadresSeleccionados
    ] = useState<Record<string, string>>({});

    // Resultados y mensajes
    const [resultado, setResultado] =
        useState<RespuestaInferencia | null>(null);

    const [mensaje, setMensaje] =
        useState('');

    const [error, setError] =
        useState('');

    const [cargando, setCargando] =
        useState(false);


    // Comprobar la conexion con FastAPI
    useEffect(() => {

        clienteApi.estado()
            .then(datos => {
                setConexion(datos.estado);
            })
            .catch(() => {
                setConexion('Desconectado');
            });

    }, []);


    // Limpiar los resultados anteriores
    function limpiarResultados() {

        setResultado(null);
        setMensaje('');
        setError('');
    }


    // Cambiar variable de consulta
    function cambiarConsulta(id: string) {

        setConsulta(id);

        // La consulta no debe ser evidencia
        setEvidencias(anteriores => {

            if (
                !Object.prototype.hasOwnProperty.call(
                    anteriores,
                    id
                )
            ) {
                return anteriores;
            }

            const nuevas = { ...anteriores };

            delete nuevas[id];

            return nuevas;
        });

        limpiarResultados();
    }


    // Cambiar evidencias
    function actualizarEvidencias(
        nuevas: Record<string, string>
    ) {

        setEvidencias(nuevas);
        limpiarResultados();
    }


    // Importar red desde JSON
    function importarRed(nuevaRed: RedBayes) {

        setRedActual(nuevaRed);

        // Reiniciar los componentes con estado local
        setVersionGrafo(anterior => anterior + 1);
        setVersionCpt(anterior => anterior + 1);

        // Restablecer consulta y evidencias
        setConsulta(nuevaRed.nodos[0].id);
        setEvidencias({});

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

            setError(
                'La red no puede superar los 10 nodos'
            );

            setMensaje('');
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


    // Renombrar nodo
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
            setError(
                'El nombre no puede estar vacio'
            );

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

        // No eliminar nodos que tengan hijos
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

        const restantes = redActual.nodos.filter(
            nodo => nodo.id !== id
        );

        setRedActual(anterior => ({
            ...anterior,
            nodos: restantes
        }));

        setNodoSeleccionado(actual =>
            actual === id ? null : actual
        );

        if (consulta === id) {
            setConsulta(restantes[0].id);
        }

        // Quitar evidencia si el nodo fue eliminado
        setEvidencias(anteriores => {

            const nuevas = { ...anteriores };

            delete nuevas[id];

            return nuevas;
        });

        // Limpiar selectores de padres
        setPadresSeleccionados(anteriores => {

            const nuevos = { ...anteriores };

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


    // Agregar relacion dirigida
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

        const padresNuevos = [
            ...hijo.padres,
            idPadre
        ];

        // Evitar CPT demasiado grandes
        const filas = contarFilasCpt(
            padresNuevos,
            redActual.nodos
        );

        if (filas > LIMITE_FILAS_CPT) {

            setMensaje('');
            setError(
                'La relacion requiere demasiadas filas CPT.'
            );

            return;
        }

        // Avisar que se reiniciara la CPT del hijo
        const confirmar = window.confirm(
            'La tabla CPT del nodo hijo se reiniciara ' +
            'con probabilidades uniformes. ¿Continuar?'
        );

        if (!confirmar) {
            return;
        }

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

        setPadresSeleccionados(anteriores => ({
            ...anteriores,
            [idHijo]: ''
        }));

        limpiarResultados();
    }


    // Quitar relacion dirigida
    function quitarRelacion(
        idPadre: string,
        idHijo: string
    ) {

        const hijo = redActual.nodos.find(
            nodo => nodo.id === idHijo
        );

        if (
            !hijo ||
            !hijo.padres.includes(idPadre)
        ) {
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


    // Guardar una CPT editada
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


    // Personalizar los estados de un nodo
    function guardarEstados(
        idNodo: string,
        estados: string[]
    ): {
        correcto: boolean;
        mensaje: string;
    } {

        const nodo = redActual.nodos.find(
            actual => actual.id === idNodo
        );

        if (!nodo) {
            return {
                correcto: false,
                mensaje: 'El nodo seleccionado no existe.'
            };
        }

        if (
            estados.length < 2 ||
            estados.length > 6
        ) {
            return {
                correcto: false,
                mensaje: 'Se requieren entre 2 y 6 estados.'
            };
        }

        // Crear copia con los nuevos estados
        const nodosConEstados = redActual.nodos.map(
            actual =>
                actual.id === idNodo
                    ? {
                        ...actual,
                        estados: [...estados]
                    }
                    : actual
        );

        // El nodo y sus hijos necesitan nuevas CPT
        const afectados = nodosConEstados.filter(
            actual =>
                actual.id === idNodo ||
                actual.padres.includes(idNodo)
        );

        // Verificar cantidad de combinaciones
        for (const afectado of afectados) {

            const filas = contarFilasCpt(
                afectado.padres,
                nodosConEstados
            );

            if (filas > LIMITE_FILAS_CPT) {

                return {
                    correcto: false,
                    mensaje:
                        `El cambio generaria ${filas} filas ` +
                        `en la CPT de ${afectado.nombre}. ` +
                        `El limite es ${LIMITE_FILAS_CPT}.`
                };
            }
        }

        // Describir las consecuencias
        const nombresHijos = afectados
            .filter(actual => actual.id !== idNodo)
            .map(actual => actual.nombre);

        let advertencia =
            `Se modificaran los estados de "${nodo.nombre}".\n\n` +
            'Su tabla CPT se reiniciara con ' +
            'probabilidades uniformes.';

        if (nombresHijos.length > 0) {

            advertencia +=
                '\n\nTambien se reiniciaran las CPT de:\n' +
                nombresHijos.join('\n');
        }

        advertencia += '\n\n¿Deseas continuar?';

        const confirmar = window.confirm(advertencia);

        if (!confirmar) {

            return {
                correcto: false,
                mensaje: 'Cambio cancelado.'
            };
        }

        // Reconstruir solo las CPT afectadas
        const nodosActualizados = nodosConEstados.map(
            actual => {

                const debeActualizar =
                    actual.id === idNodo ||
                    actual.padres.includes(idNodo);

                if (!debeActualizar) {
                    return actual;
                }

                return {
                    ...actual,
                    tabla: construirTabla(
                        actual,
                        actual.padres,
                        nodosConEstados
                    )
                };
            }
        );

        // Guardar la red modificada
        setRedActual(anterior => ({
            ...anterior,
            nodos: nodosActualizados
        }));

        // Quitar evidencia si el estado observado ya no existe
        setEvidencias(anteriores => {

            if (
                !Object.prototype.hasOwnProperty.call(
                    anteriores,
                    idNodo
                )
            ) {
                return anteriores;
            }

            if (
                estados.includes(anteriores[idNodo])
            ) {
                return anteriores;
            }

            const nuevas = { ...anteriores };

            delete nuevas[idNodo];

            return nuevas;
        });

        // Reiniciar el formulario CPT
        setVersionCpt(anterior => anterior + 1);

        // Invalidar resultados calculados antes del cambio
        limpiarResultados();

        const mensajeExito =
            `Estados de "${nodo.nombre}" actualizados. ` +
            'Revisa las probabilidades CPT.';

        setMensaje(mensajeExito);

        return {
            correcto: true,
            mensaje: mensajeExito
        };
    }


    // Guardar posiciones al mover nodos
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


    // Ejecutar inferencia con multiples evidencias
    async function calcular() {

        setCargando(true);
        setError('');
        setResultado(null);

        try {

            const respuesta = await clienteApi.inferir(
                redActual,
                [consulta],
                evidencias,
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


            {/* Grafo interactivo */}
            <GrafoBayesiano
                key={versionGrafo}
                red={redActual}
                seleccionado={nodoSeleccionado}
                onSeleccionar={setNodoSeleccionado}
                onConectar={agregarRelacion}
                onDesconectar={quitarRelacion}
                onMoverNodos={moverNodos}
            />


            {/* Guardar y cargar redes JSON */}
            <GestorJson
                red={redActual}
                onImportar={importarRed}
            />


            {/* Panel de administracion de la red */}
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


                            {/* Selector para agregar padres */}
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
                                                anteriores => ({
                                                    ...anteriores,
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


                {/* Acciones sobre la red */}
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


            {/* Personalizacion de estados */}
            <EditorEstados
                red={redActual}
                onGuardar={guardarEstados}
            />


            {/* Editor de probabilidades CPT */}
            <EditorCpt
                key={versionCpt}
                red={redActual}
                onGuardar={guardarCpt}
            />


            {/* Consulta probabilistica */}
            <section className="panel">

                <h2>Consulta probabilistica</h2>

                <div className="campos">

                    <label>

                        Variable de consulta

                        <select
                            value={consulta}
                            onChange={evento =>
                                cambiarConsulta(
                                    evento.target.value
                                )
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

                </div>


                {/* Editor de multiples evidencias */}
                <EditorEvidencias
                    red={redActual}
                    consulta={consulta}
                    evidencias={evidencias}
                    onCambiar={actualizarEvidencias}
                />


                {/* Boton de inferencia */}
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
