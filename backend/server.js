require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { Client: MinioClient } = require("minio");
const { randomUUID, createHash } = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3021;

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

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function validateApiToken(req) {
  const token = req.headers["x-api-key"] || (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;
  const hash = await sha256(token);
  const { data, error } = await supabase
    .from("api_tokens")
    .select("id")
    .eq("token_hash", hash)
    .eq("is_active", true)
    .maybeSingle();
  return !error && !!data;
}

function apiAuthMiddleware(req, res, next) {
  validateApiToken(req)
    .then((valid) => {
      if (valid) return next();
      res.status(401).json({ error: "Token de API inválido ou expirado" });
    })
    .catch((err) => {
      console.error("[apiAuth] error:", err);
      res.status(500).json({ error: "Erro ao validar token" });
    });
}

// ---- API Pacientes (consumidores externos) ----
app.get("/api/patients", apiAuthMiddleware, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(500).json({ error: "Supabase não configurado" });

    const id = req.query.id;
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const search = (req.query.search || "").trim();
    const offset = (page - 1) * limit;

    if (id) {
      const { data, error } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
      if (error) {
        console.error("[patients] fetch error:", error);
        return res.status(500).json({ error: "Erro ao buscar paciente" });
      }
      if (!data) return res.status(404).json({ error: "Paciente não encontrado" });
      return res.json(data);
    }

    let query = supabase
      .from("patients")
      .select("id, name, cpf, email, phone, birth_date, status, created_at, updated_at", { count: "exact" });

    if (search) {
      const term = search.replace(/[%_]/g, "\\$&");
      query = query.or(`name.ilike.%${term}%,cpf.ilike.%${term}%,email.ilike.%${term}%`);
    }

    const { data, error, count } = await query
      .order("name", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[patients] list error:", error);
      return res.status(500).json({ error: "Erro ao listar pacientes" });
    }

    return res.json({
      data: data || [],
      meta: { page, limit, total: count || 0, total_pages: Math.ceil((count || 0) / limit) },
    });
  } catch (err) {
    console.error("[patients] error:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

app.post("/api/patients", apiAuthMiddleware, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(500).json({ error: "Supabase não configurado" });

    const body = req.body || {};
    const name = body.name;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Campo 'name' é obrigatório" });
    }

    const insert = {
      name: name.trim(),
      cpf: body.cpf ?? null,
      rg: body.rg ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      birth_date: body.birth_date ?? null,
      gender: body.gender ?? null,
      marital_status: body.marital_status ?? null,
      profession: body.profession ?? null,
      notes: body.notes ?? null,
      status: body.status ?? "active",
      address_cep: body.address_cep ?? null,
      address_city: body.address_city ?? null,
      address_neighborhood: body.address_neighborhood ?? null,
      address_street: body.address_street ?? null,
      address_number: body.address_number ?? null,
      address_complement: body.address_complement ?? null,
      address_state: body.address_state ?? null,
      plan_id: body.plan_id ?? null,
    };

    const { data, error } = await supabase.from("patients").insert(insert).select().single();

    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "CPF ou e-mail já cadastrado" });
      console.error("[patients] create error:", error);
      return res.status(500).json({ error: "Erro ao criar paciente", details: error.message });
    }
    return res.status(201).json(data);
  } catch (err) {
    console.error("[patients] error:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

app.put("/api/patients", apiAuthMiddleware, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(500).json({ error: "Supabase não configurado" });

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Parâmetro 'id' é obrigatório para atualização" });

    const body = req.body || {};
    const allowed = [
      "name", "cpf", "rg", "email", "phone", "birth_date", "gender", "marital_status",
      "profession", "notes", "status", "address_cep", "address_city", "address_neighborhood",
      "address_street", "address_number", "address_complement", "address_state", "plan_id",
    ];
    const update = {};
    for (const k of allowed) {
      if (body[k] !== undefined) update[k] = body[k];
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar" });
    }

    const { data, error } = await supabase.from("patients").update(update).eq("id", id).select().maybeSingle();

    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "CPF ou e-mail já cadastrado" });
      console.error("[patients] update error:", error);
      return res.status(500).json({ error: "Erro ao atualizar paciente", details: error.message });
    }
    if (!data) return res.status(404).json({ error: "Paciente não encontrado" });
    return res.json(data);
  } catch (err) {
    console.error("[patients] error:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

app.delete("/api/patients", apiAuthMiddleware, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(500).json({ error: "Supabase não configurado" });

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Parâmetro 'id' é obrigatório para exclusão" });

    const { data: deleted, error } = await supabase.from("patients").delete().eq("id", id).select("id");

    if (error) {
      console.error("[patients] delete error:", error);
      return res.status(500).json({ error: "Erro ao excluir paciente", details: error.message });
    }
    if (!deleted || deleted.length === 0) return res.status(404).json({ error: "Paciente não encontrado" });
    return res.json({ message: "Paciente excluído com sucesso" });
  } catch (err) {
    console.error("[patients] error:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// ---- API Receitas (consumidores externos) ----
app.get("/api/revenue", apiAuthMiddleware, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(500).json({ error: "Supabase não configurado" });

    const id = req.query.id;
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const search = (req.query.search || "").trim();
    const offset = (page - 1) * limit;

    if (id) {
      const { data, error } = await supabase.from("revenue").select("*").eq("id", id).maybeSingle();
      if (error) {
        console.error("[revenue] fetch error:", error);
        return res.status(500).json({ error: "Erro ao buscar receita" });
      }
      if (!data) return res.status(404).json({ error: "Receita não encontrada" });
      return res.json(data);
    }

    let query = supabase
      .from("revenue")
      .select("id, amount, description, revenue_date, status, patient_id, patient_name, category_id, created_at, updated_at", { count: "exact" });

    if (search) {
      const term = search.replace(/[%_]/g, "\\$&");
      query = query.or(`description.ilike.%${term}%,patient_name.ilike.%${term}%`);
    }

    const { data, error, count } = await query
      .order("revenue_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[revenue] list error:", error);
      return res.status(500).json({ error: "Erro ao listar receitas" });
    }

    return res.json({
      data: data || [],
      meta: { page, limit, total: count || 0, total_pages: Math.ceil((count || 0) / limit) },
    });
  } catch (err) {
    console.error("[revenue] error:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

app.post("/api/revenue", apiAuthMiddleware, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(500).json({ error: "Supabase não configurado" });

    const body = req.body || {};
    const amount = body.amount;
    if (amount === undefined || typeof amount !== "number" || amount < 0) {
      return res.status(400).json({ error: "Campo 'amount' é obrigatório e deve ser um número >= 0" });
    }

    const insert = {
      amount,
      description: body.description ?? "",
      revenue_date: body.revenue_date ?? new Date().toISOString().slice(0, 10),
      status: body.status ?? "pending",
      patient_id: body.patient_id ?? null,
      patient_name: body.patient_name ?? null,
      category_id: body.category_id ?? null,
    };

    const { data, error } = await supabase.from("revenue").insert(insert).select().single();

    if (error) {
      console.error("[revenue] create error:", error);
      return res.status(500).json({ error: "Erro ao criar receita", details: error.message });
    }
    return res.status(201).json(data);
  } catch (err) {
    console.error("[revenue] error:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

app.put("/api/revenue", apiAuthMiddleware, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(500).json({ error: "Supabase não configurado" });

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Parâmetro 'id' é obrigatório para atualização" });

    const body = req.body || {};
    const allowed = ["amount", "description", "revenue_date", "status", "patient_id", "patient_name", "category_id"];
    const update = {};
    for (const k of allowed) {
      if (body[k] !== undefined) update[k] = body[k];
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar" });
    }

    const { data, error } = await supabase.from("revenue").update(update).eq("id", id).select().maybeSingle();

    if (error) {
      console.error("[revenue] update error:", error);
      return res.status(500).json({ error: "Erro ao atualizar receita", details: error.message });
    }
    if (!data) return res.status(404).json({ error: "Receita não encontrada" });
    return res.json(data);
  } catch (err) {
    console.error("[revenue] error:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

app.delete("/api/revenue", apiAuthMiddleware, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(500).json({ error: "Supabase não configurado" });

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Parâmetro 'id' é obrigatório para exclusão" });

    const { data: deleted, error } = await supabase.from("revenue").delete().eq("id", id).select("id");

    if (error) {
      console.error("[revenue] delete error:", error);
      return res.status(500).json({ error: "Erro ao excluir receita", details: error.message });
    }
    if (!deleted || deleted.length === 0) return res.status(404).json({ error: "Receita não encontrada" });
    return res.json({ message: "Receita excluída com sucesso" });
  } catch (err) {
    console.error("[revenue] error:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// ---- API Despesas (consumidores externos) ----
app.get("/api/expenses", apiAuthMiddleware, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(500).json({ error: "Supabase não configurado" });

    const id = req.query.id;
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const search = (req.query.search || "").trim();
    const offset = (page - 1) * limit;

    if (id) {
      const { data, error } = await supabase.from("expenses").select("*").eq("id", id).maybeSingle();
      if (error) {
        console.error("[expenses] fetch error:", error);
        return res.status(500).json({ error: "Erro ao buscar despesa" });
      }
      if (!data) return res.status(404).json({ error: "Despesa não encontrada" });
      return res.json(data);
    }

    let query = supabase
      .from("expenses")
      .select("id, amount, description, expense_date, status, patient_id, patient_name, category_id, created_at, updated_at", { count: "exact" });

    if (search) {
      const term = search.replace(/[%_]/g, "\\$&");
      query = query.or(`description.ilike.%${term}%,patient_name.ilike.%${term}%`);
    }

    const { data, error, count } = await query
      .order("expense_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[expenses] list error:", error);
      return res.status(500).json({ error: "Erro ao listar despesas" });
    }

    return res.json({
      data: data || [],
      meta: { page, limit, total: count || 0, total_pages: Math.ceil((count || 0) / limit) },
    });
  } catch (err) {
    console.error("[expenses] error:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

app.post("/api/expenses", apiAuthMiddleware, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(500).json({ error: "Supabase não configurado" });

    const body = req.body || {};
    const amount = body.amount;
    if (amount === undefined || typeof amount !== "number" || amount < 0) {
      return res.status(400).json({ error: "Campo 'amount' é obrigatório e deve ser um número >= 0" });
    }

    const insert = {
      amount,
      description: body.description ?? "",
      expense_date: body.expense_date ?? new Date().toISOString().slice(0, 10),
      status: body.status ?? "pending",
      patient_id: body.patient_id ?? null,
      patient_name: body.patient_name ?? null,
      category_id: body.category_id ?? null,
    };

    const { data, error } = await supabase.from("expenses").insert(insert).select().single();

    if (error) {
      console.error("[expenses] create error:", error);
      return res.status(500).json({ error: "Erro ao criar despesa", details: error.message });
    }
    return res.status(201).json(data);
  } catch (err) {
    console.error("[expenses] error:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

app.put("/api/expenses", apiAuthMiddleware, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(500).json({ error: "Supabase não configurado" });

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Parâmetro 'id' é obrigatório para atualização" });

    const body = req.body || {};
    const allowed = ["amount", "description", "expense_date", "status", "patient_id", "patient_name", "category_id"];
    const update = {};
    for (const k of allowed) {
      if (body[k] !== undefined) update[k] = body[k];
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "Nenhum campo para atualizar" });
    }

    const { data, error } = await supabase.from("expenses").update(update).eq("id", id).select().maybeSingle();

    if (error) {
      console.error("[expenses] update error:", error);
      return res.status(500).json({ error: "Erro ao atualizar despesa", details: error.message });
    }
    if (!data) return res.status(404).json({ error: "Despesa não encontrada" });
    return res.json(data);
  } catch (err) {
    console.error("[expenses] error:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

app.delete("/api/expenses", apiAuthMiddleware, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(500).json({ error: "Supabase não configurado" });

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Parâmetro 'id' é obrigatório para exclusão" });

    const { data: deleted, error } = await supabase.from("expenses").delete().eq("id", id).select("id");

    if (error) {
      console.error("[expenses] delete error:", error);
      return res.status(500).json({ error: "Erro ao excluir despesa", details: error.message });
    }
    if (!deleted || deleted.length === 0) return res.status(404).json({ error: "Despesa não encontrada" });
    return res.json({ message: "Despesa excluída com sucesso" });
  } catch (err) {
    console.error("[expenses] error:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "clinica-pro-integrations-backend" });
});

app.listen(PORT, () => {
  console.log(`Backend de e-mail rodando em http://localhost:${PORT}`);
});
