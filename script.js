const unitTypeNames = { management: "管理区", direct: "直属单位", office: "机关部门" };
const moduleDescriptions = {
  党务公开: "展示管理区、直属单位、机关部门的党务信息公开情况。",
  政务公开: "展示管理区、直属单位、机关部门的政务服务、政策制度和重点工作公开情况。",
  财务公开: "展示管理区、直属单位、机关部门的预算、收支、资金、采购等公开情况。",
  职工疑问: "展示职工疑问、相关单位答复和办理进度。",
  干部答疑: "展示干部答疑、制度解释和基层治理沟通信息。",
  通知公告: "展示平台公告、单位通知、临时事项和重要提醒。"
};

const fallbackChineseNumbers = [
  "一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十"
];

const fallbackUnits = {
  management: fallbackChineseNumbers.map((number) => `第${number}管理区`),
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

const fallbackModules = ["党务公开", "政务公开", "财务公开", "职工疑问", "干部答疑", "通知公告"];

function qs(selector) {
  return document.querySelector(selector);
}

function makeRecord(module, region, unitType, title, timeLevel, type, status, fileName, count, createdAt) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
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

const fallbackRecords = [
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

let units = structuredClone(fallbackUnits);
let modules = [...fallbackModules];
let records = [...fallbackRecords];
let apiReady = location.protocol !== "file:";
let currentRole = "guest";
let currentUnit = "第一管理区";
let currentModule = "政务公开";
let currentUnitType = "all";
let pendingAction = null;
let registeredName = "";

const screens = {
  home: qs("#home-screen"),
  login: qs("#login-screen"),
  public: qs("#public-screen"),
  module: qs("#module-screen"),
  dashboard: qs("#dashboard-screen")
};
const roleSelect = qs("#role-select");
const loginUnit = qs("#login-unit");
const roleTip = qs("#role-tip");
const homeUserRole = qs("#home-user-role");
const loginForm = qs("#login-form");
const registerForm = qs("#register-form");
const publicUserBadge = qs("#public-user-badge");
const publicUnitFilter = qs("#public-unit-filter");
const publicSort = qs("#public-sort");
const publicKeyword = qs("#public-keyword");
const publicStats = qs("#public-stats");
const publicList = qs("#public-list");
const moduleTitle = qs("#module-title");
const moduleSubtitle = qs("#module-subtitle");
const userBadge = qs("#user-badge");
const moduleTabs = qs("#module-tabs");
const unitGroupTabs = qs("#unit-group-tabs");
const unitFilter = qs("#unit-filter");
const timeFilter = qs("#time-filter");
const keywordFilter = qs("#keyword-filter");
const metricSelect = qs("#metric-select");
const moduleStats = qs("#module-stats");
const moduleChart = qs("#module-chart");
const recordGrid = qs("#record-grid");
const adminPanel = qs("#admin-panel");
const adminScope = qs("#admin-scope");
const uploadForm = qs("#upload-form");
const unitAdmin = qs("#unit-admin");
const unitForm = qs("#unit-form");
const unitAdminList = qs("#unit-admin-list");
const dashboardChart = qs("#dashboard-chart");
const dashboardKpis = qs("#dashboard-kpis");
const treeMap = qs("#tree-map");

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "操作失败");
  return data;
}

async function loadData() {
  if (!apiReady) {
    populateControls();
    return;
  }
  try {
    const data = await api("/api/bootstrap");
    units = data.units;
    modules = data.modules;
    records = data.records;
    if (data.user) applyUser(data.user);
  } catch (error) {
    apiReady = false;
    console.warn("后端接口暂不可用，已切换为本地演示模式。", error);
  }
  populateControls();
}

function allUnits() {
  return Object.entries(units).flatMap(([unitType, names]) => names.map((name) => ({ name, unitType })));
}

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("is-active"));
  screens[name].classList.add("is-active");
}

function roleName() {
  if (currentRole === "superAdmin") return "最高权限管理员";
  if (currentRole === "unitAdmin") return `普通管理员：${currentUnit}`;
  if (currentRole === "public") return registeredName ? `普通用户：${registeredName}` : "普通用户";
  return "未登录";
}

function applyUser(user) {
  currentRole = user?.role || "guest";
  currentUnit = user?.unit || currentUnit;
  registeredName = user?.name || registeredName;
  homeUserRole.textContent = roleName();
  userBadge.textContent = roleName();
  publicUserBadge.textContent = roleName();
}

function setLoggedIn(role) {
  applyUser({
    role,
    unit: role === "public" ? currentUnit : (loginUnit.value || currentUnit),
    name: role === "public" ? registeredName : ""
  });
}

function requireLogin(action) {
  if (currentRole === "guest") {
    pendingAction = action;
    showScreen("login");
    return;
  }
  action();
}

function continueAfterAdminLogin() {
  const action = pendingAction;
  pendingAction = null;
  if (action) action();
  else {
    currentModule = "政务公开";
    currentUnitType = "all";
    showScreen("module");
    renderModule();
  }
}

function showPublicView() {
  pendingAction = null;
  renderPublicUnitFilter(publicUnitFilter.value || "全部");
  renderPublicView();
  showScreen("public");
}

function populateControls() {
  const unitOptions = allUnits().map((unit) => `<option value="${unit.name}">${unit.name}</option>`).join("");
  loginUnit.innerHTML = unitOptions;
  uploadForm.elements.region.innerHTML = unitOptions;
  uploadForm.elements.module.innerHTML = modules.map((module) => `<option value="${module}">${module}</option>`).join("");
  renderPublicUnitFilter(publicUnitFilter?.value || "全部");
}

function countByUnit(sourceRows) {
  return sourceRows.reduce((acc, row) => {
    acc[row.region] = (acc[row.region] || 0) + 1;
    return acc;
  }, {});
}

function renderPublicUnitFilter(keepValue = "全部") {
  const publicRows = records.filter((record) => record.module === "政务公开");
  const counts = countByUnit(publicRows);
  const options = allUnits().map((unit) => `<option value="${unit.name}">${unit.name}（${counts[unit.name] || 0}份）</option>`).join("");
  publicUnitFilter.innerHTML = `<option value="全部">全部单位（${publicRows.length}份）</option>${options}`;
  publicUnitFilter.value = [...publicUnitFilter.options].some((option) => option.value === keepValue) ? keepValue : "全部";
}

function publicRows() {
  const keyword = publicKeyword.value.trim().toLowerCase();
  const rows = records.filter((record) => {
    return record.module === "政务公开" &&
      (publicUnitFilter.value === "全部" || record.region === publicUnitFilter.value) &&
      (!keyword || `${record.title}${record.region}${record.fileName}${record.type}`.toLowerCase().includes(keyword));
  });
  return rows.sort((a, b) => {
    const direction = publicSort.value === "asc" ? 1 : -1;
    return direction * String(a.createdAt).localeCompare(String(b.createdAt));
  });
}

function fileText(record) {
  if (record.fileUrl) {
    const fileApiUrl = record.id ? `/api/files/${encodeURIComponent(record.id)}` : record.fileUrl;
    const viewUrl = record.id ? `/api/files/${encodeURIComponent(record.id)}/preview` : record.fileUrl;
    const separator = fileApiUrl.includes("?") ? "&" : "?";
    const downloadUrl = `${fileApiUrl}${separator}download=1`;
    return `
      <span class="file-actions">
        <span class="file-name">${record.fileName}</span>
        <a href="${viewUrl}" target="_blank" rel="noopener">查看</a>
        <a href="${downloadUrl}" download="${record.fileName}">下载</a>
      </span>
    `;
  }
  return `<span>${record.fileName}</span>`;
}

function renderPublicView() {
  publicUserBadge.textContent = roleName();
  renderPublicUnitFilter(publicUnitFilter.value || "全部");
  const rows = publicRows();
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  publicStats.innerHTML = [
    ["公开文件", `${rows.length}份`],
    ["信息条数", `${total}条`],
    ["涉及单位", `${new Set(rows.map((row) => row.region)).size}个`],
    ["当前排序", publicSort.value === "asc" ? "最早在上" : "最新在上"]
  ].map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join("");
  publicList.innerHTML = rows.map((record) => `
    <article class="public-record">
      <div>
        <span class="tag">${unitTypeNames[record.unitType]}</span>
        <span class="tag tag--time">${record.timeLevel}</span>
      </div>
      <h3>${record.title}</h3>
      <p>${record.region} · ${record.type} · ${record.status}</p>
      <footer><span>${record.createdAt}</span>${fileText(record)}</footer>
    </article>
  `).join("") || `<p class="empty-state">暂无符合条件的政务公开信息。</p>`;
}

function renderTabs() {
  moduleTabs.innerHTML = modules.map((module) => `<button class="${module === currentModule ? "active" : ""}" data-tab="${module}" type="button">${module}</button>`).join("");
}

function renderUnitGroups() {
  const groups = [["all", "全部单位"], ["management", "管理区"], ["direct", "直属单位"], ["office", "机关部门"]];
  unitGroupTabs.innerHTML = groups.map(([value, label]) => `<button class="${value === currentUnitType ? "active" : ""}" data-unit-type="${value}" type="button">${label}</button>`).join("");
}

function renderUnitFilter(keepValue = "全部") {
  const source = currentUnitType === "all" ? allUnits() : units[currentUnitType].map((name) => ({ name, unitType: currentUnitType }));
  const relevantRows = records.filter((record) => record.module === currentModule && (currentUnitType === "all" || record.unitType === currentUnitType));
  const counts = countByUnit(relevantRows);
  const options = source.map((unit) => `<option value="${unit.name}">${unit.name}（${counts[unit.name] || 0}份）</option>`).join("");
  unitFilter.innerHTML = `<option value="全部">全部单位（${relevantRows.length}份）</option>${options}`;
  unitFilter.value = [...unitFilter.options].some((option) => option.value === keepValue) ? keepValue : "全部";
}

function rowsForModule() {
  const keyword = keywordFilter.value.trim().toLowerCase();
  return records.filter((record) => {
    return record.module === currentModule &&
      (currentUnitType === "all" || record.unitType === currentUnitType) &&
      (unitFilter.value === "全部" || record.region === unitFilter.value) &&
      (timeFilter.value === "全部" || record.timeLevel === timeFilter.value) &&
      (!keyword || `${record.title}${record.region}${record.fileName}${record.type}`.toLowerCase().includes(keyword));
  });
}

function groupSum(rows, key) {
  return rows.reduce((acc, row) => {
    const label = key === "unitType" ? unitTypeNames[row.unitType] : row[key];
    acc[label] = (acc[label] || 0) + row.count;
    return acc;
  }, {});
}

function renderBars(container, grouped) {
  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, value]) => value), 1);
  container.innerHTML = entries.map(([label, value], index) => {
    const height = Math.max(12, Math.round((value / max) * 100));
    return `<div class="bar-item"><b>${value}</b><i class="tone-${index % 4}" style="height:${height}%"></i><span>${label}</span></div>`;
  }).join("") || `<p class="empty-state">暂无统计数据。</p>`;
}

function canUpload() {
  return currentRole === "unitAdmin" || currentRole === "superAdmin";
}

function canDelete(record) {
  return currentRole === "superAdmin" || (currentRole === "unitAdmin" && record.region === currentUnit);
}

function renderModule() {
  const selectedUnit = unitFilter.value || "全部";
  moduleTitle.textContent = currentModule;
  moduleSubtitle.textContent = moduleDescriptions[currentModule];
  userBadge.textContent = roleName();
  renderTabs();
  renderUnitGroups();
  renderUnitFilter(selectedUnit);
  const rows = rowsForModule();
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  moduleStats.innerHTML = [
    ["公开条数", `${total}条`],
    ["信息文件", `${rows.length}份`],
    ["覆盖单位", `${new Set(rows.map((row) => row.region)).size}个`],
    ["当前栏目", currentModule]
  ].map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join("");
  renderBars(moduleChart, groupSum(rows, metricSelect.value));
  recordGrid.innerHTML = rows.map((record) => `
    <article class="record-card">
      <div><span class="tag">${unitTypeNames[record.unitType]}</span><span class="tag tag--time">${record.timeLevel}</span></div>
      <h3>${record.title}</h3>
      <p>${record.region} · ${record.type} · ${record.status}</p>
      <small>${record.createdAt} · ${fileText(record)}</small>
      ${canDelete(record) ? `<button class="delete-btn" type="button" data-delete="${record.id}">删除</button>` : ""}
    </article>
  `).join("") || `<p class="empty-state">当前筛选条件下暂无信息。</p>`;
  adminPanel.hidden = !canUpload();
  unitAdmin.hidden = currentRole !== "superAdmin";
  uploadForm.elements.module.value = currentModule;
  uploadForm.elements.region.disabled = false;
  if (currentRole === "unitAdmin") {
    uploadForm.elements.region.value = currentUnit;
    uploadForm.elements.region.disabled = true;
  }
  adminScope.textContent = currentRole === "superAdmin"
    ? "可上传和删除全部单位信息，并维护单位清单。"
    : `仅可上传和删除 ${currentUnit} 的信息。`;
  renderUnitAdminList();
}

function renderDashboard() {
  const byModule = modules.reduce((acc, module) => {
    acc[module] = records.filter((record) => record.module === module).reduce((sum, record) => sum + record.count, 0);
    return acc;
  }, {});
  renderBars(dashboardChart, byModule);
  dashboardKpis.innerHTML = [
    ["管理区", `${units.management.length}个`],
    ["直属单位", `${units.direct.length}个`],
    ["机关部门", `${units.office.length}个`],
    ["公开文件", `${records.length}份`],
    ["公开总量", `${records.reduce((sum, record) => sum + record.count, 0)}条`]
  ].map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join("");
  treeMap.innerHTML = `
    <div class="tree-root">七星数智公开一体化云平台</div>
    <div class="tree-branches">${modules.map((module) => `<div><strong>${module}</strong><span>${records.filter((record) => record.module === module).length}份文件</span></div>`).join("")}</div>
    <div class="tree-branches tree-branches--units">
      <div><strong>管理区</strong><span>${units.management.length}个</span></div>
      <div><strong>直属单位</strong><span>${units.direct.length}个</span></div>
      <div><strong>机关部门</strong><span>${units.office.length}个</span></div>
    </div>`;
}

function renderUnitAdminList() {
  unitAdminList.innerHTML = Object.entries(units).map(([type, names]) => `
    <section><strong>${unitTypeNames[type]}</strong>${names.map((name) => `<button type="button" data-remove-unit="${name}" data-remove-type="${type}">${name}</button>`).join("")}</section>
  `).join("");
}

async function refreshFromServer() {
  if (!apiReady) return;
  const data = await api("/api/bootstrap");
  units = data.units;
  modules = data.modules;
  records = data.records;
  if (data.user) applyUser(data.user);
  populateControls();
}

document.querySelectorAll("[data-module]").forEach((button) => {
  button.addEventListener("click", () => requireLogin(() => {
    if (currentRole === "public") {
      showPublicView();
      return;
    }
    currentModule = button.dataset.module;
    currentUnitType = "all";
    showScreen("module");
    renderModule();
  }));
});

document.querySelector("[data-dashboard]").addEventListener("click", () => requireLogin(() => {
  if (currentRole === "public") {
    showPublicView();
    return;
  }
  showScreen("dashboard");
  renderDashboard();
}));

document.querySelectorAll("[data-home]").forEach((button) => button.addEventListener("click", () => showScreen("home")));
document.querySelectorAll("[data-login]").forEach((button) => button.addEventListener("click", () => showScreen("login")));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    if (apiReady) {
      const data = await api("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: roleSelect.value, unit: loginUnit.value })
      });
      applyUser(data.user);
    } else {
      setLoggedIn(roleSelect.value);
    }
    continueAfterAdminLogin();
  } catch (error) {
    alert(error.message);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(registerForm);
  registeredName = data.get("name").trim();
  try {
    if (apiReady) {
      const result = await api("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: registeredName, phone: data.get("phone").trim() })
      });
      applyUser(result.user);
    } else {
      setLoggedIn("public");
    }
    registerForm.reset();
    showPublicView();
  } catch (error) {
    alert(error.message);
  }
});

roleSelect.addEventListener("change", () => {
  roleTip.textContent = roleSelect.value === "superAdmin"
    ? "最高权限管理员可维护全部单位和信息。"
    : "普通管理员只能上传和删除本单位信息。";
});
loginUnit.addEventListener("change", () => (currentUnit = loginUnit.value));

publicUnitFilter.addEventListener("change", renderPublicView);
publicSort.addEventListener("change", renderPublicView);
publicKeyword.addEventListener("input", renderPublicView);

moduleTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tab]");
  if (!button) return;
  currentModule = button.dataset.tab;
  renderModule();
});
unitGroupTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-unit-type]");
  if (!button) return;
  currentUnitType = button.dataset.unitType;
  unitFilter.value = "全部";
  renderModule();
});
[unitFilter, timeFilter, keywordFilter, metricSelect].forEach((control) => control.addEventListener("input", renderModule));

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!canUpload()) return;
  const data = new FormData(uploadForm);
  const region = currentRole === "unitAdmin" ? currentUnit : data.get("region");
  try {
    if (apiReady) {
      data.set("region", region);
      const result = await api("/api/records", { method: "POST", body: data });
      records = result.records;
    } else {
      const unit = allUnits().find((item) => item.name === region);
      records.unshift(makeRecord(
        data.get("module"),
        region,
        unit?.unitType || "office",
        data.get("title").trim(),
        data.get("timeLevel"),
        "上传文件",
        "已公开",
        data.get("file")?.name || "未命名文件",
        1,
        new Date().toISOString().slice(0, 10)
      ));
    }
    currentModule = data.get("module");
    uploadForm.reset();
    populateControls();
    renderModule();
  } catch (error) {
    alert(error.message);
  }
});

recordGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  const target = records.find((record) => record.id === button.dataset.delete);
  if (!target || !canDelete(target)) return;
  const confirmed = window.confirm([
    "确认删除这条公开信息吗？",
    "",
    `标题：${target.title}`,
    `单位：${target.region}`,
    `栏目：${target.module}`,
    `文件：${target.fileName || "无附件"}`,
    "",
    "删除后，网页列表中将不再显示这条信息。"
  ].join("\n"));
  if (!confirmed) return;
  try {
    if (apiReady) {
      const result = await api(`/api/records/${encodeURIComponent(target.id)}`, { method: "DELETE" });
      records = result.records;
    } else {
      records = records.filter((record) => record.id !== target.id);
    }
    renderModule();
  } catch (error) {
    alert(error.message);
  }
});

unitForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (currentRole !== "superAdmin") return;
  const data = new FormData(unitForm);
  const type = data.get("type");
  const name = data.get("name").trim();
  try {
    if (apiReady) {
      const result = await api("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name })
      });
      units = result.units;
    } else if (name && !units[type].includes(name)) {
      units[type].push(name);
    }
    unitForm.reset();
    populateControls();
    renderModule();
  } catch (error) {
    alert(error.message);
  }
});

unitAdminList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-remove-unit]");
  if (!button || currentRole !== "superAdmin") return;
  const type = button.dataset.removeType;
  const name = button.dataset.removeUnit;
  try {
    if (apiReady) {
      const result = await api(`/api/units/${encodeURIComponent(type)}/${encodeURIComponent(name)}`, { method: "DELETE" });
      units = result.units;
      records = result.records;
    } else {
      units[type] = units[type].filter((unit) => unit !== name);
      records = records.filter((record) => record.region !== name);
    }
    populateControls();
    renderModule();
  } catch (error) {
    alert(error.message);
  }
});

loadData();
