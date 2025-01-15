// src/App.js
import { useState, useEffect, useRef } from "react";
import { Application, Assets, Container, Sprite } from "pixi.js";
import io from "socket.io-client";
import "./App.css";

const socket = io("https://api.upskillmafia.com/", {
  path: "/socket.io/",
  transports: ["websocket"],
});

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [players, setPlayers] = useState([]);

  const gameRef = useRef(null);
  const appRef = useRef(null);
  const playerSpritesRef = useRef({});

  useEffect(() => {
    socket.on("players", (updatedPlayers) => {
      setPlayers(updatedPlayers);
      updateSprites(updatedPlayers);
    });

    socket.on("playerMoved", ({ id, position }) => {
      if (playerSpritesRef.current[id]) {
        const sprite = playerSpritesRef.current[id];

        sprite._position.x += position.x;
        sprite._position.y += position.y;
      }
    });

    socket.on("playerLeft", (id) => {
      if (playerSpritesRef.current[id]) {
        playerSpritesRef.current[id].destroy();
        delete playerSpritesRef.current[id];
        setPlayers((prevPlayers) =>
          prevPlayers.filter((player) => player.socket !== id)
        );
      }
    });

    return () => {
      socket.off("players");
      socket.off("playerMoved");
      socket.off("playerLeft");
    };
  }, []);

  const handleKeyDown = (e) => {
    let direction;
    switch (e.key) {
      case "ArrowUp":
      case "w":
        direction = { x: 0, y: -5 };
        break;
      case "ArrowDown":
      case "s":
        direction = { x: 0, y: 5 };
        break;
      case "ArrowLeft":
      case "a":
        direction = { x: -5, y: 0 };
        break;
      case "ArrowRight":
      case "d":
        direction = { x: 5, y: 0 };
        break;
      default:
        return;
    }

    if (direction) {
      socket.emit("move", direction);
    }
  };

  const initGame = async () => {
    if (!appRef.current) {
      const app = new Application();
      await app.init({
        background: "#1099bb",
        width: window.innerWidth * 0.78,
        height: window.innerHeight * 0.99,
      });

      gameRef.current.appendChild(app.canvas);
      appRef.current = app;
      app.canvas.style.touchAction = "auto";

      // Handle movement
      window.addEventListener("keydown", handleKeyDown);
    }
  };

  const updateSprites = (players) => {
    players.forEach(async (player) => {
      if (!playerSpritesRef.current[player.socket]) {
        const container = new Container();
        appRef.current.stage.addChild(container);
        const texture = await Assets.load(
          "https://pixijs.com/assets/bunny.png"
        );
        // console.log(player)
        const bunny = new Sprite(texture);
        container.x = player.position.x;
        container.y = player.position.y;
        container.addChild(bunny);
        playerSpritesRef.current[player.socket] = container;
      }
    });
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (username && room) {
      setIsJoined(true);
      await initGame();
      socket.emit("join", { username, room });
    }
  };

  return (
    <div className="App">
      {!isJoined ? (
        <form onSubmit={handleJoin} className="join-form">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="text"
            placeholder="Room"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button type="submit">Join Game</button>
        </form>
      ) : (
        <div className="game-container">
          <div className="dashboard">
            <h2>Players</h2>
            <ul>
              {players.map((player) => (
                <li key={player._id}>{player.username}</li>
              ))}
            </ul>
          </div>
          <div ref={gameRef} className="game-canvas" />
        </div>
      )}
    </div>
  );
}

export default App;
