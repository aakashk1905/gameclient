// src/App.js
import { useState, useEffect, useRef } from "react";
import { Application, Assets, Container, Sprite } from "pixi.js";
import io from "socket.io-client";
import "./App.css";

// const socket = io("https://api.upskillmafia.com/", {
//   path: "/socket.io/",
//   transports: ["websocket"],
// });

const socket = io("http://localhost:4005/", {
  // path: "/socket.io/",
  transports: ["websocket"],
});

function App() {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [players, setPlayers] = useState({});
  const [positions, setPositions] = useState({});

  const gameRef = useRef(null);
  const appRef = useRef(null);
  const playerSpritesRef = useRef({});

  useEffect(() => {
    socket.on("joinedPlayers", (data) => {
      console.log(data.players, data.positions);
      setPlayers(data.players);
      setPositions(data.positions);
      // updateSprites();
    });

    socket.on("playerMoved", ({ id, position }) => {
      if (playerSpritesRef.current[id]) {
        const sprite = playerSpritesRef.current[id];
        sprite.position.set(position.x, position.y);
      }
    });

    socket.on("playerTeleported", ({ id, position }) => {
      if (playerSpritesRef.current[id]) {
        const sprite = playerSpritesRef.current[id];
        sprite.position.set(position.x, position.y);
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

  useEffect(() => {
    updateSprites();
  }, [players, positions]);

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
      socket.emit("move", {
        uid: username,
        dx: direction.x,
        dy: direction.y,
        room: "",
      });
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
      app.canvas.addEventListener("dblclick", (event) => {
        const rect = app.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        console.log("Double Click Detected at:", x, y);

        // Emit teleport event
        socket.emit("teleport", {
          uid: username,
          x,
          y,
          room: "",
        });
      });
    }
  };

  const updateSprites = () => {
    Object.entries(players).forEach(([, player]) => {
      const playerPosition = positions[player.socket_id];

      if (!playerPosition) return;

      if (!playerSpritesRef.current[player.socket_id]) {
        const container = new Container();
        appRef.current.stage.addChild(container);

        Assets.load("https://pixijs.com/assets/bunny.png").then((texture) => {
          const bunny = new Sprite(texture);
          bunny.anchor.set(0.5);
          container.addChild(bunny);

          container.x = playerPosition.x;
          container.y = playerPosition.y;

          playerSpritesRef.current[player.socket_id] = container;
        });
      } else {
        const spriteContainer = playerSpritesRef.current[player.socket_id];
        spriteContainer.x = playerPosition.x;
        spriteContainer.y = playerPosition.y;
      }
    });
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (username && room) {
      setIsJoined(true);
      await initGame();
      socket.emit("join", {
        username,
        uid: username,
        role: "admin",
        avatar: 1,
        profilePic: `https://ui-avatars.com/api/?name=${username}&background=random`,
      });
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
              {Object.entries(players).map(([uid, player]) => (
                <li key={uid}>{player.username}</li>
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
