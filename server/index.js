import "dotenv/config";
import { createApp } from "./app.js";
const app = createApp();
const port = Number(process.env.PORT) || 8787;
const server = app.listen(port, () => {
  console.log(`Trip Planner API listening on http://localhost:${port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. A process is already running on this port.`);
  } else {
    console.error("Server error:", error);
  }
  process.exit(1);
});
