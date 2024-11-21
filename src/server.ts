import "express-async-errors";
import express from "express";
import cors from "cors";
import compression from "compression";
import { routes } from "./routes";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

app.use(compression());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(routes);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
