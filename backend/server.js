require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { Client: MinioClient } = require("minio");
const { randomUUID } = require("crypto");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json({ limit: "25mb" }));

function sanitizePathPart(value) {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\.\./g, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function buildMinioClient(config) {
  return new MinioClient({
    endPoint: String(config.endpoint || "").trim().replace(/^https?:\/\//, ""),
    port: Number(config.port) || 9000,
    useSSL: Boolean(config.useSsl),
    accessKey: String(config.accessKey || ""),
    secretKey: String(config.secretKey || ""),
    region: String(config.region || "us-east-1"),
  });
}

function buildObjectName({ basePath, path, fileName }) {
  const safeName = String(fileName || "arquivo")
    .trim()
    .replace(/[^\w.\-]/g, "_");
  const parts = [sanitizePathPart(basePath), sanitizePathPart(path), `${Date.now()}-${randomUUID()}-${safeName}`].filter(Boolean);
  return parts.join("/");
}

function collectObjectNames(client, bucket, prefix) {
  return new Promise((resolve, reject) => {
    const names = [];
    const stream = client.listObjectsV2(bucket, prefix || "", true);
    stream.on("data", (obj) => {
      if (obj?.name) names.push(String(obj.name));
    });
    stream.on("error", reject);
    stream.on("end", () => resolve(names));
  });
}

function buildTransporter(config) {
  const secure = config.port === 465;
  return nodemailer.createTransport({
    host: config.host,
    port: config.port || 587,
    secure,
    auth:
      config.username || config.password
        ? { user: config.username, pass: config.password }
        : undefined,
    tls: config.port === 587 && config.useTls !== false ? { rejectUnauthorized: true } : undefined,
  });
}

function getFrom(config) {
  const email = (config.fromEmail || "").trim();
  const name = (config.fromName || "").trim();
  return name ? `${name} <${email}>` : email;
}

app.post("/api/email/test", async (req, res) => {
  try {
    const { config } = req.body || {};
    if (!config || typeof config !== "object") {
      return res.status(400).json({ error: "Corpo inválido.", details: "Envie { config: { host, port, ... } }." });
    }

    const host = String(config.host || "").trim();
    const fromEmail = String(config.fromEmail || "").trim();
    if (!host || !fromEmail) {
      return res.status(400).json({
        error: "Dados insuficientes.",
        details: "host e fromEmail são obrigatórios para o teste.",
      });
    }

    const transporter = buildTransporter({
      host,
      port: Number(config.port) || 587,
      useTls: config.useTls !== false,
      username: String(config.username || ""),
      password: String(config.password || ""),
    });

    const from = getFrom(config);
    await transporter.sendMail({
      from,
      to: fromEmail,
      subject: "Teste de configuração SMTP – Clínica Pro",
      text: "Se você recebeu este e-mail, a conexão e a autenticação do servidor SMTP estão corretas.",
    });

    return res.json({
      success: true,
      message: "E-mail de teste enviado para o remetente. Verifique a caixa de entrada.",
    });
  } catch (err) {
    const message = err.message || String(err);
    console.error("POST /api/email/test error:", err);
    return res.status(200).json({
      success: false,
      error: "Falha ao conectar ou enviar e-mail.",
      details: message,
    });
  }
});

app.post("/api/email/send", async (req, res) => {
  try {
    const { config, toEmail, subject, text, mediaUrl } = req.body || {};
    if (!config || typeof config !== "object") {
      return res.status(400).json({ error: "Corpo inválido.", details: "Envie { config, toEmail }." });
    }

    const to = String(toEmail || "").trim();
    if (!to || !to.includes("@")) {
      return res.status(400).json({ error: "toEmail inválido." });
    }

    const host = String(config.host || "").trim();
    if (!host) {
      return res.status(400).json({ error: "config.host é obrigatório." });
    }

    const transporter = buildTransporter({
      host,
      port: Number(config.port) || 587,
      useTls: config.useTls !== false,
      username: String(config.username || ""),
      password: String(config.password || ""),
    });

    const from = getFrom(config);
    const normalizedSubject = String(subject || "").trim();
    const normalizedText = String(text || "").trim();
    const normalizedMediaUrl = String(mediaUrl || "").trim();

    const resolvedSubject =
      normalizedSubject || "E-mail de teste – Clínica Pro";
    const resolvedText =
      normalizedText ||
      "Este é um e-mail de teste enviado pela tela de Integrações. Se você recebeu, os e-mails estão saindo corretamente.";

    let html = undefined;
    if (normalizedMediaUrl) {
      const escapedText = resolvedText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br/>");
      const escapedUrl = normalizedMediaUrl
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;");
      html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <p>${escapedText}</p>
          <p>
            <a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">Abrir mídia da notificação</a>
          </p>
        </div>
      `;
    }

    const info = await transporter.sendMail({
      from,
      to,
      subject: resolvedSubject,
      text: resolvedText,
      html,
    });

    return res.json({
      success: true,
      message: `E-mail enviado para ${to}.`,
      provider: {
        messageId: info?.messageId ?? null,
        accepted: Array.isArray(info?.accepted) ? info.accepted : [],
        rejected: Array.isArray(info?.rejected) ? info.rejected : [],
        pending: Array.isArray(info?.pending) ? info.pending : [],
        response: info?.response ?? null,
      },
    });
  } catch (err) {
    const message = err.message || String(err);
    console.error("POST /api/email/send error:", err);
    return res.status(200).json({
      success: false,
      error: "Falha ao enviar e-mail.",
      details: message,
    });
  }
});

app.post("/api/storage/minio/test", async (req, res) => {
  try {
    const { config } = req.body || {};
    if (!config || typeof config !== "object") {
      return res.status(400).json({
        success: false,
        error: "Corpo inválido.",
        details: "Envie { config }.",
      });
    }

    const endpoint = String(config.endpoint || "").trim();
    const accessKey = String(config.accessKey || "").trim();
    const secretKey = String(config.secretKey || "").trim();
    const bucket = String(config.bucket || "").trim();

    if (!endpoint || !accessKey || !secretKey || !bucket) {
      return res.status(400).json({
        success: false,
        error: "Dados insuficientes para teste Minio.",
        details: "endpoint, accessKey, secretKey e bucket são obrigatórios.",
      });
    }

    const client = buildMinioClient(config);
    const exists = await client.bucketExists(bucket);
    if (!exists) {
      return res.status(200).json({
        success: false,
        error: "Bucket não encontrado.",
        details: `O bucket "${bucket}" não existe no endpoint informado.`,
      });
    }

    return res.json({
      success: true,
      message: `Conectividade com Minio validada. Bucket "${bucket}" acessível.`,
    });
  } catch (err) {
    const message = err.message || String(err);
    console.error("POST /api/storage/minio/test error:", err);
    return res.status(200).json({
      success: false,
      error: "Falha ao validar conectividade Minio.",
      details: message,
    });
  }
});

app.post("/api/storage/minio/upload", async (req, res) => {
  try {
    const { config, file, path, bucket } = req.body || {};
    if (!config || typeof config !== "object" || !file || typeof file !== "object") {
      return res.status(400).json({
        success: false,
        error: "Corpo inválido.",
        details: "Envie { config, file }.",
      });
    }

    const endpoint = String(config.endpoint || "").trim();
    const accessKey = String(config.accessKey || "").trim();
    const secretKey = String(config.secretKey || "").trim();
    const targetBucket = String(bucket || config.bucket || "").trim();
    const fileName = String(file.name || "").trim();
    const contentBase64 = String(file.contentBase64 || "").trim();

    if (!endpoint || !accessKey || !secretKey || !targetBucket || !fileName || !contentBase64) {
      return res.status(400).json({
        success: false,
        error: "Dados insuficientes para upload Minio.",
        details: "endpoint, accessKey, secretKey, bucket e file (name/contentBase64) são obrigatórios.",
      });
    }

    const binary = Buffer.from(contentBase64, "base64");
    const objectName = buildObjectName({
      basePath: config.basePath,
      path,
      fileName,
    });
    console.info("[Minio][upload] start", {
      bucket: targetBucket,
      objectName,
      fileName,
      bytes: binary.length,
    });

    const client = buildMinioClient(config);
    await client.putObject(
      targetBucket,
      objectName,
      binary,
      binary.length,
      file.type
        ? {
            "Content-Type": String(file.type),
          }
        : undefined
    );

    const protocol = config.useSsl ? "https" : "http";
    const endpointHost = String(config.endpoint || "").trim().replace(/^https?:\/\//, "");
    const portPart = config.port ? `:${Number(config.port)}` : "";
    const encodedObjectName = objectName
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
    const publicUrl = `${protocol}://${endpointHost}${portPart}/${encodeURIComponent(targetBucket)}/${encodedObjectName}`;

    console.info("[Minio][upload] success", {
      bucket: targetBucket,
      objectName,
    });

    return res.json({
      success: true,
      key: objectName,
      url: publicUrl,
      provider: "minio",
    });
  } catch (err) {
    const message = err.message || String(err);
    console.error("POST /api/storage/minio/upload error:", err);
    return res.status(200).json({
      success: false,
      error: "Falha no upload Minio.",
      details: message,
    });
  }
});

app.post("/api/storage/minio/remove", async (req, res) => {
  try {
    const { config, key, bucket } = req.body || {};
    if (!config || typeof config !== "object") {
      return res.status(400).json({
        success: false,
        error: "Corpo inválido.",
        details: "Envie { config, key }.",
      });
    }

    const targetKey = String(key || "").trim();
    const targetBucket = String(bucket || config.bucket || "").trim();
    if (!targetKey || !targetBucket) {
      return res.status(400).json({
        success: false,
        error: "Dados insuficientes para remoção.",
        details: "key e bucket são obrigatórios.",
      });
    }

    console.info("[Minio][remove] start", {
      bucket: targetBucket,
      key: targetKey,
    });
    const client = buildMinioClient(config);
    await client.removeObject(targetBucket, targetKey);
    console.info("[Minio][remove] success", {
      bucket: targetBucket,
      key: targetKey,
    });

    return res.json({
      success: true,
      message: `Objeto removido: ${targetKey}`,
      key: targetKey,
    });
  } catch (err) {
    const message = err.message || String(err);
    console.error("POST /api/storage/minio/remove error:", err);
    return res.status(200).json({
      success: false,
      error: "Falha ao remover objeto no Minio.",
      details: message,
    });
  }
});

app.post("/api/storage/minio/cleanup-orphans", async (req, res) => {
  try {
    const { config, referencedKeys, bucket, prefix, dryRun } = req.body || {};
    if (!config || typeof config !== "object") {
      return res.status(400).json({
        success: false,
        error: "Corpo inválido.",
        details: "Envie { config, referencedKeys }.",
      });
    }

    const targetBucket = String(bucket || config.bucket || "").trim();
    if (!targetBucket) {
      return res.status(400).json({
        success: false,
        error: "Bucket obrigatório.",
      });
    }

    const refs = Array.isArray(referencedKeys)
      ? referencedKeys
          .map((k) => String(k || "").trim())
          .filter(Boolean)
      : [];
    const referencedSet = new Set(refs);
    const listPrefix = [sanitizePathPart(config.basePath), sanitizePathPart(prefix)].filter(Boolean).join("/");
    const runDry = dryRun !== false;

    const client = buildMinioClient(config);
    const allKeys = await collectObjectNames(client, targetBucket, listPrefix);
    const orphanKeys = allKeys.filter((name) => !referencedSet.has(name));
    console.info("[Minio][cleanup] scanned", {
      bucket: targetBucket,
      prefix: listPrefix || null,
      scannedCount: allKeys.length,
      referencedCount: referencedSet.size,
      orphanCount: orphanKeys.length,
      dryRun: runDry,
    });

    if (!runDry) {
      for (const key of orphanKeys) {
        await client.removeObject(targetBucket, key);
      }
      console.info("[Minio][cleanup] removed", {
        bucket: targetBucket,
        removedCount: orphanKeys.length,
      });
    }

    return res.json({
      success: true,
      dryRun: runDry,
      bucket: targetBucket,
      prefix: listPrefix || null,
      scannedCount: allKeys.length,
      referencedCount: referencedSet.size,
      orphanCount: orphanKeys.length,
      removedCount: runDry ? 0 : orphanKeys.length,
      orphanKeys: orphanKeys.slice(0, 200),
    });
  } catch (err) {
    const message = err.message || String(err);
    console.error("POST /api/storage/minio/cleanup-orphans error:", err);
    return res.status(200).json({
      success: false,
      error: "Falha ao limpar arquivos órfãos no Minio.",
      details: message,
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "clinica-pro-integrations-backend" });
});

app.listen(PORT, () => {
  console.log(`Backend de e-mail rodando em http://localhost:${PORT}`);
});
