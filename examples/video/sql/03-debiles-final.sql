DROP TABLE IF EXISTS Dominio, Maquina, Usuario CASCADE;

CREATE TABLE Dominio (
  idDominio VARCHAR(40) PRIMARY KEY,
  nombreDominio VARCHAR(40)
);

CREATE TABLE Maquina (
  nombreMaquina VARCHAR(40),
  tipoMaquina VARCHAR(40),
  idDominio_Dominio VARCHAR(40) REFERENCES Dominio ON DELETE CASCADE ON UPDATE CASCADE, 
  PRIMARY KEY (nombreMaquina, idDominio_Dominio)
);

CREATE TABLE Usuario (
  nombreUsuario VARCHAR(40),
  rol VARCHAR(40),
  nombreMaquina_Maquina VARCHAR(40),
  idDominio_Dominio_Maquina VARCHAR(40), 
  PRIMARY KEY (nombreUsuario, nombreMaquina_Maquina, idDominio_Dominio_Maquina), 
  FOREIGN KEY (nombreMaquina_Maquina, idDominio_Dominio_Maquina) REFERENCES Maquina ON DELETE CASCADE ON UPDATE CASCADE
);