import React, { useEffect, useState } from "react";
import { Container, Row, Col, Button, Alert, Spinner } from "react-bootstrap";
import { supabase } from "../database/supabaseconfig";
import ModalRegistroProducto from "../components/productos/ModalRegistroProducto";
import NotificacionOperacion from "../components/NotificacionOperacion";
import CuadroBusquedas from "../components/busquedas/CuadroBusquedas";
import TablaProductos from "../components/productos/TablaProductos";

const Productos = () => {
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
  cargarCategorias();
  cargarProductos(); 
}, []);


const cargarProductos = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .order("id_producto", { ascending: true });
      if (error) {
        console.error("Error al cargar productos:", error.message);
        setToast({
          mostrar: true,
          mensaje: "Error al cargar productos.",
          tipo: "error",
        });
        return;
      }
      setProductos(data || []);
    } catch (err) {
      console.error("Excepción al cargar productos:", err.message);
      setToast({
        mostrar: true,
        mensaje: "Error inesperado al cargar productos.",
        tipo: "error",
      });
    } finally {
      setCargando(false);
    }
  };


const cargarCategorias = async () => {
  try {
    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .order("id_categoria", { ascending: true });

    if (error) throw error;
    setCategorias(data || []);
  } catch (err) {
    console.error("Error al cargar categorías:", err);
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
        mensaje: "Completa los campos obligatorios (nombre, categoría, precio e imagen)",
        tipo: "advertencia",
      });
      return;
    }

    setMostrarModal(false);

    const nombreArchivo = `${Date.now()}_${nuevoProducto.archivo.name}`;

    const { error: uploadError } = await supabase.storage
      .from("imagenes_productos")
      .upload(nombreArchivo, nuevoProducto.archivo);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
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


  return (
    <Container className="mt-3">
  <Row className="align-items-center mb-3">
    <Col className="d-flex align-items-center">
      <h3 className="mb-0">
        <i className="bi-bag-heart-fill me-2"></i> Productos
      </h3>
    </Col>

    <Col xs={3} sm={5} md={5} lg={5} className="text-end">
      <Button onClick={() => setMostrarModal(true)} size="md">
        <i className="bi-plus-lg"></i>
        <span className="d-none d-sm-inline ms-2">Nuevo Producto</span>
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
      productos={productosFiltrados}
      abrirModalEdicion={(producto) => {
        setProductoEditar(producto);
        setMostrarModalEdicion(true);
      }}
      abrirModalEliminacion={(producto) => {
        setProductoAEliminar(producto);
        setMostrarModalEliminacion(true);
      }}
    />
  </Col>
</Row>


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
</Container>

  );
};

export default Productos;