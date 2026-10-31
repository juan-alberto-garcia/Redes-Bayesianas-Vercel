
import { useEffect, useState } from 'react';

import { clienteApi } from './servicios/clienteApi';

import EditorCpt from './componentes/EditorCpt';
import GrafoBayesiano from './componentes/GrafoBayesiano';
import GestorJson from './componentes/GestorJson';
import EditorEvidencias from './componentes/EditorEvidencias';
import EditorEstados from './componentes/EditorEstados';
import SelectorEjemplos from './componentes/SelectorEjemplos';

import { redesEjemplo } from './ejemplos/redesEjemplo';
import type { EjemploRed } from './ejemplos/redesEjemplo';

import type {
    RedBayes,
    NodoBayes,
    FilaProbabilidad,
    RespuestaInferencia
} from './tipos/red';

import './App.css';


// Limite de filas por tabla CPT
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

        // Buscar los hijos del nodo actual
        for (const nodo of nodos) {

            if (nodo.padres.includes(actual)) {
                pendientes.push(nodo.id);
            }
        }
    }

    return false;
}


// Contar las filas necesarias para una CPT
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
                `No existe el padre ${idPadre}.`
            );
        }

        cantidad *= padre.estados.length;
    }

    return cantidad;
}


// Construir una CPT con probabilidades uniformes
function construirTabla(
    nodoHijo: NodoBayes,
    padresNuevos: string[],
    nodos: NodoBayes[]
): FilaProbabilidad[] {

    let combinaciones: Record<string, string>[] = [{}];

    // Generar combinaciones de estados de los padres
    for (const idPadre of padresNuevos) {

        const padre = nodos.find(
            nodo => nodo.id === idPadre
        );

        if (!padre) {
            throw new Error(
                `No se encontro el padre ${idPadre}.`
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

    // Todos los estados tienen inicialmente igual probabilidad
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


// Componente principal
function App() {

    // Una sola red bayesiana activa
    const [redActual, setRedActual] = useState<RedBayes>(
        () => structuredClone(redesEjemplo[0].red)
    );

    // Reiniciar el editor CPT cuando sea necesario
    const [versionCpt, setVersionCpt] = useState(0);

    // Conexion con FastAPI
    const [conexion, setConexion] = useState(
        'Comprobando...'
    );

    // Variable de consulta
    const [consulta, setConsulta] = useState(
        redesEjemplo[0].consulta
    );

    // Evidencias multiples
    const [evidencias, setEvidencias] = useState<
        Record<string, string>
    >({
        ...redesEjemplo[0].evidencias
    });

    // Nodo seleccionado en React Flow
    const [
        nodoSeleccionado,
        setNodoSeleccionado
    ] = useState<string | null>(null);

    // Padres seleccionados en los formularios
    const [
        padresSeleccionados,
        setPadresSeleccionados
    ] = useState<Record<string, string>>({});

    // Resultados de inferencia
    const [resultado, setResultado] =
        useState<RespuestaInferencia | null>(null);

    // Mensajes
    const [mensaje, setMensaje] = useState('');
    const [error, setError] = useState('');

    // Estado del calculo
    const [cargando, setCargando] = useState(false);


    // Comprobar conexion con FastAPI
    useEffect(() => {

        clienteApi.estado()
            .then(datos => {
                setConexion(datos.estado);
            })
            .catch(() => {
                setConexion('Desconectado');
            });

    }, []);


    // Limpiar resultados anteriores
    function limpiarResultados() {

        setResultado(null);
        setMensaje('');
        setError('');
    }


    // Reemplazar la red actual
    function reemplazarRed(
        nuevaRed: RedBayes,
        nuevaConsulta: string,
        nuevasEvidencias: Record<string, string>,
        textoMensaje: string
    ) {

        // Reemplazar todos los nodos y conexiones
        setRedActual(nuevaRed);

        // Reiniciar formularios del editor CPT
        setVersionCpt(anterior => anterior + 1);

        // Configurar nueva consulta
        setConsulta(nuevaConsulta);

        // Configurar nuevas evidencias
        setEvidencias({
            ...nuevasEvidencias
        });

        // Limpiar selecciones anteriores
        setNodoSeleccionado(null);
        setPadresSeleccionados({});

        // Descartar los resultados anteriores
        setResultado(null);
        setError('');

        setMensaje(textoMensaje);

        // React Flow permanece montado
        // y recibe los nuevos datos mediante redActual
    }


    // Importar una red desde JSON
    function importarRed(nuevaRed: RedBayes) {

        reemplazarRed(
            nuevaRed,
            nuevaRed.nodos[0].id,
            {},
            `Red "${nuevaRed.nombre}" importada correctamente.`
        );
    }


    // Cargar un ejemplo del catalogo
    function cargarEjemplo(ejemplo: EjemploRed) {

        // Crear copia independiente del catalogo
        const nuevaRed = structuredClone(ejemplo.red);

        // Reemplazar la red activa
        reemplazarRed(
            nuevaRed,
            ejemplo.consulta,
            ejemplo.evidencias,
            `Ejemplo "${ejemplo.titulo}" cargado correctamente.`
        );
    }


    // Cambiar la variable consultada
    function cambiarConsulta(id: string) {

        setConsulta(id);

        // La consulta no puede ser tambien evidencia
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


    // Actualizar las evidencias
    function actualizarEvidencias(
        nuevas: Record<string, string>
    ) {

        setEvidencias(nuevas);
        limpiarResultados();
    }


    // Agregar un nodo
    function agregarNodo() {

        // Maximo de diez nodos
        if (redActual.nodos.length >= 10) {

            setMensaje('');
            setError(
                'La red no puede superar los 10 nodos.'
            );

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

        // Crear el nuevo nodo
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
                        Si: 0.50,
                        No: 0.50
                    }
                }
            ]
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

        // Validar el nombre
        if (!nuevoNombre.trim()) {

            setMensaje('');
            setError(
                'El nombre no puede estar vacio.'
            );

            return;
        }

        // Actualizar nombre
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


    // Eliminar un nodo
    function eliminarNodo(id: string) {

        // Conservar un minimo de tres nodos
        if (redActual.nodos.length <= 3) {

            setMensaje('');
            setError(
                'La red debe conservar al menos 3 nodos.'
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
                'Primero debes quitar las relaciones de este nodo.'
            );

            return;
        }

        const confirmar = window.confirm(
            '¿Eliminar este nodo de la red?'
        );

        if (!confirmar) {
            return;
        }

        // Eliminar de la lista
        const restantes = redActual.nodos.filter(
            nodo => nodo.id !== id
        );

        // Actualizar la consulta si es necesario
        const nuevaConsulta = consulta === id
            ? restantes[0].id
            : consulta;

        setRedActual(anterior => ({
            ...anterior,
            nodos: restantes
        }));

        // Quitar seleccion grafica
        setNodoSeleccionado(actual =>
            actual === id ? null : actual
        );

        setConsulta(nuevaConsulta);

        // Eliminar evidencias invalidas
        setEvidencias(anteriores => {

            const nuevas = { ...anteriores };

            delete nuevas[id];
            delete nuevas[nuevaConsulta];

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

        // Comprobar que existan
        if (!padre || !hijo) {

            setMensaje('');
            setError(
                'Selecciona un nodo padre valido.'
            );

            return;
        }

        // No permitir relacion consigo mismo
        if (idPadre === idHijo) {

            setMensaje('');
            setError(
                'Un nodo no puede ser su propio padre.'
            );

            return;
        }

        // No permitir relacion repetida
        if (hijo.padres.includes(idPadre)) {

            setMensaje('');
            setError(
                'Esta relacion ya existe.'
            );

            return;
        }

        // No permitir ciclos dirigidos
        if (
            existeCamino(
                idHijo,
                idPadre,
                redActual.nodos
            )
        ) {

            setMensaje('');
            setError(
                'No se puede crear la relacion: produciria un ciclo.'
            );

            return;
        }

        // Agregar el nuevo padre
        const padresNuevos = [
            ...hijo.padres,
            idPadre
        ];

        // Comprobar tamano de CPT
        const filas = contarFilasCpt(
            padresNuevos,
            redActual.nodos
        );

        if (filas > LIMITE_FILAS_CPT) {

            setMensaje('');
            setError(
                'Esta relacion generaria una CPT demasiado grande.'
            );

            return;
        }

        // Avisar que se reiniciaran probabilidades
        const confirmar = window.confirm(
            'La tabla CPT del nodo hijo se reiniciara ' +
            'con probabilidades uniformes. ¿Continuar?'
        );

        if (!confirmar) {
            return;
        }

        // Generar nueva CPT
        const tablaNueva = construirTabla(
            hijo,
            padresNuevos,
            redActual.nodos
        );

        // Guardar la relacion
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

        // Limpiar selector utilizado
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

        // Confirmar eliminacion
        const confirmar = window.confirm(
            'Se eliminara la relacion y se reiniciara ' +
            'la tabla CPT del hijo. ¿Continuar?'
        );

        if (!confirmar) {
            return;
        }

        // Quitar padre
        const padresNuevos = hijo.padres.filter(
            padre => padre !== idPadre
        );

        // Reconstruir tabla
        const tablaNueva = construirTabla(
            hijo,
            padresNuevos,
            redActual.nodos
        );

        // Guardar cambios
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


    // Guardar tabla CPT editada
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


    // Personalizar estados de un nodo
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

        // Comprobar que exista
        if (!nodo) {

            return {
                correcto: false,
                mensaje: 'El nodo seleccionado no existe.'
            };
        }

        // Comprobar cantidad de estados
        if (
            estados.length < 2 ||
            estados.length > 6
        ) {

            return {
                correcto: false,
                mensaje: 'Se requieren entre 2 y 6 estados.'
            };
        }

        // Crear copia de nodos con estados nuevos
        const nodosConEstados = redActual.nodos.map(
            actual =>
                actual.id === idNodo
                    ? {
                        ...actual,
                        estados: [...estados]
                    }
                    : actual
        );

        // Buscar nodo afectado e hijos directos
        const afectados = nodosConEstados.filter(
            actual =>
                actual.id === idNodo ||
                actual.padres.includes(idNodo)
        );

        // Verificar cantidad de filas de CPT
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

        // Preparar mensaje de confirmacion
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

        // Confirmar cambios
        if (!window.confirm(advertencia)) {

            return {
                correcto: false,
                mensaje: 'Cambio cancelado.'
            };
        }

        // Construir CPT nuevas de los nodos afectados
        const nodosActualizados = nodosConEstados.map(
            actual => {

                const afectado =
                    actual.id === idNodo ||
                    actual.padres.includes(idNodo);

                if (!afectado) {
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

        // Guardar cambios en la red
        setRedActual(anterior => ({
            ...anterior,
            nodos: nodosActualizados
        }));

        // Revisar si la evidencia sigue siendo valida
        setEvidencias(anteriores => {

            if (
                !Object.prototype.hasOwnProperty.call(
                    anteriores,
                    idNodo
                )
            ) {
                return anteriores;
            }

            if (estados.includes(anteriores[idNodo])) {
                return anteriores;
            }

            const nuevas = { ...anteriores };

            delete nuevas[idNodo];

            return nuevas;
        });

        // Reiniciar editor CPT
        setVersionCpt(anterior => anterior + 1);

        limpiarResultados();

        const mensajeExito =
            `Estados de "${nodo.nombre}" actualizados. ` +
            'Revisa las tablas CPT.';

        setMensaje(mensajeExito);

        return {
            correcto: true,
            mensaje: mensajeExito
        };
    }


    // Guardar posiciones de React Flow
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

        setRedActual(anterior => {

            let huboCambios = false;

            const nodos = anterior.nodos.map(nodo => {

                const posicion = posiciones.get(nodo.id);

                if (!posicion) {
                    return nodo;
                }

                // No actualizar si la posicion es identica
                if (
                    nodo.posicion.x === posicion.x &&
                    nodo.posicion.y === posicion.y
                ) {
                    return nodo;
                }

                huboCambios = true;

                return {
                    ...nodo,
                    posicion
                };
            });

            // Evitar renders innecesarios
            if (!huboCambios) {
                return anterior;
            }

            return {
                ...anterior,
                nodos
            };
        });
    }


    // Validar red mediante FastAPI
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
                    : 'Error de validacion.'
            );
        }
    }


    // Calcular probabilidades
    async function calcular() {

        setCargando(true);
        setError('');
        setResultado(null);

        try {

            // Consultar mediante FastAPI
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
                    : 'Error de inferencia.'
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


            {/* Catalogo de ejemplos */}
            <SelectorEjemplos
                onCargar={cargarEjemplo}
            />


            {/* Unico editor grafico de la aplicacion */}
            <GrafoBayesiano
                red={redActual}
                seleccionado={nodoSeleccionado}
                onSeleccionar={setNodoSeleccionado}
                onConectar={agregarRelacion}
                onDesconectar={quitarRelacion}
                onMoverNodos={moverNodos}
            />


            {/* Importar y exportar JSON */}
            <GestorJson
                red={redActual}
                onImportar={importarRed}
            />


            {/* Administracion de nodos */}
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

                            <strong>
                                {nodo.nombre}
                            </strong>

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


                            {/* Crear relaciones */}
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


                {/* Acciones de red */}
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


            {/* Editor de estados */}
            <EditorEstados
                red={redActual}
                onGuardar={guardarEstados}
            />


            {/* Editor de tablas CPT */}
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


                {/* Multiples evidencias */}
                <EditorEvidencias
                    red={redActual}
                    consulta={consulta}
                    evidencias={evidencias}
                    onCambiar={actualizarEvidencias}
                />


                {/* Ejecutar inferencia */}
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
