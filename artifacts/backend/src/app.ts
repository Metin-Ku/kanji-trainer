import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const frontendOrigin =
  process.env.FRONTEND_ORIGIN?.replace(/\/+$/, "") || "http://localhost:3000";

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const cause =
    err instanceof Error && err.cause instanceof Error
      ? { message: err.cause.message, code: (err.cause as NodeJS.ErrnoException).code }
      : undefined;
  logger.error({ err, cause }, "Unhandled API error");
  res.status(500).json({
    error: "Internal Server Error",
    ...(cause ? { detail: cause.message } : {}),
  });
});

export default app;
