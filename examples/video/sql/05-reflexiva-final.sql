DROP TABLE IF EXISTS Empleado CASCADE;

CREATE TABLE Empleado (
  idEmpleado VARCHAR(40) PRIMARY KEY,
  nombre VARCHAR(40),
  categoria VARCHAR(40),
  idEmpleado_Supervisa_ref VARCHAR(40) REFERENCES Empleado
);