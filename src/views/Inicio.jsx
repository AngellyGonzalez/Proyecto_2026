import React, { useEffect, useState, useRef } from "react";
import { Container, Row, Col, Button, Card, Spinner, Form } from "react-bootstrap";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// Importamos el servicio modular que acabamos de crear
import {
  fetchVentasPorRango,
  fetchDetallesDeVentas,
  procesarEstadisticas,
  generarReporteExcel
} from "../services/analyticsService.js";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";


/**
 * @constant {string[]} COLORES
 * Paleta de colores en formato Hexadecimal para las secciones de las gráficas (PieChart y LineChart).
 */
const COLORES = ["#5e26b2", "#39ff95", "#ff6bc6", "#8b46ff", "#00d4ff", "#ffd93d"];

/**
 * Componente Principal de la Pantalla de Inicio (Dashboard).
 * Muestra el resumen del negocio mediante métricas clave, gráficos interactivos
 * y permite la exportación de reportes a formatos de hoja de cálculo.
 * * @component
 * @returns {JSX.Element} El componente de la pantalla de inicio estructurado.
 */
const Inicio = () => {

  // --- Estados de Control y Filtros ---
  const [cargando, setCargando] = useState(true);
  const [fechaDesde, setFechaDesde] = useState(new Date().toLocaleDateString("en-CA", { timeZone: "America/Managua" }));
  const [fechaHasta, setFechaHasta] = useState(new Date().toLocaleDateString("en-CA", { timeZone: "America/Managua" }));

  const generarPdfVentasHora = async () => {
  try {

    const pdf = new jsPDF("p", "mm", "a4");

    //Título y fecha
    pdf.setFontSize(18);
    pdf.setTextColor("#330775");
    pdf.setFont("helvetica", "bold");
    pdf.text("Reporte de Ventas por Hora", 14, 15);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor("#000000");
    pdf.setFontSize(10);
    pdf.text(`Periodo: ${fechaDesde} - ${fechaHasta}`, 14, 22);

    // Imagen del gráfico
    const canvas = await html2canvas(graficoHoraRef.current);
    const imagen = canvas.toDataURL("image/png");
    pdf.addImage(imagen, "PNG", 10, 30, 190, 80);

    // Resumen general
    pdf.setFontSize(14);
    pdf.setTextColor("#330775");
    pdf.setFont("helvetica", "bold");
    pdf.text("Resumen General", 14, 115);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor("#000000");
    pdf.setFontSize(10);

    pdf.text(`Total Ventas: C$ ${estadisticas.totalVentas.toFixed(2)}`, 14, 125);
    pdf.text(`Ventas Efectivo: C$ ${estadisticas.ventasEfectivo.toFixed(2)}`, 14, 132);
    pdf.text(`Ventas Tarjeta: C$ ${estadisticas.ventasTarjeta.toFixed(2)}`, 14, 139);
    pdf.text(`Productos Vendidos: ${estadisticas.productosVendidos}`, 14, 146);
    pdf.text(`Cantidad Ventas: ${estadisticas.cantidadVentas}`, 14, 153);

    // Tabla de ventas por hora
    const filas = estadisticas.ventasPorHora.map(item => [
      item.hora,
      `C$ ${item.total}`
    ]);

    autoTable(pdf, {
      startY: 160,
      head: [["Hora", "Monto Acumulado"]],
      body: filas
    });

    // Descargar PDF
    const fechaActual = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Managua"
    });

    pdf.save(
      `VentasHora_${fechaDesde}_${fechaHasta}_Generado_${fechaActual}.pdf`
    );

  } catch (error) {
    console.error(error);
    alert("Error generando PDF");
  }
};

const generarPdfEstadisticasGenerales = async () => {
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      let yPosition = 15;

      // Título
      pdf.setFontSize(18);
      pdf.setTextColor("#330775");
      pdf.setFont("helvetica", "bold");
      pdf.text("Reporte General de Estadísticas", 14, yPosition);
      yPosition += 10;

      // Fecha
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor("#000000");
      pdf.setFontSize(10);
      pdf.text(`Periodo: ${fechaDesde} - ${fechaHasta}`, 14, yPosition);
      yPosition += 12;

      // Sección: Resumen General
      pdf.setFontSize(14);
      pdf.setTextColor("#330775");
      pdf.setFont("helvetica", "bold");
      pdf.text("Resumen General", 14, yPosition);
      yPosition += 8;

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor("#000000");
      pdf.setFontSize(10);

      const datosGenerales = [
        [`Total Ventas: C$ ${estadisticas.totalVentas.toFixed(2)}`],
        [`Ventas Efectivo: C$ ${estadisticas.ventasEfectivo.toFixed(2)}`],
        [`Ventas Tarjeta: C$ ${estadisticas.ventasTarjeta.toFixed(2)}`],
        [`Productos Vendidos: ${estadisticas.productosVendidos}`],
        [`Cantidad de Ventas: ${estadisticas.cantidadVentas}`],
      ];

      autoTable(pdf, {
        startY: yPosition,
        head: [["Concepto", "Valor"]],
        body: [
          ["Total Ventas", `C$ ${estadisticas.totalVentas.toFixed(2)}`],
          ["Ventas Efectivo", `C$ ${estadisticas.ventasEfectivo.toFixed(2)}`],
          ["Ventas Tarjeta", `C$ ${estadisticas.ventasTarjeta.toFixed(2)}`],
          ["Productos Vendidos", estadisticas.productosVendidos.toString()],
          ["Cantidad de Ventas", estadisticas.cantidadVentas.toString()],
        ],
      });

      yPosition = pdf.lastAutoTable.finalY + 12;

      // Gráfico de ventas por hora
      if (graficoHoraRef.current) {
        if (yPosition > 200) {
          pdf.addPage();
          yPosition = 15;
        }
        pdf.setFontSize(13);
        pdf.setTextColor("#330775");
        pdf.setFont("helvetica", "bold");
        pdf.text("Gráfico: Ventas por Hora", 14, yPosition);
        yPosition += 8;

        const canvas1 = await html2canvas(graficoHoraRef.current);
        const imagen1 = canvas1.toDataURL("image/png");
        pdf.addImage(imagen1, "PNG", 10, yPosition, 190, 70);
        yPosition += 75;
      }

      // Gráfico de ventas por categoría
      if (graficoCategoriasRef.current) {
        if (yPosition > 200) {
          pdf.addPage();
          yPosition = 15;
        }
        pdf.setFontSize(13);
        pdf.setTextColor("#330775");
        pdf.setFont("helvetica", "bold");
        pdf.text("Gráfico: Ventas por Categoría", 14, yPosition);
        yPosition += 8;

        const canvas2 = await html2canvas(graficoCategoriasRef.current);
        const imagen2 = canvas2.toDataURL("image/png");
        pdf.addImage(imagen2, "PNG", 10, yPosition, 100, 100);
      }

      // Descargar PDF
      const fechaActual = new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Managua",
      });
      pdf.save(
        `ReporteGeneral_${fechaDesde}_${fechaHasta}_Generado_${fechaActual}.pdf`,
      );
    } catch (error) {
      console.error(error);
      alert("Error generando PDF general");
    }
  };





  // --- Estado Centralizado de Métricas y Analítica ---
  const [estadisticas, setEstadisticas] = useState({
    totalVentas: 0,
    ventasEfectivo: 0,
    ventasTarjeta: 0,
    productosVendidos: 0,
    montoProductos: 0,
    cantidadVentas: 0,
    ventasPorHora: [],
    ventasPorCategoria: []
  });

  const graficoHoraRef = useRef(null);

  const graficoCategoriasRef = useRef(null);


  

  /**
   * Controlador para coordinar la carga asíncrona de datos de Supabase y
   * disparar el procesamiento analítico de las métricas del dashboard.
   * * @async
   * @function cargarDatos
   * @param {string} desde - Fecha inicial del filtro (YYYY-MM-DD).
   * @param {string} hasta - Fecha final del filtro (YYYY-MM-DD).
   * @returns {Promise<void>}
   */
  const cargarDatos = async (desde, hasta) => {
    try {
      setCargando(true);

      const inicioRango = `${desde} 00:00:00`;
      const finRango = `${hasta} 23:59:59`;

      // 1. Obtener ventas del rango
      const ventas = await fetchVentasPorRango(inicioRango, finRango);
      const idsVentas = ventas.map(v => v.id_venta);

      // 2. Obtener detalles si existen ventas
      const detalles = idsVentas.length > 0 ? await fetchDetallesDeVentas(idsVentas) : [];

      // 3. Procesar las estadísticas a través del servicio analítico
      const resultadoMetricas = procesarEstadisticas(ventas, detalles);

      // 4. Guardar resultados en el estado local
      setEstadisticas(resultadoMetricas);

    } catch (err) {
      console.error("Error al coordinar la carga de estadísticas:", err);
    } finally {
      setCargando(false);
    }
  };

  // --- Efecto Reactivo para Escuchar Cambios en los Filtros de Fecha ---
  useEffect(() => {
    cargarDatos(fechaDesde, fechaHasta);
  }, [fechaDesde, fechaHasta]);

  /**
   * Manejador de eventos para disparar la descarga del reporte en Excel
   * aislando la lógica de generación en el servicio analítico.
   * * @async
   * @function descargarExcel
   * @returns {Promise<void>}
   */
  const descargarExcel = async () => {
    try {
      setCargando(true);
      await generarReporteExcel(fechaDesde, fechaHasta);
    } catch (err) {
      console.error("Error generando Excel:", err);
      alert("Error al generar el Excel. Revisa la consola.");
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" variant="primary" size="lg" />
        <p className="mt-3">Cargando estadísticas...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-3">
      <div className="mt-2">
        <div className="mb-4">
          <h2>Dashboard</h2>
          <h6>Estadísticas del Negocio</h6>
        </div>

        {/* Controles de Filtros y Acciones */}
        <Row className="mb-4">
          <Col xs={6} md={3}>
            <Form.Group>
              <Form.Label>Desde</Form.Label>
              <Form.Control type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </Form.Group>
          </Col>
          <Col xs={6} md={3}>
            <Form.Group>
              <Form.Label>Hasta</Form.Label>
              <Form.Control type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </Form.Group>
          </Col>
<Col md={6} className="d-flex align-items-end gap-2">
  <Button
    variant="success"
    onClick={descargarExcel}
    className="mt-3 mt-md-0"
  >
    <i className="bi bi-file-earmark-excel me-2"></i>
    Descargar Excel
  </Button>

  <Button
    variant="danger"
    onClick={generarPdfEstadisticasGenerales}
    className="mt-3 mt-md-0"
  >
    <i className="bi bi-file-earmark-pdf me-2"></i>
    Descargar PDF
  </Button>
</Col>
        </Row>

        {/* Tarjetas Informativas de Métricas */}
        <Row className="g-4 mb-5">
          <Col md={6} lg={3}>
            <Card className="h-100 text-white shadow border-0" style={{ background: "linear-gradient(135deg, #28a745, #34ce57)" }}>
              <Card.Body>
                <h5>Ventas Totales</h5>
                <h2>C$ {estadisticas.totalVentas.toFixed(2)}</h2>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={3}>
            <Card className="h-100 text-white shadow border-0" style={{ background: "linear-gradient(135deg, #0166d3, #3399ff)" }}>
              <Card.Body>
                <h5>Efectivo</h5>
                <h2>C$ {estadisticas.ventasEfectivo.toFixed(2)}</h2>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={3}>
            <Card className="h-100 text-white shadow border-0" style={{ background: "linear-gradient(135deg, #5ea5f1, #94c0ec)" }}>
              <Card.Body>
                <h5>Tarjeta</h5>
                <h2>C$ {estadisticas.ventasTarjeta.toFixed(2)}</h2>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6} lg={3}>
            <Card className="h-100 text-white shadow border-0" style={{ background: "linear-gradient(135deg, #e27d01, #ffa500)" }}>
              <Card.Body>
                <h5>Productos Vendidos</h5>
                <h2>{estadisticas.productosVendidos}</h2>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Bloque Gráfico de Recharts */}
        <Row className="g-4">
          {/* Gráfica Lineal de Tendencia */}
          <Col lg={8}>
            <Card className="shadow border-0">
              <Card.Body ref={graficoHoraRef}>
                <h5 className="mb-3">Ventas por Hora</h5>
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={estadisticas.ventasPorHora}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hora" />
                    <YAxis tickFormatter={(v) => `C$${v}`} />
                    <Tooltip formatter={(v) => [`C$ ${v}`, "Monto"]} />
                    <Line type="monotone" dataKey="total" stroke="#5e26b2" strokeWidth={4} dot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card.Body>

<div className="p-3 text-center d-flex justify-content-center gap-2">
  <Button
    variant="outline-danger"
    onClick={generarPdfVentasHora}
  >
    <i className="bi bi-file-earmark-pdf me-2"></i>
    PDF Ventas por Hora
  </Button>

</div>

            </Card>
          </Col>

          {/* Gráfica de Pastel Categorizada */}
          <Col lg={4}>
            <Card className="shadow border-0">
              <Card.Body ref={graficoCategoriasRef}>
                <h5 className="mb-3">Ventas por Categoría</h5>
                <ResponsiveContainer width="100%" height={360}>
                  <PieChart>
                    <Pie
                      data={estadisticas.ventasPorCategoria.length > 0 ? estadisticas.ventasPorCategoria : [{ name: "Sin datos", value: 1 }]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={110}
                      label
                    >
                      {estadisticas.ventasPorCategoria.map((_, i) => (
                        <Cell key={`cell-${i}`} fill={COLORES[i % COLORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`C$ ${v}`, "Monto"]} />
                  </PieChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </Container>
  );
};

export default Inicio;