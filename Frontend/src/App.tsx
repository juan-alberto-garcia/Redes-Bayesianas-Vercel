
import { useEffect, useRef, useState } from 'react';

import { clienteApi } from './servicios/clienteApi';

import EditorCpt from './componentes/EditorCpt';
import GrafoBayesiano from './componentes/GrafoBayesiano';
import GestorJson from './componentes/GestorJson';
import EditorEvidencias from './componentes/EditorEvidencias';
import EditorEstados from './componentes/EditorEstados';
import SelectorEjemplos from './componentes/SelectorEjemplos';
import HistorialConsultas from './componentes/HistorialConsultas';

import { redesEjemplo } from './ejemplos/redesEjemplo';
import type { EjemploRed } from './ejemplos/redesEjemplo';

import {
    crearFirmaRed,
    leerHistorial,
    guardarHistorial,
    LIMITE_HISTORIAL
} from './servicios/historialConsultas';

import type {
    RegistroConsulta
} from './servicios/historialConsultas';

import type {
    RedBayes,
    NodoBayes,
    FilaProbabilidad,
    RespuestaInferencia
} from './tipos/red';

import './App.css';


// Limite de filas en una tabla CPT
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

        // Buscar hijos del nodo
        for (const nodo of nodos) {

            if (nodo.padres.includes(actual)) {
                pendientes.push(nodo.id);
            }
        }
    }

    return false;
}


// Contar las combinaciones de estados de los padres
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


// Construir CPT con probabilidades uniformes
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

    // Una sola red activa
    const [redActual, setRedActual] = useState<RedBayes>(
        () => structuredClone(redesEjemplo[0].red)
    );

    // Version del editor CPT
    const [versionCpt, setVersionCpt] = useState(0);

    // Conexion con FastAPI
    const [conexion, setConexion] = useState(
        'Comprobando...'
    );

    // Consulta y evidencias
    const [consulta, setConsulta] = useState(
        redesEjemplo[0].consulta
    );

    const [evidencias, setEvidencias] = useState<
        Record<string, string>
    >({
        ...redesEjemplo[0].evidencias
    });

    // Seleccion de nodos
    const [
        nodoSeleccionado,
        setNodoSeleccionado
    ] = useState<string | null>(null);

    // Padres seleccionados
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

    // Historial persistente
    const [historial, setHistorial] = useState<
        RegistroConsulta[]
    >(leerHistorial);

    // Identificador del calculo actual
    const solicitudActual = useRef(0);


    // Verificar conexion con el Backend
    useEffect(() => {

        clienteApi.estado()
            .then(datos => {
                setConexion(datos.estado);
            })
            .catch(() => {
                setConexion('Desconectado');
            });

    }, []);


    // Guardar historial despues de cada cambio
    useEffect(() => {

        guardarHistorial(historial);

    }, [historial]);


    // Limpiar resultados
    function limpiarResultados() {

        // Ignorar respuestas pendientes anteriores
        solicitudActual.current += 1;

        setCargando(false);
        setResultado(null);
        setMensaje('');
        setError('');
    }


    // Reemplazar la red activa
    function reemplazarRed(
        nuevaRed: RedBayes,
        nuevaConsulta: string,
        nuevasEvidencias: Record<string, string>,
        textoMensaje: string
    ) {

        // Invalidar consultas anteriores
        solicitudActual.current += 1;
        setCargando(false);

        // Reemplazar red sin duplicar React Flow
        setRedActual(nuevaRed);

        // Reiniciar formularios CPT
        setVersionCpt(anterior => anterior + 1);

        // Aplicar consulta y evidencias
        setConsulta(nuevaConsulta);
        setEvidencias({ ...nuevasEvidencias });

        // Limpiar selecciones
        setNodoSeleccionado(null);
        setPadresSeleccionados({});

        setResultado(null);
        setError('');
        setMensaje(textoMensaje);
    }


    // Importar red desde JSON
    function importarRed(nuevaRed: RedBayes) {

        reemplazarRed(
            nuevaRed,
            nuevaRed.nodos[0].id,
            {},
            `Red "${nuevaRed.nombre}" importada correctamente.`
        );
    }


    // Cargar un ejemplo
    function cargarEjemplo(ejemplo: EjemploRed) {

        const nuevaRed = structuredClone(ejemplo.red);

        reemplazarRed(
            nuevaRed,
            ejemplo.consulta,
            ejemplo.evidencias,
            `Ejemplo "${ejemplo.titulo}" cargado correctamente.`
        );
    }


    // Recuperar consulta guardada
    function recuperarConsulta(registro: RegistroConsulta) {

        // Comprobar si la red actual es la misma
        const mismaRed =
            crearFirmaRed(redActual) === registro.firmaRed;

        // Si cambiaron la red o las CPT, pedir confirmacion
        if (!mismaRed) {

            const confirmar = window.confirm(
                'La consulta guardada utiliza una red ' +
                'diferente o con otras CPT.\n\n' +
                'Para recuperarla se reemplazara la red actual.\n' +
                'Puedes exportar antes tus cambios a JSON.\n\n' +
                '¿Deseas continuar?'
            );

            if (!confirmar) {
                return;
            }
        }

        // Recuperar la red original cuando sea necesario
        if (!mismaRed) {

            reemplazarRed(
                structuredClone(registro.red),
                registro.consulta,
                registro.evidencias,
                'Se recupero la red original de la consulta.'
            );

        } else {

            // Mantener el mismo editor y la misma red
            solicitudActual.current += 1;
            setCargando(false);

            setConsulta(registro.consulta);

            setEvidencias({
                ...registro.evidencias
            });

            setError('');

            setMensaje(
                'Consulta recuperada del historial.'
            );
        }

        // Mostrar resultado sin volver a calcular
        setResultado(
            structuredClone(registro.resultado)
        );
    }


    // Eliminar una consulta guardada
    function eliminarRegistro(id: string) {

        setHistorial(anteriores =>
            anteriores.filter(
                registro => registro.id !== id
            )
        );
    }


    // Vaciar historial
    function vaciarHistorial() {

        setHistorial([]);
    }


    // Cambiar variable consultada
    function cambiarConsulta(id: string) {

        setConsulta(id);

        // Una variable consultada no puede ser evidencia
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


    // Actualizar evidencias
    function actualizarEvidencias(
        nuevas: Record<string, string>
    ) {

        setEvidencias(nuevas);

        limpiarResultados();
    }


    // Agregar nuevo nodo
    function agregarNodo() {

        if (redActual.nodos.length >= 10) {

            setMensaje('');

            setError(
                'La red no puede superar los 10 nodos.'
            );

            return;
        }

        // Buscar ID disponible
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
                        Si: 0.50,
                        No: 0.50
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


    // Cambiar nombre de un nodo
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
                'El nombre no puede estar vacio.'
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
                'La red debe conservar al menos 3 nodos.'
            );

            return;
        }

        // Evitar eliminar nodos con hijos
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

        const restantes = redActual.nodos.filter(
            nodo => nodo.id !== id
        );

        // Mantener una consulta valida
        const nuevaConsulta = consulta === id
            ? restantes[0].id
            : consulta;

        setRedActual(anterior => ({
            ...anterior,
            nodos: restantes
        }));

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


    // Crear relacion padre-hijo
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

            setError(
                'Selecciona un nodo padre valido.'
            );

            return;
        }

        // Impedir que un nodo sea su propio padre
        if (idPadre === idHijo) {

            setMensaje('');

            setError(
                'Un nodo no puede ser su propio padre.'
            );

            return;
        }

        // Impedir relaciones duplicadas
        if (hijo.padres.includes(idPadre)) {

            setMensaje('');

            setError(
                'Esta relacion ya existe.'
            );

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
                'No se puede crear la relacion: produciria un ciclo.'
            );

            return;
        }

        const padresNuevos = [
            ...hijo.padres,
            idPadre
        ];

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

        const confirmar = window.confirm(
            'La tabla CPT del nodo hijo se reiniciara ' +
            'con probabilidades uniformes. ¿Continuar?'
        );

        if (!confirmar) {
            return;
        }

        // Crear nueva tabla CPT
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


    // Quitar relacion padre-hijo
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


    // Personalizar estados
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

        // Validar cantidad de estados
        if (
            estados.length < 2 ||
            estados.length > 6
        ) {

            return {
                correcto: false,
                mensaje: 'Se requieren entre 2 y 6 estados.'
            };
        }

        // Copiar nodos con los nuevos estados
        const nodosConEstados = redActual.nodos.map(
            actual =>
                actual.id === idNodo
                    ? {
                        ...actual,
                        estados: [...estados]
                    }
                    : actual
        );

        // Encontrar nodos afectados
        const afectados = nodosConEstados.filter(
            actual =>
                actual.id === idNodo ||
                actual.padres.includes(idNodo)
        );

        // Comprobar tamano de las CPT
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

        // Mostrar nodos afectados
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

        if (!window.confirm(advertencia)) {

            return {
                correcto: false,
                mensaje: 'Cambio cancelado.'
            };
        }

        // Reconstruir CPT de nodos afectados
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

        setRedActual(anterior => ({
            ...anterior,
            nodos: nodosActualizados
        }));

        // Eliminar evidencia si su estado desaparecio
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


    // Guardar posiciones al arrastrar nodos
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

            if (!huboCambios) {
                return anterior;
            }

            return {
                ...anterior,
                nodos
            };
        });
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
                    : 'Error de validacion.'
            );
        }
    }


    // Calcular inferencia y guardar en historial
    async function calcular() {

        // Capturar los datos utilizados en este calculo
        const redConsultada = structuredClone(redActual);

        const consultaGuardada = consulta;

        const evidenciasGuardadas = {
            ...evidencias
        };

        // Identificar esta solicitud
        const identificadorSolicitud =
            ++solicitudActual.current;

        setCargando(true);
        setError('');
        setResultado(null);

        try {

            // Ejecutar eliminacion de variables en FastAPI
            const respuesta = await clienteApi.inferir(
                redConsultada,
                [consultaGuardada],
                evidenciasGuardadas,
                false
            );

            // Ignorar respuesta si se modifico la consulta
            // mientras el Backend calculaba
            if (
                identificadorSolicitud !==
                solicitudActual.current
            ) {
                return;
            }

            // Mostrar distribucion
            setResultado(respuesta);

            // Crear registro completo
            const registro: RegistroConsulta = {

                id:
                    `${Date.now()}-` +
                    Math.random().toString(36).slice(2),

                fecha: new Date().toISOString(),

                // Conservar una copia de la red
                red: redConsultada,

                // Identificar estructura y CPT
                firmaRed: crearFirmaRed(redConsultada),

                // Consulta realizada
                consulta: consultaGuardada,

                consultaNombre:
                    redConsultada.nodos.find(
                        nodo => nodo.id === consultaGuardada
                    )?.nombre || consultaGuardada,

                evidencias: evidenciasGuardadas,

                // Guardar el resultado completo
                resultado: structuredClone(respuesta)
            };

            // Agregar al inicio del historial
            setHistorial(anteriores => [
                registro,
                ...anteriores
            ].slice(0, LIMITE_HISTORIAL));

        } catch (problema) {

            if (
                identificadorSolicitud ===
                solicitudActual.current
            ) {

                setError(
                    problema instanceof Error
                        ? problema.message
                        : 'Error de inferencia.'
                );
            }

        } finally {

            if (
                identificadorSolicitud ===
                solicitudActual.current
            ) {
                setCargando(false);
            }
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


            {/* Catalogo de redes */}
            <SelectorEjemplos
                onCargar={cargarEjemplo}
            />


            {/* Un solo editor grafico */}
            <GrafoBayesiano
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


            {/* Administracion de la red */}
            <section className="panel">

                <h2>Red bayesiana</h2>

                <p>{redActual.nombre}</p>

                <p>
                    Nodos: {redActual.nodos.length} / 10
                </p>


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


                            {/* Relaciones existentes */}
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


                            {/* Crear relacion */}
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


                            {/* Renombrar */}
                            <button
                                type="button"
                                className="botonRenombrar"

                                onClick={() =>
                                    renombrarNodo(nodo.id)
                                }
                            >
                                Renombrar
                            </button>


                            {/* Eliminar */}
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


            {/* Resultado actual */}
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


            {/* Historial y comparacion de consultas */}
            <HistorialConsultas
                registros={historial}
                onRecuperar={recuperarConsulta}
                onEliminar={eliminarRegistro}
                onVaciar={vaciarHistorial}
            />

        </main>
    );
}

export default App;
