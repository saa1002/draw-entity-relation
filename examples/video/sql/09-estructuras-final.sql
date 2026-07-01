DROP TABLE IF EXISTS EntidadNM_A, EntidadNM_B, RelacionNM, Entidad1N_A, Entidad1N_B, Entidad11_B, Entidad11_A, TernariaA, TernariaB, TernariaC, RelacionTernaria, EntidadFuerte, EntidadDebil, General, EspecializacionA, EspecializacionB CASCADE;

CREATE TABLE EntidadNM_A (
  id VARCHAR(40) PRIMARY KEY,
  Atributo_1 VARCHAR(40)
);

CREATE TABLE EntidadNM_B (
  id VARCHAR(40) PRIMARY KEY,
  Atributo_1 VARCHAR(40)
);

CREATE TABLE RelacionNM (
  id_RelacionNM_1 VARCHAR(40) REFERENCES EntidadNM_A,
  id_RelacionNM_2 VARCHAR(40) REFERENCES EntidadNM_B,
  Atributo VARCHAR(40), 
  PRIMARY KEY (id_RelacionNM_1, id_RelacionNM_2)
);

CREATE TABLE Entidad1N_A (
  id VARCHAR(40) PRIMARY KEY,
  Atributo_1 VARCHAR(40)
);

CREATE TABLE Entidad1N_B (
  id VARCHAR(40) PRIMARY KEY,
  Atributo_1 VARCHAR(40),
  id_Relacion1N VARCHAR(40) NOT NULL REFERENCES Entidad1N_A
);

CREATE TABLE Entidad11_B (
  id VARCHAR(40) PRIMARY KEY,
  Atributo_1 VARCHAR(40)
);

CREATE TABLE Entidad11_A (
  id VARCHAR(40) PRIMARY KEY,
  Atributo_1 VARCHAR(40),
  id_Relacion11 VARCHAR(40) UNIQUE REFERENCES Entidad11_B
);

CREATE TABLE TernariaA (
  id VARCHAR(40) PRIMARY KEY
);

CREATE TABLE TernariaB (
  id VARCHAR(40) PRIMARY KEY
);

CREATE TABLE TernariaC (
  id VARCHAR(40) PRIMARY KEY
);

CREATE TABLE RelacionTernaria (
  id_RelacionTernaria_1 VARCHAR(40) REFERENCES TernariaA,
  id_RelacionTernaria_2 VARCHAR(40) REFERENCES TernariaB,
  id_RelacionTernaria_3 VARCHAR(40) REFERENCES TernariaC,
  Atributo VARCHAR(40), 
  PRIMARY KEY (id_RelacionTernaria_1, id_RelacionTernaria_2, id_RelacionTernaria_3)
);

CREATE TABLE EntidadFuerte (
  id VARCHAR(40) PRIMARY KEY,
  Atributo_1 VARCHAR(40)
);

CREATE TABLE EntidadDebil (
  discriminante VARCHAR(40),
  Atributo_1 VARCHAR(40),
  id_EntidadFuerte VARCHAR(40) REFERENCES EntidadFuerte ON DELETE CASCADE ON UPDATE CASCADE, 
  PRIMARY KEY (discriminante, id_EntidadFuerte)
);

CREATE TABLE General (
  id VARCHAR(40) PRIMARY KEY,
  Atributo_1 VARCHAR(40)
);

CREATE TABLE EspecializacionA (
  id VARCHAR(40) PRIMARY KEY REFERENCES General,
  Atributo VARCHAR(40)
);

CREATE TABLE EspecializacionB (
  id VARCHAR(40) PRIMARY KEY REFERENCES General,
  Atributo VARCHAR(40)
);