
// prueba real 

const suma = require('./suma'); // Importar la funcion

test("La funcion suma debe devolver suma correcta", () => { //Definir el test
    expect(sum(1, 2)).toBe(3); 
});