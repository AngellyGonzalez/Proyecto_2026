import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Spinner } from "react-bootstrap";
import { supabase } from "../database/supabaseconfig";

// Componentes
import ModalRegistroCategoria from "../components/categorias/ModalRegistroCategoria";
import NotificacionOperacion from "../components/NotificacionOperacion";
import TablaCategorias from "../components/categorias/TablaCategorias";
import ModalEdicionCategoria from "../components/categorias/ModalEdicionCategoria";
import ModalEliminacionCategoria from "../components/categorias/ModalEliminacionCategoria";
import TarjetaCategoria from "../components/categorias/TarjetaCategoria";

const Categorias = () => {
  // ✅ ESTADOS
  const [toast, setToast] = useState({ mostrar: false, mensaje: "", tipo: "" });
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false);
  const [mostrarModalEliminacion, setMostrarModalEliminacion] = useState(false);
  const [categoriaAEliminar, setCategoriaAEliminar] = useState(null);
 
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [nuevaCategoria, setNuevaCategoria] = useState({
    nombre_categoria: "",
    descripcion_categoria: "",
  });

  const [categoriaEditar, setCategoriaEditar] = useState({
    id_categoria: null,
    nombre_categoria: "",
    descripcion_categoria: "",
  });

  // ✅ CARGAR DATOS
  useEffect(() => {
    obtenerCategorias();
  }, []);

  const obtenerCategorias = async () => {
    setCargando(true);

    const { data, error } = await supabase
      .from("categorias")
      .select("*")
      .order("id_categoria", { ascending: true }); // 👈 AQUÍ

    if (error) {
      setToast({
        mostrar: true,
        mensaje: "Error al cargar categorías.",
        tipo: "error",
      });
    } else {
      setCategorias(data);
    }

    setCargando(false);
  };

  // ✅ INPUT NUEVA CATEGORIA
  const manejoCambioInput = (e) => {
    const { name, value } = e.target;
    setNuevaCategoria((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ INPUT EDICION
  const manejoCambioInputEdicion = (e) => {
    const { name, value } = e.target;
    setCategoriaEditar((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ AGREGAR
  const agregarCategoria = async () => {
    try {
      if (
        !nuevaCategoria.nombre_categoria.trim() ||
        !nuevaCategoria.descripcion_categoria.trim()
      ) {
        setToast({
          mostrar: true,
          mensaje: "Debe llenar todos los campos.",
          tipo: "advertencia",
        });
        return;
      }

      const { error } = await supabase.from("categorias").insert([
        {
          nombre_categoria: nuevaCategoria.nombre_categoria,
          descripcion_categoria: nuevaCategoria.descripcion_categoria,
        },
      ]);

      if (error) {
        setToast({
          mostrar: true,
          mensaje: "Error al registrar categoría.",
          tipo: "error",
        });
        return;
      }

      setToast({
        mostrar: true,
        mensaje: `Categoría "${nuevaCategoria.nombre_categoria}" registrada.`,
        tipo: "exito",
      });

      setNuevaCategoria({
        nombre_categoria: "",
        descripcion_categoria: "",
      });

      setMostrarModal(false);
      obtenerCategorias();

    } catch (err) {
      setToast({
        mostrar: true,
        mensaje: "Error inesperado.",
        tipo: "error",
      });
    }
  };

  // ✅ ACTUALIZAR
  const actualizarCategoria = async () => {
    try {
      if (
        !categoriaEditar.nombre_categoria.trim() ||
        !categoriaEditar.descripcion_categoria.trim()
      ) {
        setToast({
          mostrar: true,
          mensaje: "Debe llenar todos los campos.",
          tipo: "advertencia",
        });
        return;
      }

      const { error } = await supabase
        .from("categorias")
        .update({
          nombre_categoria: categoriaEditar.nombre_categoria,
          descripcion_categoria: categoriaEditar.descripcion_categoria,
        })
        .eq("id_categoria", categoriaEditar.id_categoria);

      if (error) {
        setToast({
          mostrar: true,
          mensaje: "Error al actualizar categoría.",
          tipo: "error",
        });
        return;
      }

      setToast({
        mostrar: true,
        mensaje: "Categoría actualizada correctamente.",
        tipo: "exito",
      });

      setMostrarModalEdicion(false);
      obtenerCategorias();

    } catch (err) {
      console.error(err);
    }
  };

const eliminarCategoria = async () => {
  if (!categoriaAEliminar) return;

  try {
    const { error } = await supabase
      .from("categorias")
      .delete()
      .eq("id_categoria", categoriaAEliminar.id_categoria);

    if (error) {
      setToast({
        mostrar: true,
        mensaje: `Error al eliminar ${categoriaAEliminar.nombre_categoria}`,
        tipo: "error",
      });
      return;
    }

    setToast({
      mostrar: true,
      mensaje: `Categoría ${categoriaAEliminar.nombre_categoria} eliminada.`,
      tipo: "exito",
    });

    setMostrarModalEliminacion(false);
    obtenerCategorias(); // 👈 no cargarCategorias

  } catch (err) {
    console.error(err);
  }
};

  // ✅ MODALES
  const abrirModalEdicion = (categoria) => {
    setCategoriaEditar(categoria);
    setMostrarModalEdicion(true);
  };

  const abrirModalEliminacion = (categoria) => {
  setCategoriaAEliminar(categoria);
  setMostrarModalEliminacion(true);
};

  // ✅ VISTA
  return (
    <Container className="mt-3">
      <Row className="align-items-center mb-3">
        <Col>
          <h3>
            <i className="bi-bookmark-plus-fill me-2"></i> Categorías
          </h3>
        </Col>

        <Col className="text-end">
          <Button onClick={() => setMostrarModal(true)}>
            + Nueva Categoría
          </Button>
        </Col>
      </Row>

      <hr />

    {/* ✅ TARJETAS (NUEVO) */}
      <Row>
<Col xs={12} className="d-lg-none">
  <TarjetaCategoria
    categorias={categorias}
    abrirModalEdicion={abrirModalEdicion}
    abrirModalEliminacion={abrirModalEliminacion}
  />
</Col>
      </Row>

<div className="d-none d-lg-block">
  {cargando ? (
    <Spinner animation="border" />
  ) : categorias.length > 0 ? (
    <TablaCategorias
      categorias={categorias}
      abrirModalEdicion={abrirModalEdicion}
      abrirModalEliminacion={abrirModalEliminacion}
    />
  ) : (
    <p>No hay categorías.</p>
  )}
</div>

      <ModalRegistroCategoria
        mostrarModal={mostrarModal}
        setMostrarModal={setMostrarModal}
        nuevaCategoria={nuevaCategoria}
        manejoCambioInput={manejoCambioInput}
        agregarCategoria={agregarCategoria}
      />

      <ModalEdicionCategoria
        mostrarModalEdicion={mostrarModalEdicion}
        setMostrarModalEdicion={setMostrarModalEdicion}
        categoriaEditar={categoriaEditar}
        manejoCambioInputEdicion={manejoCambioInputEdicion}
        actualizarCategoria={actualizarCategoria}
      />

      <ModalEliminacionCategoria
        mostrarModalEliminacion={mostrarModalEliminacion}
        setMostrarModalEliminacion={setMostrarModalEliminacion}
        eliminarCategoria={eliminarCategoria}
        categoria={categoriaAEliminar}
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

export default Categorias;