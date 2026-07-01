DROP TABLE IF EXISTS Oficinas, Empleados, TarjetasAcceso, Proyectos, Participa CASCADE;

CREATE TABLE Oficinas (
  idOficina VARCHAR(40) PRIMARY KEY,
  ciudad VARCHAR(40)
);

CREATE TABLE Empleados (
  idEmpleado VARCHAR(40) PRIMARY KEY,
  nombre VARCHAR(40),
  email VARCHAR(40),
  idOficina_Trabaja_en VARCHAR(40) NOT NULL REFERENCES Oficinas
);

CREATE TABLE TarjetasAcceso (
  idTarjeta VARCHAR(40) PRIMARY KEY,
  fechaActivacion VARCHAR(40),
  idEmpleado_Tiene_tarjeta VARCHAR(40) UNIQUE NOT NULL REFERENCES Empleados
);

CREATE TABLE Proyectos (
  idProyecto VARCHAR(40) PRIMARY KEY,
  nombreProyecto VARCHAR(40)
);

CREATE TABLE Participa (
  idEmpleado_Participa_1 VARCHAR(40) REFERENCES Empleados,
  idProyecto_Participa_2 VARCHAR(40) REFERENCES Proyectos,
  horas VARCHAR(40), 
  PRIMARY KEY (idEmpleado_Participa_1, idProyecto_Participa_2)
);