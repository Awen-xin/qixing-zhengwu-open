const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");

function optionalRequire(name) {
  try {
    return require(name);
  } catch {
    return null;
  }
}

const mammoth = optionalRequire("mammoth");
const XLSX = optionalRequire("xlsx");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");
const OSS_REGION = process.env.OSS_REGION || "";
const OSS_BUCKET = process.env.OSS_BUCKET || "";
const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID || "";
const OSS_ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET || "";
const OSS_ENDPOINT = process.env.OSS_ENDPOINT || (OSS_REGION ? `${OSS_REGION}.aliyuncs.com` : "");
const OSS_ENABLED = Boolean(OSS_BUCKET && OSS_ACCESS_KEY_ID && OSS_ACCESS_KEY_SECRET && OSS_ENDPOINT);

const chineseNumbers = [
  "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十"
];

const defaultUnits = {
  management: chineseNumbers.map((number) => `第${number}管理区`),
  direct: [
    "水利中心", "农业综合服务中心", "农业技术推广中心", "粮食和农产品贸易中心", "科技信息中心",
    "公共服务管理中心", "卫生服务中心", "资源管理中心", "城镇管理维护中心", "幼儿园"
  ],
  office: [
    "办公室", "党委工作部", "工会", "综合管理部", "纪委", "财务管理部", "社会事务部",
    "工程建设管理部", "社会稳定办", "人力资源部", "财务部", "发展计划部", "审计部",
    "安监办", "农业生产部", "水利工程部", "合规风控部", "综合经济部"
  ]
};

const modules = ["党务公开", "政务公开", "财务公开", "职工疑问", "干部答疑", "通知公告"];

function makeRecord(module, region, unitType, title, timeLevel, type, status, fileName, count, createdAt) {
  return {
    id: crypto.randomUUID(),
    module,
    region,
    unitType,
    title,
    timeLevel,
    type,
    status,
    fileName,
    fileUrl: "",
    count,
    createdAt
  };
}

function seedRecords() {
  return [
    makeRecord("党务公开", "第一管理区", "management", "党组织架构与党员岗位职责公开", "长期", "制度规章", "已公开", "党务公开说明.docx", 1248, "2026-07-18"),
    makeRecord("党务公开", "党委工作部", "office", "党员发展及预备党员转正公示", "临时", "人员公示", "待审核", "党员发展公示.pdf", 927, "2026-07-16"),
    makeRecord("政务公开", "第二十管理区", "management", "便民办理流程和政策服务清单", "长期", "办事流程", "已公开", "政务服务清单.docx", 1321, "2026-07-20"),
    makeRecord("政务公开", "公共服务管理中心", "direct", "公共服务事项公开数据汇总", "阶段", "阶段工作", "已公开", "公共服务公开表.xlsx", 1873, "2026-07-19"),
    makeRecord("政务公开", "办公室", "office", "机关政务公开事项目录更新", "阶段", "目录清单", "已公开", "机关公开目录.pdf", 766, "2026-07-17"),
    makeRecord("政务公开", "第一管理区", "management", "基层便民服务站公开事项", "临时", "临时公告", "已公开", "便民服务站事项.docx", 452, "2026-07-15"),
    makeRecord("财务公开", "财务管理部", "office", "财务管理制度与经费使用准则", "长期", "制度规章", "已公开", "财务制度.pdf", 860, "2026-07-14"),
    makeRecord("财务公开", "粮食和农产品贸易中心", "direct", "物资采购及补贴发放公示", "临时", "资金公开", "已公开", "采购公示.xlsx", 318, "2026-07-13"),
    makeRecord("职工疑问", "人力资源部", "office", "社保缴费问题答复", "临时", "疑问回复", "已公开", "社保答复.docx", 286, "2026-07-12"),
    makeRecord("职工疑问", "第一管理区", "management", "住房补贴办理咨询", "临时", "疑问回复", "办理中", "住房补贴咨询.pdf", 198, "2026-07-11"),
    makeRecord("干部答疑", "综合管理部", "office", "干部值班制度答疑", "长期", "答疑回复", "已公开", "值班制度答疑.docx", 188, "2026-07-10"),
    makeRecord("干部答疑", "第三管理区", "management", "基层治理问题汇总", "阶段", "答疑回复", "办理中", "治理问题汇总.xlsx", 246, "2026-07-09"),
    makeRecord("通知公告", "安监办", "office", "夏季安全生产通知", "临时", "通知公告", "已公开", "安全生产通知.pdf", 420, "2026-07-08"),
    makeRecord("通知公告", "农业技术推广中心", "direct", "农业技术培训安排", "阶段", "通知公告", "已公开", "培训安排.docx", 318, "2026-07-07")
  ];
}

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    writeDb({
      units: defaultUnits,
      modules,
      records: seedRecords(),
      users: [],
      logs: []
    });
  }
}

function readDb() {
  ensureStore();
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDb(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function allUnits(units) {
  return Object.entries(units).flatMap(([unitType, names]) => names.map((name) => ({ name, unitType })));
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function safeName(name) {
  return String(name || "未命名文件").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").slice(0, 120);
}

function modulePath(module) {
  return {
    "党务公开": "dangwu",
    "政务公开": "zhengwu",
    "财务公开": "caiwu",
    "职工疑问": "worker-question",
    "干部答疑": "cadre-answer",
    "通知公告": "notice"
  }[module] || "other";
}

function ossResource(objectKey, params = {}) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return `/${OSS_BUCKET}/${objectKey}${query ? `?${query}` : ""}`;
}

function ossPath(objectKey) {
  return `/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
}

function disposition(type, fileName) {
  const fallbackName = safeName(fileName || "未命名文件").replace(/[^\x20-\x7e]/g, "_");
  return `${type}; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(fileName || fallbackName)}`;
}

function ossSignature(method, objectKey, contentType, dateOrExpires, params = {}) {
  const stringToSign = `${method}\n\n${contentType || ""}\n${dateOrExpires}\n${ossResource(objectKey, params)}`;
  return crypto.createHmac("sha1", OSS_ACCESS_KEY_SECRET).update(stringToSign).digest("base64");
}

function uploadToOss(buffer, objectKey, contentType) {
  return new Promise((resolve, reject) => {
    const date = new Date().toUTCString();
    const signature = ossSignature("PUT", objectKey, contentType, date);
    const req = https.request({
      method: "PUT",
      hostname: `${OSS_BUCKET}.${OSS_ENDPOINT}`,
      path: ossPath(objectKey),
      headers: {
        Authorization: `OSS ${OSS_ACCESS_KEY_ID}:${signature}`,
        Date: date,
        "Content-Type": contentType,
        "Content-Length": buffer.length
      }
    }, (ossRes) => {
      const chunks = [];
      ossRes.on("data", (chunk) => chunks.push(chunk));
      ossRes.on("end", () => {
        if (ossRes.statusCode >= 200 && ossRes.statusCode < 300) {
          resolve({ provider: "oss", key: objectKey });
        } else {
          reject(new Error(`OSS upload failed: ${ossRes.statusCode} ${Buffer.concat(chunks).toString("utf8")}`));
        }
      });
    });
    req.on("error", reject);
    req.end(buffer);
  });
}

function downloadFromOss(objectKey) {
  return new Promise((resolve, reject) => {
    const date = new Date().toUTCString();
    const signature = ossSignature("GET", objectKey, "", date);
    const req = https.request({
      method: "GET",
      hostname: `${OSS_BUCKET}.${OSS_ENDPOINT}`,
      path: ossPath(objectKey),
      headers: {
        Authorization: `OSS ${OSS_ACCESS_KEY_ID}:${signature}`,
        Date: date
      }
    }, (ossRes) => {
      const chunks = [];
      ossRes.on("data", (chunk) => chunks.push(chunk));
      ossRes.on("end", () => {
        const buffer = Buffer.concat(chunks);
        if (ossRes.statusCode >= 200 && ossRes.statusCode < 300) {
          resolve(buffer);
        } else {
          reject(new Error(`OSS download failed: ${ossRes.statusCode} ${buffer.toString("utf8")}`));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function storeUploadedFile(file, module, recordId) {
  const fileName = safeName(file.filename);
  const ext = path.extname(fileName).toLowerCase();
  const storedName = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  if (OSS_ENABLED) {
    const key = `uploads/${modulePath(module)}/${storedName}`;
    const stored = await uploadToOss(file.buffer, key, file.contentType || contentTypeFor(fileName));
    return { fileName, fileUrl: `/api/files/${recordId}`, fileStorage: stored };
  }
  fs.writeFileSync(path.join(UPLOAD_DIR, storedName), file.buffer);
  return { fileName, fileUrl: `/api/files/${recordId}`, fileStorage: { provider: "local", path: storedName } };
}

async function readStoredFile(record) {
  if (!record.fileStorage) return null;
  if (record.fileStorage.provider === "oss") {
    return downloadFromOss(record.fileStorage.key);
  }
  return fs.promises.readFile(path.join(UPLOAD_DIR, record.fileStorage.path));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function stripXml(text) {
  return String(text || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function zipEntries(buffer) {
  const entries = {};
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) return entries;
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  let offset = centralOffset;
  const centralEnd = centralOffset + centralSize;
  while (offset < centralEnd && buffer.readUInt32LE(offset) === 0x02014b50) {
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.slice(offset + 46, offset + 46 + fileNameLength).toString("utf8");
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const data = buffer.slice(dataStart, dataStart + compressedSize);
    if (method === 0) entries[name] = data;
    if (method === 8) entries[name] = zlib.inflateRawSync(data);
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

function basicDocxToHtml(buffer) {
  const entries = zipEntries(buffer);
  const xml = entries["word/document.xml"]?.toString("utf8") || "";
  const paragraphs = xml
    .split(/<\/w:p>/)
    .map((part) => stripXml(part.replace(/<w:tab\/>/g, "    ").replace(/<w:br\/>/g, "\n")).trim())
    .filter(Boolean);
  return paragraphs.length
    ? paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join("")
    : `<p class="empty-state">暂未解析到可预览文字，可使用下载查看原文件。</p>`;
}

async function docxToHtml(buffer) {
  if (mammoth) {
    const result = await mammoth.convertToHtml({ buffer }, {
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Heading 1'] => h2:fresh",
        "p[style-name='Heading 2'] => h3:fresh",
        "table => table.document-table"
      ]
    });
    return result.value || `<p class="empty-state">暂未解析到可预览文字，可使用下载查看原文件。</p>`;
  }
  return basicDocxToHtml(buffer);
}

function basicXlsxToHtml(buffer) {
  const entries = zipEntries(buffer);
  const sharedXml = entries["xl/sharedStrings.xml"]?.toString("utf8") || "";
  const shared = [...sharedXml.matchAll(/<si[\s\S]*?<\/si>/g)].map(([item]) => stripXml(item));
  const sheetName = Object.keys(entries).find((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  const sheetXml = sheetName ? entries[sheetName].toString("utf8") : "";
  const rows = [...sheetXml.matchAll(/<row[\s\S]*?<\/row>/g)].slice(0, 80).map(([row]) => {
    return [...row.matchAll(/<c[^>]*?(?:t="([^"]+)")?[^>]*>([\s\S]*?)<\/c>/g)].map(([, type, body]) => {
      const value = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] || /<t[^>]*>([\s\S]*?)<\/t>/.exec(body)?.[1] || "";
      return type === "s" ? (shared[Number(value)] || "") : stripXml(value);
    });
  }).filter((row) => row.some(Boolean));
  if (!rows.length) return `<p class="empty-state">暂未解析到可预览表格，可使用下载查看原文件。</p>`;
  return `<div class="preview-table-wrap"><table>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</table></div>`;
}

function xlsxToHtml(buffer) {
  if (XLSX) {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return `<p class="empty-state">暂未解析到可预览表格，可使用下载查看原文件。</p>`;
    const html = XLSX.utils.sheet_to_html(workbook.Sheets[sheetName], { id: "preview-table", editable: false });
    return `<div class="preview-sheet-name">工作表：${escapeHtml(sheetName)}</div><div class="preview-table-wrap">${html}</div>`;
  }
  return basicXlsxToHtml(buffer);
}

function previewHtml(record, bodyHtml) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(record.fileName)}</title>
  <style>
    body { margin: 0; font-family: "Microsoft YaHei", Arial, sans-serif; color: #1d2b34; background: #eef5f6; }
    header { position: sticky; top: 0; z-index: 2; display: flex; gap: 12px; align-items: center; justify-content: space-between; padding: 14px 22px; background: #073a53; color: #fff; box-shadow: 0 4px 16px rgba(0,0,0,.18); }
    h1 { margin: 0; font-size: 18px; font-weight: 700; }
    a { color: #fff1b6; text-decoration: none; white-space: nowrap; }
    main { max-width: 1120px; margin: 18px auto; padding: 22px; background: #fff; border-radius: 8px; box-shadow: 0 10px 30px rgba(16,54,72,.12); }
    h2, h3 { color: #0b4964; margin: 24px 0 12px; }
    p { line-height: 1.9; margin: 0 0 12px; }
    iframe { width: 100%; height: calc(100vh - 110px); border: 0; background: #fff; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 12px 0 18px; }
    th, td { border: 1px solid #d8e7ec; padding: 8px 10px; min-width: 120px; line-height: 1.55; }
    tr:first-child td, th { background: #edf7fa; color: #0b4964; font-weight: 700; }
    img { max-width: 100%; height: auto; }
    ul, ol { line-height: 1.8; }
    .preview-sheet-name { margin-bottom: 12px; color: #667780; }
    .preview-table-wrap { overflow: auto; }
    .document-table { table-layout: auto; }
    .empty-state { color: #667780; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(record.fileName)}</h1>
    <a href="/api/files/${encodeURIComponent(record.id)}?download=1">下载原文件</a>
  </header>
  <main>${bodyHtml}</main>
</body>
</html>`;
}

function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").filter(Boolean).map((part) => {
    const [key, ...value] = part.trim().split("=");
    return [key, decodeURIComponent(value.join("="))];
  }));
}

function currentUser(req) {
  const cookies = parseCookies(req);
  if (!cookies.qixing_user) return null;
  try {
    return JSON.parse(Buffer.from(cookies.qixing_user, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function setUserCookie(res, user) {
  const value = Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
  res.setHeader("Set-Cookie", `qixing_user=${value}; Path=/; HttpOnly; SameSite=Lax`);
}

function clearUserCookie(res) {
  res.setHeader("Set-Cookie", "qixing_user=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
}

function requireAdmin(req, res) {
  const user = currentUser(req);
  if (!user || !["unitAdmin", "superAdmin"].includes(user.role)) {
    sendJson(res, 401, { message: "请先使用管理员身份登录。" });
    return null;
  }
  return user;
}

function canDeleteRecord(user, record) {
  return user.role === "superAdmin" || (user.role === "unitAdmin" && record.region === user.unit);
}

function parseMultipart(buffer, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  if (!match) return {};
  const boundary = Buffer.from(`--${match[1] || match[2]}`);
  const parts = {};
  let start = buffer.indexOf(boundary);
  while (start !== -1) {
    start += boundary.length;
    if (buffer[start] === 45 && buffer[start + 1] === 45) break;
    if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2;
    const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"), start);
    if (headerEnd === -1) break;
    const headers = buffer.slice(start, headerEnd).toString("utf8");
    const next = buffer.indexOf(boundary, headerEnd + 4);
    if (next === -1) break;
    let body = buffer.slice(headerEnd + 4, next);
    if (body.length >= 2 && body[body.length - 2] === 13 && body[body.length - 1] === 10) {
      body = body.slice(0, -2);
    }
    const name = /name="([^"]+)"/.exec(headers)?.[1];
    const filename = /filename="([^"]*)"/.exec(headers)?.[1];
    if (name) {
      parts[name] = filename !== undefined
        ? { filename, buffer: body, contentType: /Content-Type:\s*([^\r\n]+)/i.exec(headers)?.[1] || "application/octet-stream" }
        : body.toString("utf8");
    }
    start = next;
  }
  return parts;
}

function contentTypeFor(file) {
  const ext = path.extname(file).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  }[ext] || "application/octet-stream";
}

async function handleApi(req, res, pathname) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "GET" && pathname === "/api/bootstrap") {
    const db = readDb();
    return sendJson(res, 200, { units: db.units, modules: db.modules, records: db.records, user: currentUser(req) });
  }

  const fileMatch = /^\/api\/files\/([^/]+)$/.exec(pathname);
  if (req.method === "GET" && fileMatch) {
    const db = readDb();
    const record = db.records.find((item) => item.id === decodeURIComponent(fileMatch[1]));
    const download = requestUrl.searchParams.get("download") === "1";
    if (!record || !record.fileStorage) return sendJson(res, 404, { message: "文件不存在。" });
    const data = await readStoredFile(record);
    res.writeHead(200, {
      "Content-Type": contentTypeFor(record.fileName),
      "Content-Disposition": disposition(download ? "attachment" : "inline", record.fileName)
    });
    res.end(data);
    return;
  }

  const previewMatch = /^\/api\/files\/([^/]+)\/preview$/.exec(pathname);
  if (req.method === "GET" && previewMatch) {
    const db = readDb();
    const record = db.records.find((item) => item.id === decodeURIComponent(previewMatch[1]));
    if (!record || !record.fileStorage) return sendJson(res, 404, { message: "文件不存在。" });
    const ext = path.extname(record.fileName).toLowerCase();
    const data = await readStoredFile(record);
    let bodyHtml = "";
    if (ext === ".pdf") {
      bodyHtml = `<iframe src="/api/files/${encodeURIComponent(record.id)}" title="${escapeHtml(record.fileName)}"></iframe>`;
    } else if (ext === ".docx") {
      bodyHtml = await docxToHtml(data);
    } else if (ext === ".xlsx" || ext === ".xls") {
      bodyHtml = xlsxToHtml(data);
    } else if (ext === ".doc") {
      bodyHtml = `<p class="empty-state">旧版 Word（.doc）暂不支持网页预览，请下载原文件查看。建议后续上传 .docx 格式。</p>`;
    } else {
      bodyHtml = `<p class="empty-state">该文件格式暂不支持网页预览，请下载原文件查看。</p>`;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(previewHtml(record, bodyHtml));
    return;
  }

  if (req.method === "POST" && pathname === "/api/register") {
    const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
    const user = { role: "public", name: String(body.name || "").trim(), phone: String(body.phone || "").trim() };
    if (!user.name || !user.phone) return sendJson(res, 400, { message: "请填写姓名和电话号。" });
    const db = readDb();
    db.users.push({ ...user, createdAt: new Date().toISOString() });
    writeDb(db);
    setUserCookie(res, user);
    return sendJson(res, 200, { user });
  }

  if (req.method === "POST" && pathname === "/api/login") {
    const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
    const role = body.role === "superAdmin" ? "superAdmin" : "unitAdmin";
    const unit = String(body.unit || "第一管理区");
    const user = { role, unit, name: role === "superAdmin" ? "最高权限管理员" : `${unit}管理员` };
    setUserCookie(res, user);
    return sendJson(res, 200, { user });
  }

  if (req.method === "POST" && pathname === "/api/logout") {
    clearUserCookie(res);
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "POST" && pathname === "/api/records") {
    const user = requireAdmin(req, res);
    if (!user) return;
    const body = await readBody(req);
    const parts = parseMultipart(body, req.headers["content-type"]);
    const db = readDb();
    const region = user.role === "unitAdmin" ? user.unit : String(parts.region || "");
    const unit = allUnits(db.units).find((item) => item.name === region);
    if (!unit) return sendJson(res, 400, { message: "所属单位不存在。" });
    const file = parts.file;
    const recordId = crypto.randomUUID();
    let fileName = file?.filename ? safeName(file.filename) : "未命名文件";
    let fileUrl = "";
    let fileStorage = null;
    if (file?.buffer?.length) {
      const stored = await storeUploadedFile(file, String(parts.module || "政务公开"), recordId);
      fileName = stored.fileName;
      fileUrl = stored.fileUrl;
      fileStorage = stored.fileStorage;
    }
    const record = {
      id: recordId,
      module: String(parts.module || "政务公开"),
      region,
      unitType: unit.unitType,
      title: String(parts.title || "").trim(),
      timeLevel: String(parts.timeLevel || "临时"),
      type: "上传文件",
      status: "已公开",
      fileName,
      fileUrl,
      fileStorage,
      count: 1,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    if (!record.title) return sendJson(res, 400, { message: "请填写信息标题。" });
    db.records.unshift(record);
    writeDb(db);
    return sendJson(res, 201, { record, records: db.records });
  }

  const deleteMatch = /^\/api\/records\/([^/]+)$/.exec(pathname);
  if (req.method === "DELETE" && deleteMatch) {
    const user = requireAdmin(req, res);
    if (!user) return;
    const db = readDb();
    const record = db.records.find((item) => item.id === decodeURIComponent(deleteMatch[1]));
    if (!record) return sendJson(res, 404, { message: "信息不存在。" });
    if (!canDeleteRecord(user, record)) return sendJson(res, 403, { message: "不能删除其他单位的信息。" });
    db.records = db.records.filter((item) => item.id !== record.id);
    writeDb(db);
    return sendJson(res, 200, { records: db.records });
  }

  if (req.method === "POST" && pathname === "/api/units") {
    const user = requireAdmin(req, res);
    if (!user || user.role !== "superAdmin") return sendJson(res, 403, { message: "只有最高权限管理员可以维护单位。" });
    const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
    const type = String(body.type || "");
    const name = String(body.name || "").trim();
    const db = readDb();
    if (!db.units[type]) return sendJson(res, 400, { message: "单位类型不存在。" });
    if (name && !db.units[type].includes(name)) db.units[type].push(name);
    writeDb(db);
    return sendJson(res, 200, { units: db.units });
  }

  const unitMatch = /^\/api\/units\/([^/]+)\/(.+)$/.exec(pathname);
  if (req.method === "DELETE" && unitMatch) {
    const user = requireAdmin(req, res);
    if (!user || user.role !== "superAdmin") return sendJson(res, 403, { message: "只有最高权限管理员可以维护单位。" });
    const type = decodeURIComponent(unitMatch[1]);
    const name = decodeURIComponent(unitMatch[2]);
    const db = readDb();
    if (!db.units[type]) return sendJson(res, 400, { message: "单位类型不存在。" });
    db.units[type] = db.units[type].filter((unit) => unit !== name);
    db.records = db.records.filter((record) => record.region !== name);
    writeDb(db);
    return sendJson(res, 200, { units: db.units, records: db.records });
  }

  return sendJson(res, 404, { message: "接口不存在。" });
}

function serveStatic(req, res, pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const filePath = path.resolve(ROOT, relative);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
    res.end(data);
  });
}

ensureStore();

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname);
    } else {
      serveStatic(req, res, url.pathname);
    }
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { message: "服务器内部错误。" });
  }
}).listen(PORT, () => {
  console.log(`七星政务公开网站已启动：http://localhost:${PORT}`);
});
