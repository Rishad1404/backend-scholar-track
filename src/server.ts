import { Server } from "http";
import app from "./app";
import { seedSuperAdmin } from "./app/utils/seed";
import { envVars } from "./config/env";

let server: Server;

const bootstrap = async () => {
  try {
    await seedSuperAdmin();
    server = app.listen(envVars.PORT, () => {
      console.log(`Server is running on http://localhost:${envVars.PORT}`);
    });
  } catch (error) {
    console.error("Error starting the server:", error);
  }
};

//  SIGTERM signal handler
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received... Server is shutting down");
  if (server) {
    server.close(() => {
      console.log("Server closed successfully");
      process.exit(0);
    });
  }
  process.exit(0);
});

// SIGINT signal handler
process.on("SIGINT", () => {
  console.log("SIGINT signal received... Server is shutting down");
  if (server) {
    server.close(() => {
      console.log("Server closed successfully");
      process.exit(0);
    });
  }
  process.exit(0);
});

// uncaught exception handler
process.on("uncaughtException", (error) => {
  console.log("Uncaught Exception Detected... Server is shutting down", error);

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
  process.exit(1);
});

// unhandled rejection handler
process.on("unhandledRejection", (error) => {
  console.log("Unhandled Rejection Detected... Server is shutting down", error);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  }
  process.exit(1);
});

bootstrap();
