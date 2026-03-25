import {
    DEFAULT_FISCAL_CONFIG,
    FiscalConfig,
    obtenerFiscalConfig,
} from './fiscal-config';
import { Gasto, obtenerGastosDelMes, obtenerRangoMensual } from './gastos';
import { supabase } from './supabase';

type TaxType = 'gravado' | 'exento';

interface ProductoFiscal extends Record<string, unknown> {
    tax_type?: TaxType;
}

interface OrderItemFiscal extends Record<string, unknown> {
    quantity?: number;
    unit_price?: number;
    subtotal?: number;
    products?: ProductoFiscal | null;
}

interface OrderFiscalRow extends Record<string, unknown> {
    id: number;
    total_amount: number;
    created_at: string;
    tax_type?: TaxType;
    order_items?: OrderItemFiscal[];
}

interface PaymentFiscalRow extends Record<string, unknown> {
    payment_method?: string;
    amount?: number;
}

export interface DesgloseMetodosPago {
    efectivo: number;
    tarjeta: number;
    transferencia: number;
    otro: number;
    total: number;
}

export interface FiscalWarnings {
    warnings: string[];
    errores: string[];
}

export interface ResumenFiscalMensual extends FiscalWarnings {
    periodo: string;
    configuracion: FiscalConfig | null;
    ventas_totales: number;
    ventas_gravadas: number;
    ventas_exentas: number;
    base_gravada: number;
    iva_trasladado: number;
    gastos_totales: number;
    gastos_deducibles: number;
    gastos_no_deducibles: number;
    iva_acreditable: number;
    utilidad_bruta: number;
    utilidad_fiscal: number;
    isr_estimado: number;
    iva_neto: number;
    desglose_metodos_pago: DesgloseMetodosPago;
    total_ordenes: number;
    total_gastos: number;
}

export function calcularResumenFiscalMensual(params: {
    periodo: string;
    config: FiscalConfig | null;
    orders: OrderFiscalRow[];
    gastos: Gasto[];
    pagos: PaymentFiscalRow[];
}): ResumenFiscalMensual {
    const { periodo, config, orders, gastos, pagos } = params;
    const fiscalWarnings: FiscalWarnings = {
        warnings: [],
        errores: [],
    };

    if (!config) {
        fiscalWarnings.warnings.push(
            'No existe configuracion fiscal guardada. Se usaran valores por defecto.'
        );
    }

    const tasaIva = config?.tasa_iva ?? DEFAULT_FISCAL_CONFIG.tasa_iva;
    const porcentajeIsr = config?.porcentaje_isr ?? DEFAULT_FISCAL_CONFIG.porcentaje_isr;
    const ventasIncluyenIva =
        config?.ventas_incluyen_iva ?? DEFAULT_FISCAL_CONFIG.ventas_incluyen_iva ?? true;

    if (!config?.regimen_fiscal?.trim()) {
        fiscalWarnings.warnings.push('Falta configurar el regimen fiscal.');
    }

    if (!Number.isFinite(porcentajeIsr) || porcentajeIsr <= 0) {
        fiscalWarnings.warnings.push('El porcentaje de ISR no esta configurado correctamente.');
    }

    if (orders.length === 0 && gastos.length === 0) {
        fiscalWarnings.errores.push(
            'No hay ventas ni gastos registrados para el periodo seleccionado.'
        );
    }

    if (orders.length > 0 && gastos.length === 0) {
        fiscalWarnings.warnings.push(
            'Hay ventas en el periodo, pero no existen gastos registrados.'
        );
    }

    let ventasGravadas = 0;
    let ventasExentas = 0;

    orders.forEach((order) => {
        const clasificacion = clasificarOrden(order);

        if (clasificacion.gravado > 0 || clasificacion.exento > 0) {
            ventasGravadas += clasificacion.gravado;
            ventasExentas += clasificacion.exento;
            return;
        }

        ventasGravadas += toNumber(order.total_amount);
        fiscalWarnings.warnings.push(
            `La orden ${order.id} no tiene detalle fiscal suficiente; se asumio como gravada.`
        );
    });

    const ventasTotales = redondearMoneda(ventasGravadas + ventasExentas);
    const baseGravada = ventasIncluyenIva
        ? redondearMoneda(ventasGravadas / (1 + tasaIva))
        : redondearMoneda(ventasGravadas);
    const ivaTrasladado = ventasIncluyenIva
        ? redondearMoneda(ventasGravadas - baseGravada)
        : redondearMoneda(ventasGravadas * tasaIva);

    const gastosTotales = redondearMoneda(
        gastos.reduce((acc, gasto) => acc + toNumber(gasto.total), 0)
    );
    const gastosDeducibles = redondearMoneda(
        gastos.filter((gasto) => gasto.deducible).reduce((acc, gasto) => acc + toNumber(gasto.total), 0)
    );
    const gastosNoDeducibles = redondearMoneda(gastosTotales - gastosDeducibles);
    const ivaAcreditable = redondearMoneda(
        gastos
            .filter((gasto) => gasto.acreditable)
            .reduce((acc, gasto) => acc + toNumber(gasto.iva), 0)
    );

    const utilidadBruta = redondearMoneda(ventasTotales - gastosTotales);
    const utilidadFiscal = redondearMoneda(ventasTotales - gastosDeducibles);
    const isrEstimado =
        utilidadFiscal > 0 && porcentajeIsr > 0
            ? redondearMoneda(utilidadFiscal * porcentajeIsr)
            : 0;
    const ivaNeto = redondearMoneda(ivaTrasladado - ivaAcreditable);

    return {
        periodo,
        configuracion: config,
        ventas_totales: ventasTotales,
        ventas_gravadas: redondearMoneda(ventasGravadas),
        ventas_exentas: redondearMoneda(ventasExentas),
        base_gravada: baseGravada,
        iva_trasladado: ivaTrasladado,
        gastos_totales: gastosTotales,
        gastos_deducibles: gastosDeducibles,
        gastos_no_deducibles: gastosNoDeducibles,
        iva_acreditable: ivaAcreditable,
        utilidad_bruta: utilidadBruta,
        utilidad_fiscal: utilidadFiscal,
        isr_estimado: isrEstimado,
        iva_neto: ivaNeto,
        desglose_metodos_pago: resumirPagos(pagos),
        total_ordenes: orders.length,
        total_gastos: gastos.length,
        warnings: fiscalWarnings.warnings,
        errores: fiscalWarnings.errores,
    };
}

export async function obtenerResumenFiscalMensual(periodo: string): Promise<ResumenFiscalMensual> {
    const { inicio, fin } = obtenerRangoMensual(periodo);

    const [config, orders, gastos, pagos] = await Promise.all([
        obtenerFiscalConfig(),
        obtenerOrdenesDelMes(inicio, fin),
        obtenerGastosDelMes(periodo),
        obtenerPagosDelMes(inicio, fin),
    ]);

    return calcularResumenFiscalMensual({
        periodo,
        config,
        orders,
        gastos,
        pagos,
    });
}

async function obtenerOrdenesDelMes(inicio: string, fin: string): Promise<OrderFiscalRow[]> {
    const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*, products(*))')
        .eq('status', 'completed')
        .gte('created_at', inicio)
        .lte('created_at', fin)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return ((data ?? []) as unknown[]) as OrderFiscalRow[];
}

async function obtenerPagosDelMes(inicio: string, fin: string): Promise<PaymentFiscalRow[]> {
    const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'completed')
        .gte('created_at', inicio)
        .lte('created_at', fin);

    if (error) throw error;
    return ((data ?? []) as unknown[]) as PaymentFiscalRow[];
}

function clasificarOrden(order: OrderFiscalRow): { gravado: number; exento: number } {
    const orderTaxType = normalizarTaxType(order.tax_type);
    const totalOrden = redondearMoneda(toNumber(order.total_amount));

    if (orderTaxType === 'gravado') {
        return { gravado: totalOrden, exento: 0 };
    }

    if (orderTaxType === 'exento') {
        return { gravado: 0, exento: totalOrden };
    }

    const items = Array.isArray(order.order_items) ? order.order_items : [];
    if (items.length === 0) {
        return { gravado: totalOrden, exento: 0 };
    }

    let gravado = 0;
    let exento = 0;

    items.forEach((item) => {
        const subtotal = obtenerSubtotalItem(item);
        const productoTaxType = normalizarTaxType(item.products?.tax_type);

        if (productoTaxType === 'exento') {
            exento += subtotal;
            return;
        }

        gravado += subtotal;
    });

    const totalItems = redondearMoneda(gravado + exento);
    if (Math.abs(totalItems - totalOrden) > 0.01) {
        const diferencia = redondearMoneda(totalOrden - totalItems);
        gravado = redondearMoneda(gravado + diferencia);
    }

    return {
        gravado: redondearMoneda(gravado),
        exento: redondearMoneda(exento),
    };
}

function obtenerSubtotalItem(item: OrderItemFiscal): number {
    if (Number.isFinite(item.subtotal)) {
        return redondearMoneda(toNumber(item.subtotal));
    }

    const quantity = toNumber(item.quantity);
    const unitPrice = toNumber(item.unit_price);
    return redondearMoneda(quantity * unitPrice);
}

function resumirPagos(pagos: PaymentFiscalRow[]): DesgloseMetodosPago {
    return pagos.reduce<DesgloseMetodosPago>(
        (acc, pago) => {
            const amount = redondearMoneda(toNumber(pago.amount));
            const metodo = (pago.payment_method ?? '').toString().toLowerCase();

            if (metodo === 'efectivo' || metodo === 'cash') {
                acc.efectivo = redondearMoneda(acc.efectivo + amount);
            } else if (
                metodo === 'tarjeta' ||
                metodo === 'card' ||
                metodo === 'credito' ||
                metodo === 'debito'
            ) {
                acc.tarjeta = redondearMoneda(acc.tarjeta + amount);
            } else if (metodo === 'transferencia' || metodo === 'spei') {
                acc.transferencia = redondearMoneda(acc.transferencia + amount);
            } else {
                acc.otro = redondearMoneda(acc.otro + amount);
            }

            acc.total = redondearMoneda(acc.total + amount);
            return acc;
        },
        {
            efectivo: 0,
            tarjeta: 0,
            transferencia: 0,
            otro: 0,
            total: 0,
        }
    );
}

function normalizarTaxType(value: unknown): TaxType | null {
    if (value === 'gravado' || value === 'exento') {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'gravado' || normalized === 'exento') {
            return normalized;
        }
    }

    return null;
}

function toNumber(value: unknown): number {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
}

function redondearMoneda(valor: number): number {
    return Math.round((valor + Number.EPSILON) * 100) / 100;
}
