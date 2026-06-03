import { supabase } from "../database/supabaseconfig";
import * as XLSX from 'xlsx';

/**
 * Consulta las ventas crudas desde Supabase dentro de un rango de fechas.
 * @async
 * @function fetchVentasPorRango
 * @param {string} inicioRango - Fecha de inicio en formato 'YYYY-MM-DD 00:00:00'.
 * @param {string} finRango - Fecha de fin en formato 'YYYY-MM-DD 23:59:59'.
 * @returns {Promise<Array<Object>>} Lista de ventas encontradas.
 */
export const fetchVentasPorRango = async (inicioRango, finRango) => {
  const { data: ventas, error } = await supabase
    .from("ventas")
    .select("id_venta, total, fecha_venta, metodo_pago")
    .gte("fecha_venta", inicioRango)
    .lte("fecha_venta", finRango);

  if (error) throw error;
  return ventas || [];
};

/**
 * Consulta los detalles de las ventas junto con sus relaciones de productos y categorías.
 * @async
 * @function fetchDetallesDeVentas
 * @param {Array<number>} idsVentas - Arreglo con los IDs de las ventas a consultar.
 * @returns {Promise<Array<Object>>} Lista de detalles de ventas con datos de productos.
 */
export const fetchDetallesDeVentas = async (idsVentas) => {
  if (!idsVentas || idsVentas.length === 0) return [];

  const { data: detalles, error } = await supabase
    .from("detalles_ventas")
    .select(`
      cantidad, 
      subtotal,
      productos (
        nombre_producto,
        categorias (nombre_categoria)
      )
    `)
    .in("id_venta", idsVentas);

  if (error) throw error;
  return detalles || [];
};

/**
 * Procesa los datos crudos de ventas y detalles para generar las métricas del dashboard.
 * @function procesarEstadisticas
 * @param {Array<Object>} ventas - Datos crudos de la tabla ventas.
 * @param {Array<Object>} detalles - Datos crudos de la tabla detalles_ventas.
 * @returns {Object} Objeto estructurado con todas las métricas preparadas para el estado y gráficas.
 */
export const procesarEstadisticas = (ventas, detalles) => {
  let productosVendidos = 0;
  let montoProductos = 0;
  let ventasPorCategoria = [];

  // 1. Procesar detalles de productos y categorías
  detalles.forEach(d => {
    productosVendidos += d.cantidad || 0;
    montoProductos += d.subtotal || 0;

    const categoria = d.productos?.categorias?.nombre_categoria || "Sin categoría";
    const existente = ventasPorCategoria.find(c => c.name === categoria);
    
    if (existente) {
      existente.value += d.subtotal || 0;
    } else {
      ventasPorCategoria.push({ name: categoria, value: d.subtotal || 0 });
    }
  });

  ventasPorCategoria.sort((a, b) => b.value - a.value);

  // 2. Procesar totales generales y métodos de pago
  const totalVentas = ventas.reduce((sum, v) => sum + (v.total || 0), 0) || 0;
  const ventasEfectivo = ventas.filter(v => v.metodo_pago === "efectivo")
    .reduce((sum, v) => sum + (v.total || 0), 0) || 0;
  const ventasTarjeta = ventas.filter(v => v.metodo_pago === "tarjeta")
    .reduce((sum, v) => sum + (v.total || 0), 0) || 0;

  // 3. Procesar distribución horaria (Curva acumulada de 8:00 a 22:00)
  const horaMap = Array(24).fill(0);
  ventas.forEach(venta => {
    if (!venta.fecha_venta) return;
    const hora = new Date(venta.fecha_venta).getHours();
    if (hora >= 0 && hora < 24) horaMap[hora] += venta.total || 0;
  });

  const ventasPorHora = [];
  let acumulado = 0;
  for (let h = 8; h <= 22; h++) {
    acumulado += horaMap[h];
    ventasPorHora.push({
      hora: `${h.toString().padStart(2, "0")}:00`,
      total: Math.round(acumulado)
    });
  }

  return {
    totalVentas,
    ventasEfectivo,
    ventasTarjeta,
    productosVendidos,
    montoProductos,
    cantidadVentas: ventas.length,
    ventasPorHora,
    ventasPorCategoria
  };
};

/**
 * Consulta las ventas y detalles de un rango de fechas y genera un archivo Excel (.xlsx)
 * con múltiples hojas utilizando la distribución oficial de SheetJS.
 * * @async
 * @function generarReporteExcel
 * @param {string} fechaDesde - Fecha de inicio del filtro (YYYY-MM-DD).
 * @param {string} fechaHasta - Fecha de fin del filtro (YYYY-MM-DD).
 * @returns {Promise<void>} Descarga de forma directa el archivo en el navegador.
 */
export const generarReporteExcel = async (fechaDesde, fechaHasta) => {
  const inicioRango = `${fechaDesde} 00:00:00`;
  const finRango = `${fechaHasta} 23:59:59`;

  // 1. Obtener Ventas utilizando la lógica existente o extendida
  const { data: ventas, error: errorVentas } = await supabase
    .from("ventas")
    .select(`
      id_venta,
      fecha_venta,
      total,
      metodo_pago,
      id_empleado,
      id_cliente
    `)
    .gte("fecha_venta", inicioRango)
    .lte("fecha_venta", finRango)
    .order("fecha_venta", { ascending: false });

  if (errorVentas) throw errorVentas;

  // 2. Obtener Detalles si existen ventas
  const idsVentas = ventas?.map(v => v.id_venta) || [];
  let detallesVenta = [];

  if (idsVentas.length > 0) {
    const { data: detalles, error: errorDetalles } = await supabase
      .from("detalles_ventas")
      .select(`
        id_detalle,
        id_venta,
        cantidad,
        precio_unitario,
        subtotal,
        id_producto,
        productos (
          nombre_producto,
          categorias (nombre_categoria)
        )
      `)
      .in("id_venta", idsVentas)
      .order("id_venta");

    if (errorDetalles) {
      console.error("Error en detalles:", errorDetalles);
    } else {
      detallesVenta = detalles || [];
    }
  }

  // 3. Construcción del Libro de Trabajo con SheetJS (XLSX)
  const wb = XLSX.utils.book_new();

  // Configuración de la Hoja de Ventas
  if (ventas && ventas.length > 0) {
    const wsVentas = XLSX.utils.json_to_sheet(ventas);
    XLSX.utils.book_append_sheet(wb, wsVentas, "Ventas");
  } else {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Mensaje: "No hay ventas en este rango" }]), "Ventas");
  }

  // Configuración de la Hoja de Detalles
  if (detallesVenta && detallesVenta.length > 0) {
    const wsDetalles = XLSX.utils.json_to_sheet(detallesVenta);
    XLSX.utils.book_append_sheet(wb, wsDetalles, "Detalles_Ventas");
  } else {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Mensaje: "No hay detalles de ventas" }]), "Detalles_Ventas");
  }

  // 4. Escritura y descarga del archivo
  XLSX.writeFile(wb, `Reporte_Ventas_${fechaDesde}_a_${fechaHasta}.xlsx`);
};