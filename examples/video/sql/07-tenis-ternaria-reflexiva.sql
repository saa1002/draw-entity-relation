DROP TABLE IF EXISTS Jugador, Partido, Disputa CASCADE;

CREATE TABLE Jugador (
  idJugador VARCHAR(40) PRIMARY KEY,
  nombre VARCHAR(40),
  ranking VARCHAR(40)
);

CREATE TABLE Partido (
  idPartido VARCHAR(40) PRIMARY KEY,
  fecha VARCHAR(40),
  ronda VARCHAR(40)
);

CREATE TABLE Disputa (
  idJugador_Disputa_jugador1 VARCHAR(40) REFERENCES Jugador,
  idJugador_Disputa_jugador2 VARCHAR(40) REFERENCES Jugador,
  idPartido_Disputa_3 VARCHAR(40) REFERENCES Partido,
  resultado VARCHAR(40), 
  PRIMARY KEY (idJugador_Disputa_jugador1, idJugador_Disputa_jugador2, idPartido_Disputa_3)
);