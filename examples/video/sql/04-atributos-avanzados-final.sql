DROP TABLE IF EXISTS Empleado, Empleado_telefono CASCADE;

CREATE TABLE Empleado (
  idEmpleado VARCHAR(40) PRIMARY KEY,
  nombre VARCHAR(40),
  apellido1 VARCHAR(40),
  apellido2 VARCHAR(40)
);

CREATE TABLE Empleado_telefono (
  idEmpleado VARCHAR(40) REFERENCES Empleado ON DELETE CASCADE ON UPDATE CASCADE,
  telefono VARCHAR(40), 
  PRIMARY KEY (idEmpleado, telefono)
);