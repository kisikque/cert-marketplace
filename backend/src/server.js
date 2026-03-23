import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { tagsRouter } from "./tags/routes.js";

import { sessionMiddleware } from "./auth/session.js";
import { authRouter } from "./auth/routes.js";
import { servicesRouter } from "./services/routes.js";
import { providersRouter } from "./providers/routes.js";
import { ordersRouter } from "./orders/routes.js";
import { documentsRouter } from "./documents/routes.js";
import { providerRouter } from "./provider/routes.js";
import { adminRouter } from "./admin/routes.js";
import { providerVerificationRouter } from "./providerVerification/routes.js";
import { customerRouter } from "./customer/routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = Number(process.env.PORT || 3001);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true
  })
);

app.use(express.json());
app.use(sessionMiddleware());
app.use("/provider-logos", express.static(path.resolve("provider-logos")));
app.use("/service-images", express.static(path.resolve("service-images")));
app.use("/product-documents", express.static(path.resolve("product-documents")));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/services", servicesRouter);
app.use("/api/providers", providersRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/tags", tagsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/provider", providerRouter);
app.use("/api/provider-verification-docs", providerVerificationRouter);
app.use("/api/customer", customerRouter);
app.use("/api/admin", adminRouter);

const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"), (err) => {
    if (err) res.status(404).send("Not Found");
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (err?.message === "INVALID_LOGO_FILE_TYPE") {
    return res.status(400).json({ error: "INVALID_LOGO_FILE_TYPE" });
  }
  if (err?.message === "INVALID_SERVICE_IMAGE_FILE_TYPE") {
    return res.status(400).json({ error: "INVALID_SERVICE_IMAGE_FILE_TYPE" });
  }
  res.status(500).json({ error: "INTERNAL_ERROR" });
});

app.listen(PORT, () => {
  console.log(`Backend running: http://localhost:${PORT}`);
});
