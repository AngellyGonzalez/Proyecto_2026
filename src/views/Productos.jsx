import { Container, Row, Col, Button, Alert, Spinner } from "react-bootstrap";
import { supabase } from "../database/supabaseconfig";
import React, { useEffect, useState } from "react";
import ModalRegistroProducto from "../components/productos/ModalRegistroProducto";
import TablaProductos from "../components/productos/TablaProductos";
import ModalEdicionProducto from "../components/productos/ModalEdicionProducto";
import ModalEliminacionProducto from "../components/productos/ModalEliminacionProducto";
import Paginacion from "../components/ordenamiento/Paginacion";
import NotificacionOperacion from "../components/NotificacionOperacion";
import CuadroBusquedas from "../components/busquedas/CuadroBusquedas";
import TarjetaProducto from "../components/productos/TarjetasProductos";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ModalEnvioCorreoProductos from "../components/productos/ModalEnvioCorreoProductos";
import emailjs from '@emailjs/browser';
import ModalQRProducto from "../components/productos/ModalQRProducto";


const generarPDFProducto = (producto) => {

  const doc = new jsPDF();

  // Título
  doc.setFontSize(18);
  doc.text("Reporte de Producto", 14, 20);

  // Línea decorativa
  doc.line(14, 25, 195, 25);

  // Información del producto
  doc.setFontSize(12);

  autoTable(doc, {
    startY: 35,
    head: [["Campo", "Valor"]],
    body: [
      ["ID", producto.id_producto],
      ["Nombre", producto.nombre_producto],
      ["Descripción", producto.descripcion_producto],
      ["Precio", producto.precio_venta],
    ],
  });

  // Descargar PDF
  doc.save(`producto_${producto.id_producto}.pdf`);
};

const Productos = () => {

  const [mostrarModalCorreo, setMostrarModalCorreo] = useState(false);
  const [emailDestino, setEmailDestino] = useState("");
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);

  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalEliminacion, setMostrarModalEliminacion] = useState(false);
  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false);

  const [nuevoProducto, setNuevoProducto] = useState({
    nombre_producto: "",
    descripcion_producto: "",
    categoria_producto: "",
    precio_venta: "",
    archivo: null,
  });

  const [productoEditar, setProductoEditar] = useState({
    id_producto: "",
    nombre_producto: "",
    descripcion_producto: "",
    categoria_producto: "",
    precio_venta: "",
    url_imagen: "",
    archivo: null,
  });

  const [productoAEliminar, setProductoAEliminar] = useState(null);
  const [toast, setToast] = useState({ mostrar: false, mensaje: "", tipo: "" });
  const [mostrarModalQR, setMostrarModalQR] = useState(false);
  const [productoQR, setProductoQR] = useState(null);
  const [registrosPorPagina, establecerRegistrosPorPagina] = useState(5);
  const [paginaActual, establecerPaginaActual] = useState(1);

  const manejoCambioInput = (e) => {
    const { name, value } = e.target;
    setNuevoProducto((prev) => ({ ...prev, [name]: value }));
  };

  const manejoCambioArchivo = (e) => {
    const archivo = e.target.files[0];
    if (archivo && archivo.type.startsWith("image/")) {
      setNuevoProducto((prev) => ({ ...prev, archivo }));
    } else {
      alert("Selecciona una imagen válida (JPG, PNG, etc.)");
    }
  };

  const manejarBusqueda = (e) => {
    setTextoBusqueda(e.target.value);
  };

  const obtenerNombreCategoria = (idCategoria) => {
    return categorias.find((categoria) => categoria.id_categoria === idCategoria)
      ?.nombre_categoria || "";
  };

  const generarQRImagen = (producto) => {
    if (!producto?.url_imagen) {
      setToast({
        mostrar: true,
        mensaje: "Este producto no tiene imagen asociada",
        tipo: "advertencia",
      });
      return;
    }

    setProductoQR(producto);
    setMostrarModalQR(true);
  };

  const copiarProducto = async (producto) => {
    if (!producto) return;

    const texto = `ID: ${producto.id_producto}\nNombre: ${producto.nombre_producto}\nCategoría: ${obtenerNombreCategoria(producto.categoria_producto)}\nPrecio: $${Number(producto.precio_venta).toFixed(2)}`;

    try {
      await navigator.clipboard.writeText(texto);

      setToast({
        mostrar: true,
        mensaje: `Producto "${producto.nombre_producto}" copiado al portapapeles`,
        tipo: "exito",
      });
    } catch (err) {
      console.error("Error al copiar:", err);

      setToast({
        mostrar: true,
        mensaje: "No se pudo copiar al portapapeles",
        tipo: "error",
      });
    }
  };

  useEffect(() => {
    if (!textoBusqueda.trim()) {
      setProductosFiltrados(productos);
    } else {
      const textoLower = textoBusqueda.toLowerCase().trim();
      const filtrados = productos.filter((prod) => {
        const nombre = prod.nombre_producto?.toLowerCase() || "";
        const descripcion = prod.descripcion_producto?.toLowerCase() || "";
        const precio = prod.precio_venta?.toString() || "";

        return (
          nombre.includes(textoLower) ||
          descripcion.includes(textoLower) ||
          precio.includes(textoLower)
        );
      });
      setProductosFiltrados(filtrados);
    }
  }, [textoBusqueda, productos]);

  useEffect(() => {
    const totalPaginas = Math.max(1, Math.ceil((productosFiltrados.length || 0) / registrosPorPagina));
    if (paginaActual > totalPaginas) {
      establecerPaginaActual(1);
    }
  }, [productosFiltrados, registrosPorPagina, paginaActual]);

  useEffect(() => {
    cargarCategorias();
    cargarProductos();
  }, []);

  const cargarCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .order("id_categoria", { ascending: true });
      if (error) throw error;
      setCategorias(data || []);
    } catch (err) {
      console.error("Error al cargar categorias:", err);
    }
  };
  const cargarProductos = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .order("id_producto", { ascending: true });
      if (error) throw error;
      setProductos(data || []);
      setProductosFiltrados(data || []);
    } catch (err) {
      console.error("Error al cargar productos:", err);
    } finally {
      setCargando(false);
    }
  };

  const agregarProducto = async () => {
    try {
      if (
        !nuevoProducto.nombre_producto.trim() ||
        !nuevoProducto.categoria_producto ||
        !nuevoProducto.precio_venta ||
        !nuevoProducto.archivo
      ) {
        setToast({
          mostrar: true,
          mensaje:
            "Completa los campos obligatorios (nombre, categoría, precio e imagen)",
          tipo: "advertencia",
        });
        return;
      }

      setMostrarModal(false);

      const nombreArchivo = `${Date.now()}_${nuevoProducto.archivo.name}`;

      const { error: uploadError } = await supabase.storage
        .from("imagenes_productos")
        .upload(nombreArchivo, nuevoProducto.archivo, {

        });

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from("imagenes_productos")
        .getPublicUrl(nombreArchivo);
      const urlPublica = urlData.publicUrl;

      const { error } = await supabase.from("productos").insert([
        {
          nombre_producto: nuevoProducto.nombre_producto,
          descripcion_producto: nuevoProducto.descripcion_producto || null,
          categoria_producto: nuevoProducto.categoria_producto,
          precio_venta: parseFloat(nuevoProducto.precio_venta),
          url_imagen: urlPublica,
        },
      ]);

      if (error) throw error;

      // Recargar la lista de productos
      await cargarProductos();

      setNuevoProducto({
        nombre_producto: "",
        descripcion_producto: "",
        categoria_producto: "",
        precio_venta: "",
        archivo: null,
      });

      setToast({ mostrar: true, mensaje: "Producto registrado correctamente", tipo: "exito" });

    } catch (err) {
      console.error("Error al agregar producto:", err);
      setToast({ mostrar: true, mensaje: "Error al registrar producto", tipo: "error" });
    }
  };

  const abrirModalEdicion = (producto) => {
    setProductoEditar({
      id_producto: producto.id_producto,
      nombre_producto: producto.nombre_producto ?? producto.nombre ?? "",
      descripcion_producto:
        producto.descripcion_producto ?? producto.descripcion ?? "",
      categoria_producto: producto.categoria_producto ?? producto.categoria ?? "",
      precio_venta: producto.precio_venta ?? producto.precio ?? "",
      url_imagen: producto.url_imagen ?? producto.imagen ?? "",
      archivo: null,
    });
    setMostrarModalEdicion(true);
  };

  const abrirModalEliminacion = (producto) => {
    setProductoAEliminar(producto);
    setMostrarModalEliminacion(true);
  };

  const manejoCambioInputEdicion = (e) => {
    const { name, value } = e.target;
    setProductoEditar((prev) => ({ ...prev, [name]: value }));
  };

  const manejoCambioArchivoEdicion = (e) => {
    const archivo = e.target.files[0];
    if (archivo && archivo.type.startsWith("image/")) {
      setProductoEditar((prev) => ({ ...prev, archivo }));
    } else {
      alert("Selecciona una imagen válida (JPG, PNG, etc.)");
    }
  };

  const actualizarProducto = async () => {
    try {

      if (
        !productoEditar.nombre_producto.trim() ||
        !productoEditar.categoria_producto ||
        !productoEditar.precio_venta
      ) {
        setToast({
          mostrar: true,
          mensaje: "Completa los campos obligatorios",
          tipo: "advertencia",
        });
        return;
      }

      setMostrarModalEdicion(false);

      let datosActualizados = {
        nombre_producto: productoEditar.nombre_producto,
        descripcion_producto: productoEditar.descripcion_producto || null,
        categoria_producto: productoEditar.categoria_producto,
        precio_venta: parseFloat(productoEditar.precio_venta),
        url_imagen: productoEditar.url_imagen,
      };

      if (productoEditar.archivo) {
        const nombreArchivo = `${Date.now()}_${productoEditar.archivo.name}`;

        const { error: uploadError } = await supabase.storage
          .from("imagenes_productos")
          .upload(nombreArchivo, productoEditar.archivo);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("imagenes_productos")
          .getPublicUrl(nombreArchivo);

        datosActualizados.url_imagen = urlData.publicUrl;

        if (productoEditar.url_imagen) {
          const nombreAnterior = productoEditar.url_imagen.split("/").pop().split("?")[0];
          await supabase.storage
            .from("imagenes_productos")
            .remove([nombreAnterior])
            .catch(() => { });
        }
      }

      const { error } = await supabase
        .from("productos")
        .update(datosActualizados)
        .eq("id_producto", productoEditar.id_producto);

      if (error) throw error;

      await cargarProductos();

      setProductoEditar({
        id_producto: "",
        nombre_producto: "",
        descripcion_producto: "",
        categoria_producto: "",
        precio_venta: "",
        url_imagen: "",
        archivo: null,
      });

      setToast({
        mostrar: true,
        mensaje: "Producto actualizado correctamente",
        tipo: "exito",
      });

    } catch (err) {
      console.error("Error al actualizar:", err);
      setToast({
        mostrar: true,
        mensaje: "Error al actualizar producto",
        tipo: "error",
      });
    }
  };
  const eliminarProducto = async () => {
    if (!productoAEliminar) return;
    try {
      setMostrarModalEliminacion(false);
      const { error } = await supabase
        .from("productos")
        .delete()
        .eq("id_producto", productoAEliminar.id_producto)
        .select();

      if (error) throw error;

      await cargarProductos();
      setToast({ mostrar: true, mensaje: `Producto "${productoAEliminar.nombre_producto}" eliminado`, tipo: "exito" });
    } catch (err) {
      console.error("Error al eliminar producto:", err);
      setToast({ mostrar: true, mensaje: "Error al eliminar producto", tipo: "error" });
    }
  };


  // Inicializar EmailJS
  useEffect(() => {
    emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);
  }, []);
  const abrirModalCorreo = () => {
    setEmailDestino("");
    setMostrarModalCorreo(true);
  };

  const formatearProductosParaCorreo = () => {
    if (productos.length === 0) return "No hay productos registrados.";

    let texto = `LISTADO DE PRODUCTOS\n\n`;
    texto += `Fecha: ${new Date().toLocaleDateString("es-NI")}\n`;
    texto += `Total de productos: ${productos.length}\n\n`;

    productos.forEach((prod, index) => {
      texto += `${index + 1}. Nombre: ${prod.nombre}\n`;

      if (prod.descripcion_producto) {
        texto += `   Descripción: ${prod.descripcion_producto}\n`;
      }

      if (prod.precio) {
        texto += `   Precio: ${prod.precio}\n`;
      }

      if (prod.imagen) {
        texto += `   Imagen: ${prod.imagen}\n`;
      }

      texto += `\n`;
    });

    return texto;
  };

  const enviarCorreoProductos = () => {
    if (!emailDestino.trim()) {
      setToast({
        mostrar: true,
        mensaje: "Por favor ingresa un correo destino.",
        tipo: "advertencia",
      });
      return;
    }

    setEnviandoCorreo(true);

    const mensaje = formatearProductosParaCorreo();

    const templateParams = {
      to_name: "Administrador",
      user_email: emailDestino,
      message: mensaje,
      fecha_envio: new Date().toLocaleDateString("es-NI")
    };

    emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      templateParams
    )
      .then(() => {
        setToast({
          mostrar: true,
          mensaje: "Correo enviado correctamente.",
          tipo: "exito",
        });
        setMostrarModalCorreo(false);
        setEmailDestino("");
      })
      .catch((error) => {
        console.error("Error EmailJS:", error);
        setToast({
          mostrar: true,
          mensaje: "Error al enviar el correo.",
          tipo: "error",
        });
      })
      .finally(() => {
        setEnviandoCorreo(false);
      });
  };




  return (
    <Container className="mt-3">

      <Row className="align-items-center mb-3">
        <Col xs={8} sm={8} md={8} lg={8} className="d-flex align-items-center">
          <h3 className="mb-0">
            <i className="bi-bookmark-plus-fill me-2"></i> Productos
          </h3>
        </Col>
        <Col xs={2} sm={2} md={2} lg={2} className="text-end">
          <Button variant="primary" onClick={abrirModalCorreo} size="md">
            <i className="bi bi-envelope"></i>
            <span className="d-none d-lg-inline ms-2">Enviar por Correo</span>
          </Button>
        </Col>
        <Col xs={2} sm={2} md={2} lg={2} className="text-end">
          <Button
            onClick={() => setMostrarModal(true)}
            size="md"
          >
            <i className="bi-plus-lg"></i>
            <span className="d-none d-lg-inline ms-2">Nuevo Producto</span>
          </Button>
        </Col>
      </Row>


      <hr />

      <Row className="mb-4">
        <Col md={6} lg={5}>
          <CuadroBusquedas
            textoBusqueda={textoBusqueda}
            manejarCambioBusqueda={manejarBusqueda}
            placeholder="Buscar por nombre, descripción o precio..."
          />
        </Col>
      </Row>

      <Row>
        <Col>
          <TablaProductos
            productos={productosFiltrados.slice((paginaActual - 1) * registrosPorPagina, paginaActual * registrosPorPagina)}
            cargando={cargando}
            abrirModalEdicion={abrirModalEdicion}
            abrirModalEliminacion={abrirModalEliminacion}
            generarPDFProducto={generarPDFProducto}
            generarQRImagen={generarQRImagen}
            copiarProducto={copiarProducto}
          />
        </Col>
      </Row>

      {productosFiltrados.length > 0 && (
        <Row className="mt-3">
          <Col>
            <Paginacion
              registrosPorPagina={registrosPorPagina}
              totalRegistros={productosFiltrados.length}
              paginaActual={paginaActual}
              establecerPaginaActual={establecerPaginaActual}
              establecerRegistrosPorPagina={establecerRegistrosPorPagina}
            />
          </Col>
        </Row>
      )}

      {/* Modales */}

      <ModalRegistroProducto
        mostrarModal={mostrarModal}
        setMostrarModal={setMostrarModal}
        nuevoProducto={nuevoProducto}
        manejoCambioInput={manejoCambioInput}
        manejoCambioArchivo={manejoCambioArchivo}
        agregarProducto={agregarProducto}
        categorias={categorias}
      />

      <NotificacionOperacion
        mostrar={toast.mostrar}
        mensaje={toast.mensaje}
        tipo={toast.tipo}
        onCerrar={() => setToast({ ...toast, mostrar: false })}
      />
      <ModalEdicionProducto
        mostrarModalEdicion={mostrarModalEdicion}
        setMostrarModalEdicion={setMostrarModalEdicion}
        productoEditar={productoEditar}
        manejoCambioInputEdicion={manejoCambioInputEdicion}
        manejoCambioArchivoEdicion={manejoCambioArchivoEdicion}
        actualizarProducto={actualizarProducto}
        categorias={categorias}
      />

      <ModalEliminacionProducto
        mostrarModalEliminacion={mostrarModalEliminacion}
        setMostrarModalEliminacion={setMostrarModalEliminacion}
        productoAEliminar={productoAEliminar}
        eliminarProducto={eliminarProducto}
      />
      <ModalEnvioCorreoProductos
        mostrarModalCorreo={mostrarModalCorreo}
        setMostrarModalCorreo={setMostrarModalCorreo}
        emailDestino={emailDestino}
        setEmailDestino={setEmailDestino}
        enviandoCorreo={enviandoCorreo}
        enviarCorreoProductos={enviarCorreoProductos}
        totalProductos={productos.length}
      />

      <ModalQRProducto
        mostrar={mostrarModalQR}
        onHide={() => setMostrarModalQR(false)}
        producto={productoQR}
      />

    </Container>


  );
};

export default Productos;
