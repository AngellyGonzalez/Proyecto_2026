import React, { useState, useEffect } from "react";
import { Table, Spinner, Button } from "react-bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";
import { supabase } from "../../database/supabaseconfig";

const TablaCategorias = () => {
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);

    const [mostrarModalEliminacion, setMostrarModalEliminacion] = useState(false);
    const [categoriaAEliminar, setCategoriaAEliminar] = useState(null);

    const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false);
    const [categoriaEditar, setCategoriaEditar] = useState({
        id_categoria: "",
        nombre_categoria: "",
        descripcion_categoria: "",
    });

    // 🔄 Cargar categorías
    const cargarCategorias = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("categorias")
                .select("*")
                .order("id_categoria", { ascending: true });

            if (error) {
                console.error("Error al cargar categorias:", error.message);
                return;
            }

            setCategorias(data || []);
        } catch (err) {
            console.error("Excepción al cargar categorias:", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarCategorias();
    }, []);

    // ✏️ Abrir modal edición
    const abrirModalEdicion = (categoria) => {
        setCategoriaEditar({
            id_categoria: categoria.id_categoria,
            nombre_categoria: categoria.nombre_categoria,
            descripcion_categoria: categoria.descripcion_categoria,
        });
        setMostrarModalEdicion(true);
    };

    // 🗑️ Abrir modal eliminación
    const abrirModalEliminacion = (categoria) => {
        setCategoriaAEliminar(categoria);
        setMostrarModalEliminacion(true);
    };

    return (
        <>
            {loading ? (
                <div className="text-center">
                    <h4>Cargando categorías...</h4>
                    <Spinner animation="border" variant="success" />
                </div>
            ) : (
                <Table striped borderless hover responsive size="sm">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Nombre</th>
                            <th className="d-none d-md-table-cell">Descripción</th>
                            <th className="text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categorias.length > 0 ? (
                            categorias.map((categoria) => (
                                <tr key={categoria.id_categoria}>
                                    <td>{categoria.id_categoria}</td>
                                    <td>{categoria.nombre_categoria}</td>
                                    <td className="d-none d-md-table-cell">
                                        {categoria.descripcion_categoria}
                                    </td>
                                    <td className="text-center">
                                        <Button
                                            variant="outline-warning"
                                            size="sm"
                                            className="m-1"
                                            onClick={() => abrirModalEdicion(categoria)}
                                        >
                                            <i className="bi bi-pencil"></i>
                                        </Button>
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={() => abrirModalEliminacion(categoria)}
                                        >
                                            <i className="bi bi-trash"></i>
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="text-center">
                                    No hay categorías registradas
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            )}

            {/* Aquí luego puedes agregar tus modales */}
            {/* Modal Edición */}
            {mostrarModalEdicion && (
                <div>
                    {/* Tu modal de edición aquí */}
                    <p>Editando: {categoriaEditar.nombre_categoria}</p>
                </div>
            )}

            {/* Modal Eliminación */}
            {mostrarModalEliminacion && (
                <div>
                    {/* Tu modal de eliminación aquí */}
                    <p>Eliminar: {categoriaAEliminar?.nombre_categoria}</p>
                </div>
            )}
        </>
    );
};

export default TablaCategorias;