import React, { useState, useEffect } from "react";
import { Table, Spinner, Button } from "react-bootstrap";
import "bootstrap-icons/font/bootstrap-icons.css";
import { supabase } from "../../database/supabaseconfig";

const TablaProductos = ({ productos, abrirModalEdicion, abrirModalEliminacion }) => {

    const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (productos && productos.length > 0) {
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [productos]);

    return (
        <>
            {loading ? (
  <div className="text-center">
    <h4>Cargando productos...</h4>
    <Spinner animation="border" variant="success" role="status" />
  </div>
) : (
  <Table striped borderless hover responsive size="sm">
    <thead>
      <tr>
            <th>ID</th>
              <th>Nombre</th>
              <th className="d-none d-md-table-cell">Descripción</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Imagen</th>
              <th className="text-center">Acciones</th>
      </tr>
    </thead>

    <tbody>
      {productos.map((producto) => (
        <tr key={producto.id_producto}>
          <td>{producto.id_producto}</td>
          <td>{producto.nombre_producto}</td>
          <td className="d-none d-md-table-cell">{producto.descripcion_producto}</td>
          <td>{producto.categoria_producto}</td>
          <td>${parseFloat(producto.precio_venta).toFixed(2)}</td>
          <td>
            <img src={producto.url_imagen} alt={producto.nombre_producto} width="50" />
          </td>
          <td className="text-center">
            <Button
              variant="outline-warning"
              size="sm"
              className="m-1"
              onClick={() => abrirModalEdicion(producto)}
            >
              <i className="bi bi-pencil"></i>
            </Button>

            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => abrirModalEliminacion(producto)}
            >

                                            <i className="bi bi-trash"></i>
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        }
                        </tbody>
                </Table>
            )}
        </>
    );
};

export default TablaProductos;