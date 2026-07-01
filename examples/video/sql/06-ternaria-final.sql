DROP TABLE IF EXISTS Proveedor, Pieza, Proyecto, Suministra CASCADE;

CREATE TABLE Proveedor (
  idProveedor VARCHAR(40) PRIMARY KEY,
  nombre VARCHAR(40)
);

CREATE TABLE Pieza (
  idPieza VARCHAR(40) PRIMARY KEY,
  descripcion VARCHAR(40)
);

CREATE TABLE Proyecto (
  idProyecto VARCHAR(40) PRIMARY KEY,
  nombreProyecto VARCHAR(40)
);

CREATE TABLE Suministra (
  idProveedor_Suministra_1 VARCHAR(40) REFERENCES Proveedor,
  idPieza_Suministra_2 VARCHAR(40) REFERENCES Pieza,
  idProyecto_Suministra_3 VARCHAR(40) REFERENCES Proyecto,
  cantidad VARCHAR(40), 
  PRIMARY KEY (idProveedor_Suministra_1, idPieza_Suministra_2, idProyecto_Suministra_3)
);