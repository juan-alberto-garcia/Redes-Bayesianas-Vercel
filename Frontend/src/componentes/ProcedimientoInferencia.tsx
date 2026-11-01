
import type {
    FactorDescrito,
    PasoInferencia
} from '../tipos/red';

import './ProcedimientoInferencia.css';


type Propiedades = {
    pasos: PasoInferencia[];
    orden: string[];
};


// Mostrar las filas de un factor probabilistico
function TablaFactor({
    factor,
    titulo
}: {
    factor: FactorDescrito;
    titulo: string;
}) {

    return (
        <div className="pi-factor">

            <h4>{titulo}</h4>

            <p className="pi-variables">
                Variables: {
                    factor.variables.join(', ') ||
                    'Factor constante'
                }
            </p>

            <div className="pi-tablaContenedor">

                <table className="pi-tabla">

                    <thead>
                        <tr>
                            {factor.variables.map(variable => (
                                <th key={variable}>
                                    {variable}
                                </th>
                            ))}
                            <th>Valor</th>
                        </tr>
                    </thead>

                    <tbody>
                        {factor.filas.map((fila, indice) => (
                            <tr key={indice}>

                                {factor.variables.map(variable => (
                                    <td key={variable}>
                                        {
                                            fila.asignacion[variable] ??
                                            '—'
                                        }
                                    </td>
                                ))}

                                <td>
                                    {fila.valor.toFixed(8)}
                                </td>

                            </tr>
                        ))}
                    </tbody>

                </table>

            </div>

        </div>
    );
}


// Mostrar los pasos reales devueltos por FastAPI
export default function ProcedimientoInferencia({
    pasos,
    orden
}: Propiedades) {

    if (pasos.length === 0) {

        return (
            <p className="pi-aviso">
                Esta consulta no contiene el procedimiento
                guardado. Vuelve a pulsar
                «Calcular probabilidades» para generarlo.
            </p>
        );
    }

    return (

        <div className="pi-contenedor">

            <p>
                <strong>Orden de eliminacion:</strong>{' '}
                {
                    orden.join(' → ') ||
                    'Sin variables ocultas'
                }
            </p>

            {pasos.map((paso, indice) => {

                // Crear factores iniciales
                if (paso.etapa === 'inicializacion') {

                    return (
                        <section
                            className="pi-paso"
                            key={indice}
                        >

                            <h3>
                                Paso {indice + 1}.
                                Crear factores
                            </h3>

                            <p>{paso.descripcion}</p>

                            <p>
                                Se generaron {paso.factores.length}
                                {' '}factores a partir de las tablas CPT.
                            </p>

                            <div className="pi-resumenFactores">

                                {paso.factores.map(
                                    (factor, posicion) => (

                                        <p key={posicion}>

                                            <strong>
                                                f{posicion + 1}
                                            </strong>{' '}

                                            ({
                                                factor.variables.join(', ') ||
                                                'constante'
                                            })

                                            {' — '}

                                            {factor.filas.length} filas

                                        </p>

                                    )
                                )}

                            </div>

                        </section>
                    );
                }


                // Aplicar evidencia
                if (paso.etapa === 'evidencia') {

                    return (
                        <section
                            className="pi-paso"
                            key={indice}
                        >

                            <h3>
                                Paso {indice + 1}.
                                Aplicar evidencia
                            </h3>

                            <p>
                                Evidencia:{' '}
                                {
                                    Object.entries(paso.evidencia)
                                        .map(
                                            ([variable, estado]) =>
                                                `${variable}=${estado}`
                                        )
                                        .join(', ') ||
                                    'Ninguna'
                                }
                            </p>

                            <p>
                                Se conservan las filas de los
                                factores compatibles con los
                                estados observados.
                            </p>

                            {paso.factores.map(
                                (factor, posicion) => (

                                    <TablaFactor
                                        key={posicion}
                                        factor={factor}
                                        titulo={
                                            `Factor restringido ${posicion + 1}`
                                        }
                                    />

                                )
                            )}

                        </section>
                    );
                }


                // Orden de eliminacion
                if (paso.etapa === 'orden') {

                    return (
                        <section
                            className="pi-paso"
                            key={indice}
                        >

                            <h3>
                                Paso {indice + 1}.
                                Elegir variables ocultas
                            </h3>

                            <p>
                                Variables que no son consulta
                                ni evidencia:{' '}

                                <strong>
                                    {
                                        paso.variablesOcultas.join(', ') ||
                                        'Ninguna'
                                    }
                                </strong>
                            </p>

                        </section>
                    );
                }


                // Eliminar cada variable oculta
                if (paso.etapa === 'eliminacion') {

                    return (
                        <section
                            className="pi-paso"
                            key={indice}
                        >

                            {/* Mantener encabezado y primer factor juntos */}
                            <div className="pi-inicioEliminacion">

                                <h3>
                                    Paso {indice + 1}.
                                    Eliminar {paso.variable}
                                </h3>

                                <p>
                                    Se multiplican los factores que
                                    contienen{' '}
                                    <strong>{paso.variable}</strong>
                                    {' '}y despues se suman sus valores
                                    para eliminarla.
                                </p>

                                <p className="pi-formula">
                                    τ = Σ_{paso.variable}
                                    {' '}(producto de factores)
                                </p>

                                {paso.factoresUsados.length > 0 && (

                                    <TablaFactor
                                        factor={paso.factoresUsados[0]}
                                        titulo="Factor utilizado 1"
                                    />

                                )}

                            </div>


                            {/* Los demas factores pueden continuar en otra pagina */}
                            {paso.factoresUsados
                                .slice(1)
                                .map((factor, posicion) => (

                                    <TablaFactor
                                        key={posicion}
                                        factor={factor}
                                        titulo={
                                            `Factor utilizado ${posicion + 2}`
                                        }
                                    />

                                )
                            )}

                            <TablaFactor
                                factor={paso.producto}
                                titulo="Resultado de la multiplicacion"
                            />

                            <TablaFactor
                                factor={paso.resultado}
                                titulo={
                                    `Resultado de sumar sobre ${paso.variable}`
                                }
                            />

                        </section>
                    );
                }


                // Multiplicar los factores restantes
                if (paso.etapa === 'producto_final') {

                    const suma = paso.resultado.filas.reduce(
                        (total, fila) => total + fila.valor,
                        0
                    );

                    return (
                        <section
                            className="pi-paso pi-productoFinal"
                            key={indice}
                        >

                            <h3>
                                Paso {indice + 1}.
                                Multiplicar factores restantes
                            </h3>

                            <p>
                                Después de eliminar las variables
                                ocultas, se multiplican los factores
                                que permanecen.
                            </p>

                            {paso.factoresRestantes.map(
                                (factor, posicion) => (

                                    <TablaFactor
                                        key={posicion}
                                        factor={factor}
                                        titulo={
                                            `Factor restante ${posicion + 1}`
                                        }
                                    />

                                )
                            )}

                            <TablaFactor
                                factor={paso.resultado}
                                titulo="Factor conjunto sin normalizar"
                            />

                            <p>
                                <strong>
                                    Suma de los valores:
                                </strong>{' '}
                                {suma.toFixed(8)}
                            </p>

                        </section>
                    );
                }


                // Normalizar la distribucion
                if (paso.etapa === 'normalizacion') {

                    return (
                        <section
                            className="pi-paso"
                            key={indice}
                        >

                            <h3>
                                Paso {indice + 1}.
                                Normalizar
                            </h3>

                            <p>
                                Probabilidad de la evidencia:{' '}

                                <strong>
                                    {
                                        paso.probabilidadEvidencia
                                            .toFixed(8)
                                    }
                                </strong>
                            </p>

                            <p>
                                Cada valor del factor final se
                                divide entre la probabilidad
                                de la evidencia.
                            </p>

                            {paso.factorAntes && (

                                <TablaFactor
                                    factor={paso.factorAntes}
                                    titulo="Factor conjunto sin normalizar"
                                />

                            )}

                            {paso.constanteNormalizacion !== undefined && (

                                <p>
                                    Constante de normalizacion
                                    (1 / P(E)):{' '}

                                    <strong>
                                        {
                                            paso.constanteNormalizacion
                                                .toFixed(8)
                                        }
                                    </strong>
                                </p>

                            )}

                            <TablaFactor
                                factor={paso.factor}
                                titulo="Factor normalizado"
                            />

                        </section>
                    );
                }

                return null;
            })}

        </div>
    );
}
