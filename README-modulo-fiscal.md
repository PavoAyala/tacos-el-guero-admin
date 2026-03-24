# Propuesta de Implementacion: Modulo de Calculo Fiscal Automatico

## Objetivo

Agregar al panel administrativo un modulo fiscal que consolide ventas y gastos del mes para estimar automaticamente:

- IVA trasladado
- IVA acreditable
- Diferencia de IVA por pagar o a favor
- Utilidad bruta y utilidad fiscal
- ISR estimado con porcentaje editable

El resultado debe quedar listo para revision contable y exportacion.

## Contexto Actual del Proyecto

Con base en el codigo actual del repositorio:

- Las ventas existen a traves de `orders` y `payments`.
- El corte de caja ya consolida ingresos por metodo de pago.
- La app ya usa `Supabase` como backend y `Expo Router` para navegacion.
- No existe hoy un modulo formal de gastos.
- No existe hoy un catalogo fiscal para distinguir operaciones gravadas, exentas o configuraciones de regimen.

Por lo tanto, para cumplir el issue completo, la solucion debe incluir no solo calculo, sino tambien captura/configuracion minima de datos fiscales.

## Alcance Funcional Propuesto

### 1. Resumen Fiscal Mensual

Nueva pantalla o modulo con vista mensual que muestre:

- Ventas gravadas
- Ventas exentas
- IVA trasladado
- Gastos deducibles
- Gastos no deducibles
- IVA acreditable
- Utilidad bruta
- Utilidad fiscal estimada
- ISR estimado
- Total de IVA a pagar o saldo a favor

### 2. Configuracion Fiscal

Agregar una seccion de configuracion para definir:

- Regimen fiscal
- Porcentaje de ISR estimado
- Tasa general de IVA
- Si el negocio opera con productos exentos
- Nombre fiscal del contribuyente
- RFC
- Notas contables opcionales

Configuracion inicial sugerida:

- Regimen: Persona Fisica con Actividad Empresarial
- IVA: 16%
- ISR estimado: editable, por ejemplo 1.25%, 2%, 30% segun criterio contable o regimen

### 3. Registro de Gastos

Nuevo flujo para capturar gastos con los datos minimos necesarios:

- Fecha
- Concepto
- Monto subtotal
- IVA
- Total
- Metodo de pago
- Categoria
- Deducible: si/no
- CFDI o referencia opcional

Sin este registro no es posible calcular IVA acreditable ni utilidad fiscal con consistencia.

### 4. Clasificacion Fiscal de Ventas

Las ventas deben distinguir al menos entre:

- Gravadas
- Exentas

Si hoy no existe detalle fiscal por producto, se propone una primera version con dos opciones:

1. Regla global: todas las ventas son gravadas por default.
2. Regla por producto: cuando el catalogo de productos exista o se amplie, cada producto podra marcarse como gravado o exento.

Para la primera entrega, la regla global permite avanzar sin bloquear el modulo.

### 5. Exportacion para Contador

Permitir exportar el resumen mensual en:

- Excel o CSV para trabajo contable
- PDF para revision ejecutiva

La exportacion debe incluir:

- Periodo
- Regimen fiscal
- Ventas
- Gastos
- IVA trasladado
- IVA acreditable
- ISR estimado
- Utilidad fiscal
- Fecha de generacion

## Reglas de Calculo Propuestas

### Ventas

- `ventas_gravadas = suma de ventas sujetas a IVA`
- `ventas_exentas = suma de ventas marcadas como exentas`
- `iva_trasladado = ventas_gravadas * tasa_iva`

Nota:
Si los importes de venta ya incluyen IVA, entonces debe separarse base e impuesto antes de calcular. Esto debe definirse tecnicamente en la implementacion. La recomendacion es almacenar una bandera para saber si el monto capturado incluye IVA.

### Gastos

- `gastos_deducibles = suma de gastos con deducible = true`
- `gastos_no_deducibles = suma de gastos con deducible = false`
- `iva_acreditable = suma del IVA de gastos con comprobacion fiscal valida y acreditables`

### Utilidad

- `utilidad_bruta = ventas_totales - gastos_totales`
- `utilidad_fiscal = ventas_gravadas + ventas_exentas - gastos_deducibles`

### ISR Estimado

- `isr_estimado = utilidad_fiscal * porcentaje_isr`

Si la utilidad fiscal es menor o igual a cero:

- `isr_estimado = 0`

### IVA Neto

- `iva_neto = iva_trasladado - iva_acreditable`

Interpretacion:

- Si `iva_neto > 0`, hay IVA a pagar.
- Si `iva_neto < 0`, hay saldo a favor.

## Validaciones Requeridas

El modulo debe impedir calculos engañosos o incompletos. Validaciones minimas:

- No generar resumen si no hay ventas ni gastos en el periodo.
- Mostrar advertencia si solo hay ventas pero no gastos registrados.
- Mostrar advertencia si el porcentaje de ISR no esta configurado.
- Mostrar advertencia si falta regimen fiscal.
- Validar que montos no sean negativos.
- Validar que subtotal + IVA = total en gastos, cuando aplique.
- Si no existe clasificacion de exento, asumir gravado y mostrar nota visible.

## Actualizacion en Tiempo Real

Cada vez que se registre:

- una venta
- un pago
- un gasto

el resumen fiscal del mes debe recalcularse al volver a la vista o al refrescar. Si se desea una experiencia mas reactiva, puede agregarse suscripcion en tiempo real a tablas de `Supabase`.

## Propuesta Tecnica

### Nuevas tablas sugeridas en Supabase

#### `fiscal_config`

- `id`
- `user_id` o `business_id`
- `regimen_fiscal`
- `tasa_iva`
- `porcentaje_isr`
- `rfc`
- `razon_social`
- `ventas_incluyen_iva`
- `created_at`
- `updated_at`

#### `gastos`

- `id`
- `fecha`
- `concepto`
- `subtotal`
- `iva`
- `total`
- `metodo_pago`
- `categoria`
- `deducible`
- `cfdi_folio`
- `notas`
- `created_by`
- `created_at`
- `updated_at`

#### Campo sugerido para ventas o productos

Si se trabaja a nivel producto:

- `products.tax_type` con valores `gravado` o `exento`

Si se trabaja a nivel orden en una primera fase:

- `orders.tax_type` con valores `gravado` o `exento`

### Nuevos modulos en frontend

- `lib/fiscal.ts`
  - Logica de agregacion y calculo fiscal
- `lib/gastos.ts`
  - CRUD de gastos
- `app/(tabs)/fiscal.tsx`
  - Pantalla principal del resumen fiscal
- `app/fiscal-config.tsx`
  - Configuracion fiscal

### Integracion con UI actual

Agregar acceso al modulo desde:

- Dashboard en acciones rapidas
- Tabs principales, si se considera una seccion permanente

## Flujo de Usuario Propuesto

1. El administrador configura regimen, IVA e ISR.
2. El sistema sigue registrando ventas como hoy.
3. El administrador registra gastos del negocio.
4. El modulo fiscal consolida automaticamente el mes seleccionado.
5. El usuario revisa totales, alertas y notas de consistencia.
6. El usuario exporta PDF o Excel y lo comparte con su contador.

## Entregables por Fase

### Fase 1. Base de datos y calculo

- Tabla de configuracion fiscal
- Tabla de gastos
- Servicio de calculo mensual
- Validaciones base

### Fase 2. Interfaz

- Pantalla de resumen fiscal
- Pantalla de configuracion
- Pantalla o modal de captura de gastos

### Fase 3. Exportacion

- Exportacion CSV o Excel
- Exportacion PDF
- Resumen listo para contador

## Riesgos y Decisiones Pendientes

- Definir si las ventas actuales ya incluyen IVA o no.
- Definir si la clasificacion fiscal sera por producto o por venta.
- Confirmar si el ISR debe ser una estimacion libre o segun reglas mas especificas por regimen.
- Confirmar si se requiere soporte para multiples sucursales o una sola unidad operativa.

## Mapeo a Criterios de Aceptacion

- IVA trasladado sobre ventas gravadas: cubierto con clasificacion fiscal de ventas.
- IVA acreditable sobre gastos: cubierto con modulo de gastos.
- Diferencia de IVA a pagar: cubierto en resumen mensual.
- Utilidad bruta mensual: cubierta en calculo consolidado.
- ISR configurable: cubierto con `fiscal_config`.
- Regimen fiscal configurable: cubierto con `fiscal_config`.
- Reporte descargable PDF o Excel: cubierto en fase de exportacion.
- Exportacion para contador: cubierta con formato de resumen mensual.
- Actualizacion en tiempo real: cubierta via recarga o suscripciones de `Supabase`.
- Productos exentos: cubiertos con `tax_type`.
- Validacion por datos insuficientes: cubierta con reglas de validacion.

## Recomendacion de Implementacion

Implementar primero una version funcional y segura:

- Configuracion fiscal
- Registro de gastos
- Resumen mensual en pantalla
- Exportacion CSV

Despues extender a:

- PDF con formato ejecutivo
- Clasificacion por producto
- Automatizacion en tiempo real con suscripciones
- Ajustes contables mas finos segun regimen

Esta ruta reduce riesgo, entrega valor rapido y deja una base limpia para evolucion contable posterior.
