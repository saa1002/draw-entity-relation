DROP TABLE IF EXISTS Persona, Empleado, Estudiante, Profesor CASCADE;

CREATE TABLE Persona (
  idPersona VARCHAR(40) PRIMARY KEY,
  nombre VARCHAR(40),
  fechaNacimiento VARCHAR(40)
);

CREATE TABLE Empleado (
  idPersona VARCHAR(40) PRIMARY KEY REFERENCES Persona,
  salario VARCHAR(40)
);

CREATE TABLE Estudiante (
  idPersona VARCHAR(40) PRIMARY KEY REFERENCES Persona,
  expediente VARCHAR(40)
);

CREATE TABLE Profesor (
  idPersona VARCHAR(40) PRIMARY KEY REFERENCES Empleado,
  departamento VARCHAR(40)
);