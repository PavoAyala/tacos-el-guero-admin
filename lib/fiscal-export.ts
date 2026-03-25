import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { ResumenFiscalMensual } from './fiscal';
import { Gasto } from './gastos';

function formatMXN(n: number) {
    return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function buildTimestamp() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${yyyy}${mm}${dd}-${hh}${min}`;
}

function csvCell(value: string | number | boolean | null | undefined) {
    const text = String(value ?? '');
    return `"${text.replaceAll('"', '""')}"`;
}

function escapeHtml(value: string | number | null | undefined) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function buildCsv(resumen: ResumenFiscalMensual, gastos: Gasto[]) {
    const rows: string[][] = [
        ['Resumen Fiscal Mensual'],
        ['Periodo', resumen.periodo],
        ['Regimen fiscal', resumen.configuracion?.regimen_fiscal ?? 'No configurado'],
        ['RFC', resumen.configuracion?.rfc ?? ''],
        ['Razon social', resumen.configuracion?.razon_social ?? ''],
        ['Tasa IVA', String(resumen.configuracion?.tasa_iva ?? '')],
        ['Porcentaje ISR', String(resumen.configuracion?.porcentaje_isr ?? '')],
        [''],
        ['Concepto', 'Monto'],
        ['Ventas totales', String(resumen.ventas_totales)],
        ['Ventas gravadas', String(resumen.ventas_gravadas)],
        ['Ventas exentas', String(resumen.ventas_exentas)],
        ['Base gravada', String(resumen.base_gravada)],
        ['IVA trasladado', String(resumen.iva_trasladado)],
        ['Gastos totales', String(resumen.gastos_totales)],
        ['Gastos deducibles', String(resumen.gastos_deducibles)],
        ['Gastos no deducibles', String(resumen.gastos_no_deducibles)],
        ['IVA acreditable', String(resumen.iva_acreditable)],
        ['Utilidad bruta', String(resumen.utilidad_bruta)],
        ['Utilidad fiscal', String(resumen.utilidad_fiscal)],
        ['ISR estimado', String(resumen.isr_estimado)],
        ['IVA neto', String(resumen.iva_neto)],
        [''],
        ['Metodo de pago', 'Monto'],
        ['Efectivo', String(resumen.desglose_metodos_pago.efectivo)],
        ['Tarjeta', String(resumen.desglose_metodos_pago.tarjeta)],
        ['Transferencia/SPEI', String(resumen.desglose_metodos_pago.transferencia)],
        ['Otro', String(resumen.desglose_metodos_pago.otro)],
        [''],
        ['Observaciones'],
        ...resumen.warnings.map((warning) => [warning]),
        ...resumen.errores.map((error) => [error]),
        [''],
        ['Gastos del periodo'],
        ['Fecha', 'Concepto', 'Categoria', 'Metodo de pago', 'Deducible', 'Acreditable', 'Subtotal', 'IVA', 'Total', 'CFDI'],
        ...gastos.map((gasto) => [
            gasto.fecha,
            gasto.concepto,
            gasto.categoria,
            gasto.metodo_pago,
            gasto.deducible ? 'Si' : 'No',
            gasto.acreditable ? 'Si' : 'No',
            String(gasto.subtotal),
            String(gasto.iva),
            String(gasto.total),
            gasto.cfdi_folio ?? '',
        ]),
    ];

    return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

function buildHtml(resumen: ResumenFiscalMensual, gastos: Gasto[]) {
    const observations = [...resumen.errores, ...resumen.warnings]
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('');

    const rows = gastos
        .map(
            (gasto) => `
            <tr>
              <td>${escapeHtml(gasto.fecha)}</td>
              <td>${escapeHtml(gasto.concepto)}</td>
              <td>${escapeHtml(gasto.categoria)}</td>
              <td>${escapeHtml(gasto.metodo_pago)}</td>
              <td>${gasto.deducible ? 'Si' : 'No'}</td>
              <td>${gasto.acreditable ? 'Si' : 'No'}</td>
              <td>${formatMXN(gasto.subtotal)}</td>
              <td>${formatMXN(gasto.iva)}</td>
              <td>${formatMXN(gasto.total)}</td>
            </tr>
          `
        )
        .join('');

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
            h1 { margin-bottom: 8px; }
            h2 { margin-top: 28px; margin-bottom: 10px; color: #0f766e; }
            .meta { margin-bottom: 20px; color: #475569; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
            .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; }
            .label { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
            .value { font-size: 20px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 12px; text-align: left; }
            th { background: #f8fafc; }
            ul { padding-left: 18px; }
          </style>
        </head>
        <body>
          <h1>Resumen Fiscal Mensual</h1>
          <div class="meta">
            Periodo: ${escapeHtml(resumen.periodo)}<br />
            Regimen fiscal: ${escapeHtml(resumen.configuracion?.regimen_fiscal ?? 'No configurado')}<br />
            RFC: ${escapeHtml(resumen.configuracion?.rfc ?? '')}<br />
            Razon social: ${escapeHtml(resumen.configuracion?.razon_social ?? '')}
          </div>

          <div class="grid">
            <div class="card"><div class="label">Ventas totales</div><div class="value">${formatMXN(resumen.ventas_totales)}</div></div>
            <div class="card"><div class="label">IVA trasladado</div><div class="value">${formatMXN(resumen.iva_trasladado)}</div></div>
            <div class="card"><div class="label">IVA acreditable</div><div class="value">${formatMXN(resumen.iva_acreditable)}</div></div>
            <div class="card"><div class="label">IVA neto</div><div class="value">${formatMXN(resumen.iva_neto)}</div></div>
            <div class="card"><div class="label">Utilidad fiscal</div><div class="value">${formatMXN(resumen.utilidad_fiscal)}</div></div>
            <div class="card"><div class="label">ISR estimado</div><div class="value">${formatMXN(resumen.isr_estimado)}</div></div>
          </div>

          <h2>Desglose</h2>
          <table>
            <tr><th>Concepto</th><th>Monto</th></tr>
            <tr><td>Ventas gravadas</td><td>${formatMXN(resumen.ventas_gravadas)}</td></tr>
            <tr><td>Ventas exentas</td><td>${formatMXN(resumen.ventas_exentas)}</td></tr>
            <tr><td>Base gravada</td><td>${formatMXN(resumen.base_gravada)}</td></tr>
            <tr><td>Gastos deducibles</td><td>${formatMXN(resumen.gastos_deducibles)}</td></tr>
            <tr><td>Gastos no deducibles</td><td>${formatMXN(resumen.gastos_no_deducibles)}</td></tr>
            <tr><td>Utilidad bruta</td><td>${formatMXN(resumen.utilidad_bruta)}</td></tr>
          </table>

          <h2>Metodos de pago</h2>
          <table>
            <tr><th>Metodo</th><th>Monto</th></tr>
            <tr><td>Efectivo</td><td>${formatMXN(resumen.desglose_metodos_pago.efectivo)}</td></tr>
            <tr><td>Tarjeta</td><td>${formatMXN(resumen.desglose_metodos_pago.tarjeta)}</td></tr>
            <tr><td>Transferencia/SPEI</td><td>${formatMXN(resumen.desglose_metodos_pago.transferencia)}</td></tr>
            <tr><td>Otro</td><td>${formatMXN(resumen.desglose_metodos_pago.otro)}</td></tr>
          </table>

          <h2>Observaciones</h2>
          ${observations ? `<ul>${observations}</ul>` : '<p>Sin observaciones.</p>'}

          <h2>Gastos del periodo</h2>
          <table>
            <tr>
              <th>Fecha</th>
              <th>Concepto</th>
              <th>Categoria</th>
              <th>Metodo</th>
              <th>Deducible</th>
              <th>Acreditable</th>
              <th>Subtotal</th>
              <th>IVA</th>
              <th>Total</th>
            </tr>
            ${rows || '<tr><td colspan="9">Sin gastos registrados.</td></tr>'}
          </table>
        </body>
      </html>
    `;
}

export async function exportarResumenFiscalCSV(params: {
    resumen: ResumenFiscalMensual;
    gastos: Gasto[];
}) {
    const { resumen, gastos } = params;
    const csv = buildCsv(resumen, gastos);
    const fileName = `resumen-fiscal-${resumen.periodo}-${buildTimestamp()}.csv`;

    if (Platform.OS === 'web') {
        descargarEnWeb(csv, fileName, 'text/csv;charset=utf-8;');
        return;
    }

    const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
    if (!directory) {
        throw new Error('No hay un directorio disponible para generar el CSV.');
    }

    const fileUri = `${directory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await compartirArchivo(fileUri, 'text/csv', 'public.comma-separated-values-text');
}

export async function exportarResumenFiscalPDF(params: {
    resumen: ResumenFiscalMensual;
    gastos: Gasto[];
}) {
    const { resumen, gastos } = params;
    const html = buildHtml(resumen, gastos);

    if (Platform.OS === 'web') {
        await Print.printAsync({ html });
        return;
    }

    const result = await Print.printToFileAsync({ html });
    await compartirArchivo(result.uri, 'application/pdf', '.pdf');
}

async function compartirArchivo(uri: string, mimeType: string, uti: string) {
    const disponible = await Sharing.isAvailableAsync();
    if (!disponible) {
        throw new Error('La función de compartir no está disponible en este dispositivo.');
    }

    await Sharing.shareAsync(uri, {
        mimeType,
        UTI: uti,
        dialogTitle: 'Exportar resumen fiscal',
    });
}

function descargarEnWeb(content: string, fileName: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}
