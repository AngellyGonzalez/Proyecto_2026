import React from "react";
import { Modal, Button, Form } from "react-bootstrap";

const ModalEnvioCorreoProductos = ({
  mostrarModalCorreo,
  setMostrarModalCorreo,
  emailDestino,
  setEmailDestino,
  enviandoCorreo,
  enviarCorreoProductos,
  totalProductos
}) => {
  return (
    <Modal show={mostrarModalCorreo} onHide={() => setMostrarModalCorreo(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>Enviar Listado de Productos por Correo</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Correo Destino</Form.Label>
          <Form.Control
            type="email"
            placeholder="ejemplo@correo.com"
            value={emailDestino}
            onChange={(e) => setEmailDestino(e.target.value)}
          />
        </Form.Group>
        <small className="text-muted">
          Se enviará el listado completo de <strong>{totalProductos}</strong> productos.
        </small>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setMostrarModalCorreo(false)}>
          Cancelar
        </Button>
        <Button 
          variant="primary" 
          onClick={enviarCorreoProductos}
          disabled={enviandoCorreo}
        >
          {enviandoCorreo ? "Enviando..." : "Enviar Correo"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ModalEnvioCorreoProductos;

