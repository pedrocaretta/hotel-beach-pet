const STORAGE_KEY = "hotelBeachPetState:v1";

const seedState = {
  users: [
    { id: "u-admin", name: "Admin Beach Pet", email: "admin@hotelbeachpet.com", password: "admin123", role: "admin", phone: "(21) 99999-0000" },
    { id: "u-client", name: "Joana Freitas", email: "cliente@hotelbeachpet.com", password: "cliente123", role: "cliente", phone: "(21) 98888-1111" }
  ],
  pets: [
    { id: "p-bela", ownerId: "u-client", name: "Belinha", breed: "Golden Retriever", age: "4 anos", weight: "24 kg", temperament: "Carinhosa", allergies: "Sem alergias", food: "Racao premium 2x ao dia" },
    { id: "p-thor", ownerId: "u-client", name: "Thor", breed: "Shih-tzu", age: "2 anos", weight: "7 kg", temperament: "Ansioso no banho", allergies: "Frango", food: "Racao hipoalergenica" }
  ],
  appointments: [
    { id: "a-1", petId: "p-bela", ownerId: "u-client", service: "hotel", start: "2026-07-12", end: "2026-07-15", time: "09:00", status: "confirmado", notes: "Levar caminha preferida.", price: 360, employee: "Marina", step: "confirmado", packageName: "Diaria hotel", addons: "Recreacao extra", commission: 0 },
    { id: "a-2", petId: "p-thor", ownerId: "u-client", service: "banho_tosa", start: "2026-07-13", end: "2026-07-13", time: "14:30", status: "agendado", notes: "Tosa bebe, cuidado com alergia.", price: 120, employee: "Carlos", step: "banho", packageName: "Banho + tosa bebe", addons: "Shampoo hipoalergenico", commission: 18, feedback: "Tutor pediu cuidado com secador." },
    { id: "a-3", petId: "p-bela", ownerId: "u-client", service: "veterinario", start: "2026-07-14", end: "2026-07-14", time: "11:00", status: "confirmado", notes: "Retorno de vacina e pesagem.", price: 90, employee: "Dra. Paula", step: "consulta", packageName: "Consulta clinica", addons: "", commission: 0 }
  ],
  vetRecords: [
    { id: "v-1", petId: "p-bela", date: "2026-07-10", title: "Medicacao", kind: "remedio", notes: "Dar comprimido antipulgas junto da refeicao da noite.", priority: "normal", weight: "24 kg", deworming: "Vermifugo em dia", prescription: "Antipulgas oral", hospitalization: "Nao" },
    { id: "v-2", petId: "p-thor", date: "2026-07-10", title: "Atencao no banho", kind: "observacao", notes: "Evitar shampoo com perfume e secador muito quente.", priority: "alta", weight: "7 kg", deworming: "Rever na proxima consulta", prescription: "", hospitalization: "Nao" }
  ],
  vaccines: [
    { id: "vac-1", petId: "p-bela", name: "V10", date: "2026-04-02", expires: "2027-04-02", fileName: "carteira-belinha.pdf" },
    { id: "vac-2", petId: "p-thor", name: "Raiva", date: "2026-05-20", expires: "2027-05-20", fileName: "foto-carteira-thor.jpg" }
  ],
  pricing: {
    hotel: { label: "Hospedagem", price: 100, smallPrice: 100, largePrice: 120, unit: "diaria" },
    banho: { label: "Banho", price: 0, unit: "servico" },
    tosa: { label: "Tosa", price: 0, unit: "servico" },
    banho_tosa: { label: "Banho e tosa", price: 0, unit: "pacote" }
  }
};

let state = loadState();
migrateState();
let session = JSON.parse(localStorage.getItem("hotelBeachPetSession") || "null");
let view = "dashboard";
let searchTerm = "";
let modal = null;
let toastTimer = null;
let selectedPetId = null;

const roleViews = {
  admin: ["dashboard", "appointments", "grooming", "pricing", "clinic", "pets", "users"],
  cliente: ["appointments", "grooming", "pets", "vaccines"]
};

function initialViewForUser(user) {
  return user.role === "admin" ? "dashboard" : "appointments";
}

function allowedViews(user) {
  return roleViews[user.role] || roleViews.cliente;
}

function normalizeView(user) {
  if (!allowedViews(user).includes(view)) view = initialViewForUser(user);
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : structuredClone(seedState);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function migrateState() {
  state.users ||= [];
  state.pets ||= [];
  state.appointments ||= [];
  state.vetRecords ||= [];
  state.vaccines ||= [];
  state.pricing ||= structuredClone(seedState.pricing);
  Object.entries(seedState.pricing).forEach(([key, value]) => {
    state.pricing[key] ||= structuredClone(value);
    state.pricing[key].label ||= value.label;
    state.pricing[key].unit ||= value.unit;
    state.pricing[key].price ??= value.price;
    if (key === "hotel") {
      state.pricing[key].smallPrice ??= 100;
      state.pricing[key].largePrice ??= 120;
      state.pricing[key].price = state.pricing[key].smallPrice;
    }
  });

  state.appointments.forEach((item) => {
    const defaultPrice = item.service === "hotel" ? 360 : item.service === "veterinario" ? 90 : 120;
    item.price ??= defaultPrice;
    item.employee ||= item.service === "veterinario" ? "Dra. Paula" : item.service === "hotel" ? "Marina" : "Carlos";
    item.step ||= item.status === "atendido" ? "finalizado" : item.service === "veterinario" ? "consulta" : "agendado";
    item.packageName ||= serviceLabel(item.service);
    item.addons ??= "";
    item.feedback ??= item.notes || "";
    item.commission ??= ["banho", "tosa", "banho_tosa"].includes(item.service) ? Math.round(Number(item.price || 0) * 15) / 100 : 0;
  });

  if (!state.appointments.some((item) => item.service === "veterinario")) {
    const pet = state.pets[0];
    if (pet) {
      state.appointments.push({
        id: "a-clinic-demo",
        petId: pet.id,
        ownerId: pet.ownerId,
        service: "veterinario",
        start: "2026-07-14",
        end: "2026-07-14",
        time: "11:00",
        status: "confirmado",
        notes: "Retorno de vacina e pesagem.",
        price: 90,
        employee: "Dra. Paula",
        step: "consulta",
        packageName: "Consulta clinica",
        addons: "",
        commission: 0,
        feedback: ""
      });
    }
  }

  state.vetRecords.forEach((record) => {
    const pet = state.pets.find((item) => item.id === record.petId);
    record.weight ||= pet?.weight || "";
    record.deworming ||= "Acompanhar na proxima consulta";
    record.prescription ??= record.kind === "remedio" ? record.notes : "";
    record.hospitalization ||= "Nao";
  });

  saveState();
}

function setSession(user) {
  session = user ? { id: user.id } : null;
  localStorage.setItem("hotelBeachPetSession", JSON.stringify(session));
  view = user ? initialViewForUser(user) : "dashboard";
  render();
}

function currentUser() {
  return state.users.find((user) => user.id === session?.id);
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function shortDate(date) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function serviceLabel(service) {
  return { hotel: "Hotel", banho: "Banho", tosa: "Tosa", banho_tosa: "Banho e tosa", veterinario: "Veterinario" }[service] || service;
}

function currency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function pricingItems() {
  return [
    ["hotel", "Hospedagem", "diaria"],
    ["banho", "Banho", "servico"],
    ["tosa", "Tosa", "servico"],
    ["banho_tosa", "Banho e tosa", "pacote"]
  ];
}

function priceForService(service) {
  return Number(state.pricing?.[service]?.price || 0);
}

function hotelDailyPrice(size = "pequeno") {
  return Number(size === "grande" ? state.pricing?.hotel?.largePrice ?? 120 : state.pricing?.hotel?.smallPrice ?? 100);
}

function daysBetween(start, end) {
  if (!start) return 1;
  const first = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${(end || start)}T00:00:00Z`);
  const diff = Math.round((last - first) / 86400000);
  return Math.max(diff || 1, 1);
}

function appointmentPrice(service, start, end, dogSize) {
  if (service === "hotel") return hotelDailyPrice(dogSize) * daysBetween(start, end);
  return priceForService(service);
}

function priceLabel(service) {
  if (service === "hotel") return `Pequeno ${currency(hotelDailyPrice("pequeno"))} / Grande ${currency(hotelDailyPrice("grande"))}`;
  const price = priceForService(service);
  return price > 0 ? currency(price) : "A combinar";
}

function groomingAppointments() {
  return state.appointments.filter((item) => ["banho", "tosa", "banho_tosa"].includes(item.service));
}

function clinicAppointments() {
  return state.appointments.filter((item) => item.service === "veterinario");
}

function appointmentRevenue(items) {
  return items.reduce((total, item) => total + Number(item.price || 0), 0);
}

function dateOnly(value) {
  return new Date(`${value}T00:00:00Z`);
}

function weekRange() {
  const today = new Date();
  const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const day = start.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + diffToMonday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start, end };
}

function isAppointmentInWeek(item) {
  const { start, end } = weekRange();
  const appointmentStart = dateOnly(item.start);
  const appointmentEnd = dateOnly(item.end || item.start);
  return appointmentStart <= end && appointmentEnd >= start;
}

function petAppointments(petId) {
  return state.appointments.filter((item) => item.petId === petId).sort((a, b) => `${a.start}${a.time}`.localeCompare(`${b.start}${b.time}`));
}

function weekAppointments() {
  return state.appointments.filter(isAppointmentInWeek).sort((a, b) => `${a.start}${a.time}`.localeCompare(`${b.start}${b.time}`));
}

function petInitials(name) {
  return (name || "Pet").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function statusBadge(status) {
  const styles = { confirmado: "blue", atendido: "", agendado: "gold", faltou: "red", recusado: "red" };
  return `<span class="badge ${styles[status] || ""}">${status}</span>`;
}

function petsForUser(user) {
  return user.role === "admin" ? state.pets : state.pets.filter((pet) => pet.ownerId === user.id);
}

function appointmentsForUser(user) {
  return user.role === "admin" ? state.appointments : state.appointments.filter((item) => item.ownerId === user.id);
}

function petName(petId) {
  return state.pets.find((pet) => pet.id === petId)?.name || "Pet removido";
}

function ownerName(ownerId) {
  return state.users.find((user) => user.id === ownerId)?.name || "Tutor removido";
}

function toast(message) {
  const old = document.querySelector(".toast");
  if (old) old.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2600);
}

function render() {
  const user = currentUser();
  if (!user) {
    document.getElementById("app").innerHTML = authTemplate();
    bindAuth();
    return;
  }

  normalizeView(user);
  document.getElementById("app").innerHTML = appTemplate(user);
  bindApp(user);
  if (modal) openModal(modal.type, modal.payload);
}

function authTemplate(mode = "login") {
  return `
    <main class="auth-shell">
      <section class="auth-art">
        <div class="brand-badge"><span class="paw-mark">HB</span> Hotel Beach Pet</div>
        <div class="auth-copy">
          <h1>Hotel, banho, tosa e cuidado veterinario.</h1>
          <p>Um painel simples para tutores agendarem estadias e servicos, enquanto a equipe acompanha cada pet com historico, vacina e observacoes.</p>
        </div>
      </section>
      <section class="auth-panel">
        <div class="auth-card">
          <h2>Acessar sistema</h2>
          <p class="subtitle">Entre como administrador ou tutor cadastrado.</p>
          <div class="tabs">
            <button class="tab active" data-auth-tab="login">Login</button>
            <button class="tab" data-auth-tab="register">Criar conta</button>
          </div>
          <div id="auth-form">${mode === "login" ? loginForm() : registerForm()}</div>
          <div class="demo-logins">
            <strong>Acessos de teste</strong>
            <span>Admin: admin@hotelbeachpet.com / admin123</span>
            <span>Tutor: cliente@hotelbeachpet.com / cliente123</span>
          </div>
        </div>
      </section>
    </main>
  `;
}

function loginForm() {
  return `
    <form class="form-grid" id="login-form">
      <label class="field"><span>Email</span><input name="email" type="email" required value="admin@hotelbeachpet.com"></label>
      <label class="field"><span>Senha</span><input name="password" type="password" required value="admin123"></label>
      <button class="btn" type="submit">Entrar</button>
    </form>
  `;
}

function registerForm() {
  return `
    <form class="form-grid" id="register-form">
      <label class="field"><span>Nome completo</span><input name="name" required></label>
      <label class="field"><span>Telefone</span><input name="phone" placeholder="(00) 00000-0000"></label>
      <label class="field"><span>Email</span><input name="email" type="email" required></label>
      <label class="field"><span>Senha</span><input name="password" type="password" minlength="6" required></label>
      <button class="btn" type="submit">Criar login de tutor</button>
    </form>
  `;
}

function appTemplate(user) {
  return `
    <main class="app-shell">
      <aside class="sidebar">
        <div class="side-logo"><span class="paw-mark">HB</span><span>Hotel Beach Pet</span></div>
        <nav class="nav">
          ${user.role === "admin" ? navButton("dashboard", "Painel") : ""}
          ${navButton("appointments", user.role === "admin" ? "Agendamentos" : "Agendar")}
          ${navButton("grooming", "Banho e Tosa")}
          ${user.role === "admin" ? navButton("pricing", "Valores") : ""}
          ${user.role === "admin" ? navButton("clinic", "Saude") : ""}
          ${navButton("pets", user.role === "admin" ? "Caes" : "Meus caes")}
          ${user.role === "admin" ? "" : navButton("vaccines", "Carteira de vacina")}
          ${user.role === "admin" ? navButton("users", "Usuarios") : ""}
        </nav>
        <div class="side-footer">
          <div class="user-mini"><strong>${user.name}</strong><br>${user.role === "admin" ? "Administrador" : "Tutor"}</div>
          <button class="btn secondary" id="logout">Sair</button>
        </div>
      </aside>
      <section class="main">
        <div class="topbar">
          <div class="search-line">
            <input id="search" placeholder="Buscar por pet, tutor, servico ou observacao" value="${searchTerm}">
          </div>
          <span class="role-pill">${user.role === "admin" ? "Admin" : "Usuario"}</span>
        </div>
        <div id="view">${viewTemplate(user)}</div>
      </section>
    </main>
  `;
}

function navButton(id, label) {
  return `<button class="${view === id ? "active" : ""}" data-view="${id}">${label}</button>`;
}

function viewTemplate(user) {
  normalizeView(user);
  const templates = {
    dashboard: dashboardTemplate,
    appointments: appointmentsTemplate,
    grooming: groomingTemplate,
    pricing: pricingTemplate,
    clinic: clinicTemplate,
    pets: petsTemplate,
    vet: vetTemplate,
    vaccines: vaccinesTemplate,
    users: usersTemplate
  };
  return (templates[view] || dashboardTemplate)(user);
}

function dashboardTemplate(user) {
  const appointments = appointmentsForUser(user);
  const grooming = groomingAppointments();
  const clinic = clinicAppointments();
  const week = weekAppointments();
  const weekPets = [...new Set(week.map((item) => item.petId))].length;
  const pending = appointments.filter((item) => item.status === "agendado");
  const confirmed = appointments.filter((item) => item.status === "confirmado").length;
  const upcoming = [...appointments].filter((item) => item.status !== "recusado").sort((a, b) => `${a.start}${a.time}`.localeCompare(`${b.start}${b.time}`)).slice(0, 5);
  const revenue = appointmentRevenue(appointments);
  const vaccineLimit = new Date();
  vaccineLimit.setMonth(vaccineLimit.getMonth() + 6);
  const vaccineAlerts = state.vaccines.filter((item) => item.expires && new Date(`${item.expires}T00:00:00Z`) <= vaccineLimit).slice(0, 4);

  return `
    <div class="section-title">
      <div>
        <h2>Painel de operacao</h2>
        <p class="subtitle">O essencial para decidir rapido: pedidos, caes da semana, horarios e alertas.</p>
      </div>
      <div class="actions inline-actions">
        <button class="btn" data-view="appointments">Ver pedidos</button>
        <button class="btn secondary" data-view="pets">Hotel da semana</button>
      </div>
    </div>
    <section class="stats">
      ${statCard("Pedidos pendentes", pending.length, "rgba(232, 185, 73, .2)")}
      ${statCard("Caes esta semana", weekPets, "rgba(244, 127, 107, .18)")}
      ${statCard("Confirmados", confirmed, "rgba(79, 141, 247, .16)")}
      ${statCard("Faturamento previsto", currency(revenue), "rgba(79, 141, 247, .16)", "total")}
    </section>
    <section class="ops-grid">
      <div class="panel priority-panel">
        <div class="panel-head">
          <h3>Pedidos para aceitar</h3>
          <button class="btn secondary" data-view="appointments">Abrir fila</button>
        </div>
        <div class="list">${pending.slice(0, 4).map((item) => `
          <div class="decision-item">
            <div><strong>${petName(item.petId)} - ${serviceLabel(item.service)}</strong><span>${ownerName(item.ownerId)} - ${formatDate(item.start)} ${item.time} - ${currency(item.price || priceForService(item.service))}</span></div>
            <div class="table-actions"><button class="btn secondary" data-appointment-action="confirmado" data-id="${item.id}">Aceitar</button><button class="btn secondary danger" data-appointment-action="recusado" data-id="${item.id}">Recusar</button></div>
          </div>
        `).join("") || emptySmall("Nenhum pedido aguardando aceite.")}</div>
      </div>
      <div class="panel">
        <div class="panel-head">
          <h3>Proximos horarios</h3>
          <button class="btn secondary" data-view="pets">Ver quartos</button>
        </div>
        <div class="list">${upcoming.map(appointmentLine).join("") || emptySmall("Nenhum agendamento ainda.")}</div>
      </div>
      <div class="panel">
        <div class="panel-head">
          <h3>Servicos em movimento</h3>
          <button class="btn secondary" data-view="grooming">Banho e tosa</button>
        </div>
        <div class="list">
          ${procedureRow("Hotel", appointments.filter((item) => item.service === "hotel").length, "gold")}
          ${procedureRow("Banho e tosa", grooming.length, "blue")}
          ${procedureRow("Saude", clinic.length, "red")}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head">
          <h3>Alertas de saude</h3>
          <button class="btn secondary" data-view="clinic">Saude</button>
        </div>
        <div class="list">${vaccineAlerts.map((item) => `
          <div class="list-item"><div><strong>${petName(item.petId)} - ${item.name}</strong><span>Validade: ${formatDate(item.expires)}</span></div><span class="badge gold">vacina</span></div>
        `).join("") || emptySmall("Nenhum alerta de vacina proximo.")}</div>
      </div>
      <div class="quick-actions">
        <button class="quick-action" data-view="pricing"><strong>Valores</strong><span>Atualizar diaria e servicos</span></button>
        <button class="quick-action" data-modal="pet"><strong>Novo cao</strong><span>Cadastrar tutor e pet</span></button>
        <button class="quick-action" data-view="users"><strong>Usuarios</strong><span>Logins de tutores</span></button>
      </div>
    </section>
  `;
}

function statCard(label, value, tone, suffix = "pets") {
  return `<article class="stat-card" style="--tone:${tone}"><span>${label}</span><strong>${value}</strong><span>${suffix}</span></article>`;
}

function procedureRow(label, value, color) {
  return `<div class="list-item"><div><strong>${label}</strong><span>${value} procedimento(s)</span></div><span class="badge ${color}">${value}</span></div>`;
}

function appointmentLine(item) {
  return `<div class="appointment"><div><strong>${petName(item.petId)} - ${serviceLabel(item.service)}</strong><span>${formatDate(item.start)} ${item.time} - ${ownerName(item.ownerId)}</span></div>${statusBadge(item.status)}</div>`;
}

function appointmentsTemplate(user) {
  const items = filterItems(appointmentsForUser(user), (item) => `${petName(item.petId)} ${ownerName(item.ownerId)} ${serviceLabel(item.service)} ${item.status} ${item.notes}`);
  const pending = items.filter((item) => item.status === "agendado").length;
  const confirmed = items.filter((item) => item.status === "confirmado").length;
  const rejected = items.filter((item) => item.status === "recusado").length;
  const hotel = items.filter((item) => item.service === "hotel").length;
  const grooming = items.filter((item) => ["banho", "tosa", "banho_tosa"].includes(item.service)).length;
  const emptyColspan = user.role === "admin" ? 8 : 6;

  return `
    <div class="section-title">
      <div>
        <h2>${user.role === "admin" ? "Pedidos de agendamento" : "Agendar meu cachorro"}</h2>
        <p class="subtitle">${user.role === "admin" ? "Aceite ou recuse os pedidos enviados pelos clientes. Os valores sao definidos na aba Valores." : "Escolha o cachorro, a data e contrate hotel, banho ou tosa."}</p>
      </div>
      ${user.role === "admin" ? "" : `<button class="btn" data-modal="appointment">Novo agendamento</button>`}
    </div>
    <section class="stats compact">
      ${statCard(user.role === "admin" ? "Aguardando confirmacao" : "Pedidos enviados", pending, "rgba(232, 185, 73, .2)")}
      ${statCard("Confirmados", confirmed, "rgba(79, 141, 247, .16)")}
      ${user.role === "admin" ? statCard("Recusados", rejected, "rgba(228, 87, 99, .16)") : statCard("Hotel", hotel, "rgba(41, 188, 135, .16)")}
      ${statCard("Banho e tosa", grooming, "rgba(244, 127, 107, .18)")}
    </section>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Pet</th>${user.role === "admin" ? "<th>Tutor</th>" : ""}<th>Servico</th><th>Data</th><th>Status</th><th>Valor</th><th>Observacao</th>${user.role === "admin" ? "<th>Acoes</th>" : ""}</tr></thead>
        <tbody>${items.map((item) => `
          <tr>
            <td><strong>${petName(item.petId)}</strong></td>
            ${user.role === "admin" ? `<td>${ownerName(item.ownerId)}</td>` : ""}
            <td>${serviceLabel(item.service)}</td>
            <td>${formatDate(item.start)} ${item.end !== item.start ? `ate ${formatDate(item.end)}` : ""}<br><span class="meta">${item.time}</span></td>
            <td>${statusBadge(item.status)}</td>
            <td>${currency(item.price || priceForService(item.service))}</td>
            <td>${item.notes || "-"}</td>
            ${user.role === "admin" ? `<td><div class="table-actions"><button class="btn secondary" data-appointment-action="confirmado" data-id="${item.id}">Aceitar</button><button class="btn secondary danger" data-appointment-action="recusado" data-id="${item.id}">Recusar</button></div></td>` : ""}
          </tr>`).join("") || `<tr><td colspan="${emptyColspan}">${emptySmall(user.role === "admin" ? "Nenhum pedido encontrado." : "Voce ainda nao tem agendamentos.")}</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function clientGroomingTemplate(user) {
  const services = pricingItems().filter(([key]) => key !== "hotel");
  const myRequests = filterItems(groomingAppointments().filter((item) => item.ownerId === user.id), (item) => `${petName(item.petId)} ${serviceLabel(item.service)} ${item.status} ${item.notes}`);

  return `
    <div class="section-title">
      <div>
        <h2>Contratar Banho e Tosa</h2>
        <p class="subtitle">Escolha o servico, envie o pedido e aguarde o aceite do Hotel Beach Pet.</p>
      </div>
    </div>
    <section class="module-hero grooming-hero">
      <div>
        <span class="module-kicker">Servicos para seu cao</span>
        <h3>Banho, tosa ou pacote completo com pedido online.</h3>
        <p>Os valores abaixo sao definidos pelo administrador. Quando ainda nao houver preco cadastrado, o servico fica como a combinar.</p>
      </div>
      <div class="module-list">
        <span>Pedido enviado direto para o admin</span>
        <span>Valor exibido antes de contratar</span>
        <span>Status acompanhado na sua conta</span>
      </div>
    </section>
    <section class="service-grid">
      ${services.map(([key, label, unit]) => `
        <article class="service-card">
          <span class="badge gold">${unit}</span>
          <h3>${label}</h3>
          <strong class="price-tag">${priceLabel(key)}</strong>
          <p class="meta">Agende o melhor horario para seu cachorro.</p>
          <button class="btn" data-modal="grooming" data-service="${key}">Contratar</button>
        </article>
      `).join("")}
    </section>
    <div class="section-title slim-title">
      <div><h2>Meus pedidos de banho e tosa</h2><p class="subtitle">Acompanhe se o admin aceitou ou recusou.</p></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Pet</th><th>Servico</th><th>Data</th><th>Status</th><th>Valor</th><th>Observacao</th></tr></thead>
        <tbody>${myRequests.map((item) => `
          <tr>
            <td><strong>${petName(item.petId)}</strong></td>
            <td>${serviceLabel(item.service)}</td>
            <td>${formatDate(item.start)}<br><span class="meta">${item.time}</span></td>
            <td>${statusBadge(item.status)}</td>
            <td>${currency(item.price || priceForService(item.service))}</td>
            <td>${item.notes || "-"}</td>
          </tr>`).join("") || `<tr><td colspan="6">${emptySmall("Voce ainda nao contratou banho e tosa.")}</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function groomingTemplate(user) {
  if (user.role !== "admin") return clientGroomingTemplate(user);
  const items = filterItems(groomingAppointments(), (item) => `${petName(item.petId)} ${ownerName(item.ownerId)} ${item.employee} ${item.packageName} ${item.addons} ${item.feedback}`);
  const active = items.filter((item) => item.status !== "atendido" && item.status !== "faltou").length;
  const revenue = appointmentRevenue(items);
  const commissions = items.reduce((total, item) => total + Number(item.commission || 0), 0);
  const packages = items.filter((item) => item.packageName).length;

  return `
    <div class="section-title">
      <div>
        <h2>Banho e Tosa</h2>
        <p class="subtitle">Agendamento, pacotes, etapas, adicionais, funcionario, feedback e comissao automatica.</p>
      </div>
      <button class="btn" data-modal="grooming">Novo banho/tosa</button>
    </div>
    <section class="module-hero grooming-hero">
      <div>
        <span class="module-kicker">Modulo operacional</span>
        <h3>Produtividade real da equipe de banho e tosa.</h3>
        <p>Controle cada servico desde o agendamento ate a finalizacao, com valores e comissoes visiveis para o administrador.</p>
      </div>
      <div class="module-list">
        <span>Agendamento e etapas do servico</span>
        <span>Venda e controle de pacotes</span>
        <span>Adicionais, funcionario e comissao</span>
        <span>Historico com feedback do cliente</span>
      </div>
    </section>
    <section class="stats compact">
      ${statCard("Servicos ativos", active, "rgba(232, 185, 73, .2)")}
      ${statCard("Pacotes vendidos", packages, "rgba(79, 141, 247, .16)")}
      ${statCard("Faturamento", currency(revenue), "rgba(41, 188, 135, .16)", "total")}
      ${statCard("Comissoes", currency(commissions), "rgba(244, 127, 107, .18)", "previsto")}
    </section>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Pet</th><th>Pacote</th><th>Data</th><th>Etapa</th><th>Funcionario</th><th>Adicionais</th><th>Valor</th><th>Comissao</th><th>Acoes</th></tr></thead>
        <tbody>${items.map((item) => `
          <tr>
            <td><strong>${petName(item.petId)}</strong><br><span class="meta">${ownerName(item.ownerId)}</span></td>
            <td>${item.packageName || serviceLabel(item.service)}<br><span class="meta">${item.feedback || "Sem feedback"}</span></td>
            <td>${formatDate(item.start)}<br><span class="meta">${item.time}</span></td>
            <td><span class="badge ${item.step === "finalizado" ? "blue" : "gold"}">${item.step || "agendado"}</span></td>
            <td>${item.employee || "-"}</td>
            <td>${item.addons || "-"}</td>
            <td>${currency(item.price)}</td>
            <td>${currency(item.commission)}</td>
            <td><button class="btn secondary" data-grooming-step="${item.id}">Proxima etapa</button></td>
          </tr>`).join("") || `<tr><td colspan="9">${emptySmall("Nenhum servico de banho e tosa cadastrado.")}</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function pricingTemplate(user) {
  if (user.role !== "admin") return appointmentsTemplate(user);

  return `
    <div class="section-title">
      <div>
        <h2>Valores</h2>
        <p class="subtitle">Defina os precos que aparecem para o cliente em hospedagem, banho e tosa.</p>
      </div>
    </div>
    <form class="pricing-form" id="pricing-form">
      ${pricingItems().map(([key, label, unit]) => `
        <article class="price-card">
          <div>
            <span class="badge">${unit}</span>
            <h3>${label}</h3>
            <p class="meta">Valor atual: ${priceLabel(key)}</p>
          </div>
          ${key === "hotel" ? `
            <div class="row price-row">
              <label class="field">
                <span>Porte pequeno</span>
                <input name="hotelSmall" type="number" min="0" step="0.01" value="${state.pricing.hotel?.smallPrice ?? 100}">
              </label>
              <label class="field">
                <span>Porte grande</span>
                <input name="hotelLarge" type="number" min="0" step="0.01" value="${state.pricing.hotel?.largePrice ?? 120}">
              </label>
            </div>
          ` : `
            <label class="field">
              <span>Valor em reais</span>
              <input name="${key}" type="number" min="0" step="0.01" value="${state.pricing[key]?.price || 0}">
            </label>
          `}
        </article>
      `).join("")}
      <button class="btn" type="submit">Salvar valores</button>
    </form>
  `;
}

function clinicTemplate(user) {
  if (user.role !== "admin") return appointmentsTemplate(user);
  const consultations = filterItems(clinicAppointments(), (item) => `${petName(item.petId)} ${ownerName(item.ownerId)} ${item.employee} ${item.notes}`);
  const records = filterItems(state.vetRecords, (record) => `${petName(record.petId)} ${record.title} ${record.kind} ${record.notes} ${record.weight} ${record.deworming} ${record.prescription}`);
  const vaccineLimit = new Date();
  vaccineLimit.setMonth(vaccineLimit.getMonth() + 6);
  const vaccineAlerts = state.vaccines.filter((item) => item.expires && new Date(`${item.expires}T00:00:00Z`) <= vaccineLimit).length;
  const hospitalizations = records.filter((item) => String(item.hospitalization || "").toLowerCase().includes("sim")).length;

  return `
    <div class="section-title">
      <div>
        <h2>Saude do pet</h2>
        <p class="subtitle">Clinica, veterinario, observacoes, prontuario e vacinas em uma unica area.</p>
      </div>
      <div class="actions inline-actions">
        <button class="btn" data-modal="clinic">Nova ficha</button>
        <button class="btn secondary" data-modal="vet">Obs. veterinaria</button>
        <button class="btn secondary" data-modal="vaccine">Vacina</button>
      </div>
    </div>
    <section class="module-hero clinic-hero">
      <div>
        <span class="module-kicker">Area unificada</span>
        <h3>Prontuario, cuidados veterinarios e vacinas sem abas extras.</h3>
        <p>Acompanhe consultas, receitas, medicacoes, alertas de vacina e cuidados especiais de cada cachorro.</p>
      </div>
      <div class="module-list">
        <span>Fichas e anamnese por especialidade</span>
        <span>Receituarios, remedios e observacoes</span>
        <span>Controle de peso, vermifugos e internamentos</span>
        <span>Carteira e alertas de vacinas</span>
      </div>
    </section>
    <section class="stats compact">
      ${statCard("Consultas agenda", consultations.length, "rgba(79, 141, 247, .16)")}
      ${statCard("Prontuarios", records.length, "rgba(41, 188, 135, .16)")}
      ${statCard("Alertas de vacina", vaccineAlerts, "rgba(232, 185, 73, .2)")}
      ${statCard("Internamentos", hospitalizations, "rgba(228, 87, 99, .16)")}
    </section>
    <section class="dash-grid">
      <div class="panel">
        <h3>Atendimentos da clinica</h3>
        <div class="list">${consultations.map((item) => `
          <div class="appointment">
            <div><strong>${petName(item.petId)} - ${item.employee || "Veterinario"}</strong><span>${formatDate(item.start)} ${item.time} - ${item.notes || "Consulta"}</span></div>
            ${statusBadge(item.status)}
          </div>`).join("") || emptySmall("Nenhuma consulta veterinaria agendada.")}</div>
      </div>
      <div class="panel">
        <h3>Carteira e alertas de vacina</h3>
        <div class="list">${state.vaccines.map((item) => `
          <div class="list-item"><div><strong>${petName(item.petId)} - ${item.name}</strong><span>Validade: ${formatDate(item.expires)}</span></div><span class="badge ${item.expires ? "gold" : ""}">${item.fileName ? "anexo" : "sem anexo"}</span></div>
        `).join("") || emptySmall("Nenhuma vacina cadastrada.")}</div>
      </div>
    </section>
    <section class="content-grid clinic-records">
      ${records.map((record) => `
        <article class="record-card">
          <span class="badge ${record.priority === "alta" ? "red" : "blue"}">${record.priority}</span>
          <h3>${record.title}</h3>
          <p class="meta">${petName(record.petId)} - ${formatDate(record.date)} - ${record.kind}</p>
          <dl class="record-details">
            <dt>Peso</dt><dd>${record.weight || "-"}</dd>
            <dt>Vermifugo</dt><dd>${record.deworming || "-"}</dd>
            <dt>Receita</dt><dd>${record.prescription || "-"}</dd>
            <dt>Internamento</dt><dd>${record.hospitalization || "Nao"}</dd>
          </dl>
          <p>${record.notes}</p>
        </article>`).join("") || emptyBlock("Nenhum prontuario clinico cadastrado.")}
    </section>
  `;
}

function petsTemplate(user) {
  if (user.role === "admin") return petHotelTemplate(user);
  const pets = filterItems(petsForUser(user), (pet) => `${pet.name} ${pet.breed} ${ownerName(pet.ownerId)} ${pet.temperament} ${pet.allergies}`);
  return `
    <div class="section-title">
      <div><h2>Caes cadastrados</h2><p class="subtitle">Dados principais de cada cachorro hospedado ou atendido.</p></div>
      <button class="btn" data-modal="pet">Novo cao</button>
    </div>
    <section class="content-grid">
      ${pets.map((pet) => petCard(pet, user)).join("") || emptyBlock("Nenhum cachorro cadastrado ainda.")}
    </section>
  `;
}

function petHotelTemplate(user) {
  const appointments = filterItems(weekAppointments(), (item) => `${petName(item.petId)} ${ownerName(item.ownerId)} ${serviceLabel(item.service)} ${item.status} ${item.notes}`);
  const petIds = [...new Set(appointments.map((item) => item.petId))];
  const pets = petIds.map((id) => state.pets.find((pet) => pet.id === id)).filter(Boolean);
  const selectedPet = state.pets.find((pet) => pet.id === selectedPetId) || pets[0] || state.pets[0];
  selectedPetId = selectedPet?.id || null;
  const selectedAppointments = selectedPet ? petAppointments(selectedPet.id) : [];
  const weekSelected = selectedAppointments.filter(isAppointmentInWeek);
  const hotelCount = appointments.filter((item) => item.service === "hotel").length;
  const groomingCount = appointments.filter((item) => ["banho", "tosa", "banho_tosa"].includes(item.service)).length;
  const confirmed = appointments.filter((item) => item.status === "confirmado").length;
  const { start, end } = weekRange();

  return `
    <div class="section-title">
      <div>
        <h2>Hotel da semana</h2>
        <p class="subtitle">Caes com reservas e servicos entre ${shortDate(start.toISOString().slice(0, 10))} e ${shortDate(end.toISOString().slice(0, 10))}. Clique em um cachorro para abrir o quarto.</p>
      </div>
      <button class="btn" data-modal="pet">Novo cao</button>
    </div>
    <section class="stats compact">
      ${statCard("Caes na semana", pets.length, "rgba(244, 127, 107, .18)")}
      ${statCard("Hospedagens", hotelCount, "rgba(41, 188, 135, .16)")}
      ${statCard("Banho e tosa", groomingCount, "rgba(232, 185, 73, .2)")}
      ${statCard("Confirmados", confirmed, "rgba(79, 141, 247, .16)")}
    </section>
    <section class="hotel-board">
      <div class="kennel-map">
        ${pets.map((pet, index) => hotelPetCard(pet, appointments.filter((item) => item.petId === pet.id), index)).join("") || emptyBlock("Nenhum cachorro agendado nesta semana.")}
      </div>
      <aside class="pet-suite">
        ${selectedPet ? petSuite(selectedPet, weekSelected, selectedAppointments, user) : emptyBlock("Selecione um cachorro para ver detalhes.")}
      </aside>
    </section>
  `;
}

function hotelPetCard(pet, appointments, index) {
  const next = appointments[0];
  const isActive = selectedPetId === pet.id;
  const tones = ["room-aqua", "room-coral", "room-gold", "room-blue"];
  return `
    <button class="hotel-pet ${tones[index % tones.length]} ${isActive ? "active" : ""}" data-select-pet="${pet.id}">
      <span class="room-number">Suite ${String(index + 1).padStart(2, "0")}</span>
      <span class="pet-bubble">${petInitials(pet.name)}</span>
      <strong>${pet.name}</strong>
      <span>${pet.breed || "Sem raca"} - ${ownerName(pet.ownerId)}</span>
      <small>${next ? `${serviceLabel(next.service)} em ${shortDate(next.start)} as ${next.time}` : "Sem agenda na semana"}</small>
      <span class="badge ${next?.status === "confirmado" ? "blue" : "gold"}">${next?.status || "livre"}</span>
    </button>
  `;
}

function petSuite(pet, weekItems, allItems, user) {
  const records = state.vetRecords.filter((record) => record.petId === pet.id);
  const vaccines = state.vaccines.filter((item) => item.petId === pet.id);
  const current = weekItems[0] || allItems[0];
  return `
    <div class="suite-hero">
      <div class="pet-bubble large">${petInitials(pet.name)}</div>
      <div>
        <span class="badge ${current?.status === "confirmado" ? "blue" : "gold"}">${current?.status || "sem agenda"}</span>
        <h3>${pet.name}</h3>
        <p>${pet.breed || "Sem raca"} - ${ownerName(pet.ownerId)}</p>
      </div>
    </div>
    <dl class="suite-facts">
      <dt>Idade</dt><dd>${pet.age || "-"}</dd>
      <dt>Peso</dt><dd>${pet.weight || "-"}</dd>
      <dt>Temperamento</dt><dd>${pet.temperament || "-"}</dd>
      <dt>Alergias</dt><dd>${pet.allergies || "-"}</dd>
      <dt>Alimentacao</dt><dd>${pet.food || "-"}</dd>
    </dl>
    <div class="suite-section">
      <h4>Agenda da semana</h4>
      <div class="timeline">
        ${weekItems.map((item) => `
          <div class="timeline-item">
            <span>${shortDate(item.start)}<br>${item.time}</span>
            <div><strong>${serviceLabel(item.service)}</strong><small>${item.packageName || item.notes || "Sem observacao"} - ${currency(item.price)}</small></div>
            ${statusBadge(item.status)}
          </div>
        `).join("") || emptySmall("Sem eventos nesta semana.")}
      </div>
    </div>
    <div class="suite-section">
      <h4>Cuidados inteligentes</h4>
      <div class="care-chips">
        <span>${records.length} obs. saude</span>
        <span>${vaccines.length} vacina(s)</span>
        <span>${allItems.length} visita(s)</span>
      </div>
    </div>
    <div class="actions">
      <button class="btn secondary" data-modal="vet" data-pet="${pet.id}">Obs. vet</button>
      <button class="btn secondary" data-modal="vaccine" data-pet="${pet.id}">Vacina</button>
    </div>
  `;
}

function petCard(pet, user) {
  return `
    <article class="pet-card">
      <div class="pet-head">
        <div class="avatar">BP</div>
        <div><h3>${pet.name}</h3><span class="meta">${pet.breed} - ${ownerName(pet.ownerId)}</span></div>
      </div>
      <dl>
        <dt>Idade</dt><dd>${pet.age || "-"}</dd>
        <dt>Peso</dt><dd>${pet.weight || "-"}</dd>
        <dt>Temperamento</dt><dd>${pet.temperament || "-"}</dd>
        <dt>Alergias</dt><dd>${pet.allergies || "-"}</dd>
        <dt>Alimentacao</dt><dd>${pet.food || "-"}</dd>
      </dl>
      <div class="actions">
        <button class="btn secondary" data-modal="appointment" data-pet="${pet.id}">Agendar</button>
        ${user.role === "admin" ? `<button class="btn secondary" data-modal="vet" data-pet="${pet.id}">Obs. vet</button>` : ""}
        <button class="btn secondary" data-modal="vaccine" data-pet="${pet.id}">Vacina</button>
      </div>
    </article>
  `;
}

function vetTemplate(user) {
  if (user.role !== "admin") return dashboardTemplate(user);
  const records = filterItems(state.vetRecords, (record) => `${petName(record.petId)} ${record.title} ${record.kind} ${record.notes}`);
  return `
    <div class="section-title">
      <div><h2>Area veterinaria</h2><p class="subtitle">Observacoes internas sobre remedios, alergias e cuidados especiais.</p></div>
      <button class="btn" data-modal="vet">Nova observacao</button>
    </div>
    <section class="content-grid">
      ${records.map((record) => `
        <article class="record-card">
          <span class="badge ${record.priority === "alta" ? "red" : "blue"}">${record.priority}</span>
          <h3>${record.title}</h3>
          <p class="meta">${petName(record.petId)} - ${formatDate(record.date)} - ${record.kind}</p>
          <p>${record.notes}</p>
        </article>`).join("") || emptyBlock("Nenhuma observacao veterinaria.")}
    </section>
  `;
}

function vaccinesTemplate(user) {
  const petIds = petsForUser(user).map((pet) => pet.id);
  const vaccines = filterItems(state.vaccines.filter((item) => petIds.includes(item.petId)), (item) => `${petName(item.petId)} ${item.name} ${item.fileName}`);
  return `
    <div class="section-title">
      <div><h2>Carteira de vacina</h2><p class="subtitle">Registro de vacinas e anexos da carteira de cada cachorro.</p></div>
      <button class="btn" data-modal="vaccine">Adicionar vacina</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Pet</th><th>Vacina</th><th>Aplicacao</th><th>Validade</th><th>Arquivo</th><th>Acoes</th></tr></thead>
        <tbody>${vaccines.map((item) => `
          <tr>
            <td><strong>${petName(item.petId)}</strong></td>
            <td>${item.name}</td>
            <td>${formatDate(item.date)}</td>
            <td>${formatDate(item.expires)}</td>
            <td>${item.fileName || "Sem anexo"}</td>
            <td><button class="btn secondary" data-delete-vaccine="${item.id}">Remover</button></td>
          </tr>`).join("") || `<tr><td colspan="6">${emptySmall("Nenhuma vacina cadastrada.")}</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function usersTemplate(user) {
  if (user.role !== "admin") return dashboardTemplate(user);
  const users = filterItems(state.users, (item) => `${item.name} ${item.email} ${item.phone} ${item.role}`);
  return `
    <div class="section-title">
      <div><h2>Usuarios</h2><p class="subtitle">Crie logins para tutores e equipe administrativa.</p></div>
      <button class="btn" data-modal="user">Novo usuario</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Nome</th><th>Email</th><th>Telefone</th><th>Perfil</th><th>Pets</th><th>Acoes</th></tr></thead>
        <tbody>${users.map((item) => `
          <tr>
            <td><strong>${item.name}</strong></td>
            <td>${item.email}</td>
            <td>${item.phone || "-"}</td>
            <td><span class="badge ${item.role === "admin" ? "blue" : ""}">${item.role}</span></td>
            <td>${state.pets.filter((pet) => pet.ownerId === item.id).length}</td>
            <td>${item.id !== user.id ? `<button class="btn secondary" data-delete-user="${item.id}">Remover</button>` : ""}</td>
          </tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function filterItems(items, textFactory) {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return items;
  return items.filter((item) => textFactory(item).toLowerCase().includes(term));
}

function emptyBlock(text) {
  return `<div class="empty">${text}</div>`;
}

function emptySmall(text) {
  return `<div class="empty">${text}</div>`;
}

function bindAuth() {
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById("auth-form").innerHTML = button.dataset.authTab === "login" ? loginForm() : registerForm();
      document.querySelectorAll("[data-auth-tab]").forEach((tab) => tab.classList.toggle("active", tab === button));
      bindAuthForms();
    });
  });
  bindAuthForms();
}

function bindAuthForms() {
  document.getElementById("login-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const user = state.users.find((item) => item.email.toLowerCase() === data.email.toLowerCase() && item.password === data.password);
    if (!user) return toast("Email ou senha incorretos.");
    setSession(user);
    toast("Login realizado.");
  });

  document.getElementById("register-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    if (state.users.some((item) => item.email.toLowerCase() === data.email.toLowerCase())) return toast("Este email ja esta cadastrado.");
    const user = { id: uid("u"), name: data.name, email: data.email, password: data.password, phone: data.phone, role: "cliente" };
    state.users.push(user);
    saveState();
    setSession(user);
    toast("Conta criada.");
  });
}

function bindApp(user) {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      view = button.dataset.view;
      modal = null;
      render();
    });
  });

  document.getElementById("logout").addEventListener("click", () => setSession(null));
  document.getElementById("search").addEventListener("input", (event) => {
    searchTerm = event.target.value;
    document.getElementById("view").innerHTML = viewTemplate(user);
    bindApp(user);
  });

  document.querySelectorAll("[data-modal]").forEach((button) => {
    button.addEventListener("click", () => openModal(button.dataset.modal, { petId: button.dataset.pet, service: button.dataset.service }));
  });

  document.querySelectorAll("[data-select-pet]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedPetId = button.dataset.selectPet;
      render();
    });
  });

  document.querySelectorAll("[data-appointment-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.appointments.find((appointment) => appointment.id === button.dataset.id);
      item.status = button.dataset.appointmentAction;
      if (item.status === "confirmado" && !item.price) item.price = priceForService(item.service);
      saveState();
      render();
    });
  });

  document.getElementById("pricing-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    pricingItems().forEach(([key, label, unit]) => {
      if (key === "hotel") {
        const smallPrice = Number(data.hotelSmall || 100);
        const largePrice = Number(data.hotelLarge || 120);
        state.pricing[key] = { label, unit, price: smallPrice, smallPrice, largePrice };
        return;
      }
      state.pricing[key] = { label, unit, price: Number(data[key] || 0) };
    });
    saveState();
    toast("Valores salvos.");
    render();
  });

  document.querySelectorAll("[data-grooming-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.appointments.find((appointment) => appointment.id === button.dataset.groomingStep);
      const next = { agendado: "banho", banho: "secagem", secagem: "tosa", tosa: "finalizado", finalizado: "agendado" };
      item.step = next[item.step || "agendado"] || "agendado";
      item.status = item.step === "finalizado" ? "atendido" : "confirmado";
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-delete-vaccine]").forEach((button) => {
    button.addEventListener("click", () => {
      state.vaccines = state.vaccines.filter((item) => item.id !== button.dataset.deleteVaccine);
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-delete-user]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.deleteUser;
      state.users = state.users.filter((item) => item.id !== id);
      state.pets = state.pets.filter((item) => item.ownerId !== id);
      state.appointments = state.appointments.filter((item) => item.ownerId !== id);
      saveState();
      render();
    });
  });
}

function openModal(type, payload = {}) {
  modal = { type, payload };
  const user = currentUser();
  if (user.role !== "admin" && ["vet", "user", "clinic"].includes(type)) {
    toast("Esta area e exclusiva do administrador.");
    return;
  }
  const existing = document.querySelector(".modal-backdrop");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", modalTemplate(type, payload, user));
  bindModal(type, payload, user);
}

function closeModal() {
  modal = null;
  document.querySelector(".modal-backdrop")?.remove();
}

function modalTemplate(type, payload, user) {
  const titles = { appointment: "Novo agendamento", grooming: "Novo banho/tosa", clinic: "Nova ficha clinica", pet: "Novo cao", vet: "Observacao veterinaria", vaccine: "Carteira de vacina", user: "Novo usuario" };
  return `
    <div class="modal-backdrop">
      <section class="modal">
        <div class="modal-head">
          <h2>${titles[type]}</h2>
          <button class="btn ghost" id="close-modal">Fechar</button>
        </div>
        <div class="modal-body">${modalForm(type, payload, user)}</div>
      </section>
    </div>
  `;
}

function petOptions(user, selected) {
  return petsForUser(user).map((pet) => `<option value="${pet.id}" ${selected === pet.id ? "selected" : ""}>${pet.name} - ${ownerName(pet.ownerId)}</option>`).join("");
}

function ownerOptions(selected) {
  return state.users.filter((user) => user.role === "cliente").map((user) => `<option value="${user.id}" ${selected === user.id ? "selected" : ""}>${user.name}</option>`).join("");
}

function serviceOptions(user) {
  const services = [
    ["hotel", "Hotel"],
    ["banho", "Banho"],
    ["tosa", "Tosa"],
    ["banho_tosa", "Banho e tosa"]
  ];
  if (user.role === "admin") services.push(["veterinario", "Veterinario"]);
  return services.map(([value, label]) => `<option value="${value}">${label}${value === "veterinario" ? "" : ` - ${priceLabel(value)}`}</option>`).join("");
}

function modalForm(type, payload, user) {
  if (type === "grooming") {
    if (user.role !== "admin") {
      const selectedService = payload.service || "banho";
      const pets = petOptions(user, payload.petId);
      if (!pets) {
        return `
          <div class="empty compact-empty">
            Cadastre um cachorro antes de contratar banho e tosa.
            <button class="btn" type="button" data-switch-modal="pet">Cadastrar cachorro</button>
          </div>
        `;
      }
      return `
        <form class="form-grid" id="modal-form">
          <label class="field"><span>Pet</span><select name="petId" required>${pets}</select></label>
          <label class="field"><span>Servico</span><select name="service">
            <option value="banho" ${selectedService === "banho" ? "selected" : ""}>Banho - ${priceLabel("banho")}</option>
            <option value="tosa" ${selectedService === "tosa" ? "selected" : ""}>Tosa - ${priceLabel("tosa")}</option>
            <option value="banho_tosa" ${selectedService === "banho_tosa" ? "selected" : ""}>Banho e tosa - ${priceLabel("banho_tosa")}</option>
          </select></label>
          <div class="row">
            <label class="field"><span>Data</span><input name="start" type="date" required></label>
            <label class="field"><span>Horario</span><input name="time" type="time" value="09:00" required></label>
          </div>
          <label class="field"><span>Observacao para a equipe</span><textarea name="notes" placeholder="Ex: cuidado com alergia, tipo de tosa, comportamento no banho"></textarea></label>
          <button class="btn" type="submit">Enviar pedido</button>
        </form>
      `;
    }

    return `
      <form class="form-grid" id="modal-form">
        <label class="field"><span>Pet</span><select name="petId" required>${petOptions({ role: "admin" }, payload.petId)}</select></label>
        <div class="row">
          <label class="field"><span>Servico</span><select name="service"><option value="banho">Banho</option><option value="tosa">Tosa</option><option value="banho_tosa">Banho e tosa</option></select></label>
          <label class="field"><span>Etapa inicial</span><select name="step"><option value="agendado">Agendado</option><option value="banho">Banho</option><option value="secagem">Secagem</option><option value="tosa">Tosa</option><option value="finalizado">Finalizado</option></select></label>
        </div>
        <div class="row">
          <label class="field"><span>Data</span><input name="start" type="date" required></label>
          <label class="field"><span>Horario</span><input name="time" type="time" value="09:00" required></label>
        </div>
        <div class="row">
          <label class="field"><span>Pacote vendido</span><input name="packageName" placeholder="Ex: Banho + tosa bebe"></label>
          <label class="field"><span>Funcionario</span><input name="employee" placeholder="Nome do responsavel"></label>
        </div>
        <div class="row">
          <label class="field"><span>Valor</span><input name="price" type="number" min="0" step="0.01" placeholder="120"></label>
          <label class="field"><span>Comissao</span><input name="commission" type="number" min="0" step="0.01" placeholder="18"></label>
        </div>
        <label class="field"><span>Adicionais</span><input name="addons" placeholder="Shampoo especial, hidratacao, desembolo..."></label>
        <label class="field"><span>Feedback / historico</span><textarea name="feedback" placeholder="Preferencias do cliente e retorno sobre o servico"></textarea></label>
        <button class="btn" type="submit">Salvar banho/tosa</button>
      </form>
    `;
  }

  if (type === "clinic") {
    return `
      <form class="form-grid" id="modal-form">
        <label class="field"><span>Pet</span><select name="petId" required>${petOptions({ role: "admin" }, payload.petId)}</select></label>
        <div class="row">
          <label class="field"><span>Titulo da ficha</span><input name="title" required placeholder="Consulta, retorno, vacina, anamnese"></label>
          <label class="field"><span>Especialidade</span><select name="kind"><option value="consulta">Consulta</option><option value="anamnese">Anamnese</option><option value="vacina">Vacina</option><option value="remedio">Remedio</option><option value="internamento">Internamento</option></select></label>
        </div>
        <div class="row">
          <label class="field"><span>Data</span><input name="date" type="date" required></label>
          <label class="field"><span>Prioridade</span><select name="priority"><option value="normal">Normal</option><option value="alta">Alta</option></select></label>
        </div>
        <div class="row">
          <label class="field"><span>Peso</span><input name="weight" placeholder="Ex: 12 kg"></label>
          <label class="field"><span>Internamento</span><select name="hospitalization"><option value="Nao">Nao</option><option value="Sim">Sim</option></select></label>
        </div>
        <label class="field"><span>Controle de vermifugo</span><input name="deworming" placeholder="Em dia, aplicar em 30 dias..."></label>
        <label class="field"><span>Receituario / formulario</span><textarea name="prescription" placeholder="Medicamentos, doses, exames ou formularios"></textarea></label>
        <label class="field"><span>Prontuario e observacoes</span><textarea name="notes" required placeholder="Historico, sintomas, conduta e cuidados"></textarea></label>
        <button class="btn" type="submit">Salvar ficha clinica</button>
      </form>
    `;
  }

  if (type === "appointment") {
    const pets = petOptions(user, payload.petId);
    if (!pets) {
      return `
        <div class="empty compact-empty">
          Cadastre um cachorro antes de criar o agendamento.
          <button class="btn" type="button" data-switch-modal="pet">Cadastrar cachorro</button>
        </div>
      `;
    }
    return `
      <form class="form-grid" id="modal-form">
        <label class="field"><span>Pet</span><select name="petId" required>${pets}</select></label>
        <div class="row">
          <label class="field"><span>Servico</span><select name="service">${serviceOptions(user)}</select></label>
          <label class="field"><span>Horario</span><input name="time" type="time" value="09:00" required></label>
        </div>
        <div class="row">
          <label class="field"><span>Entrada ou data</span><input name="start" type="date" required></label>
          <label class="field"><span>Saida do hotel</span><input name="end" type="date"></label>
        </div>
        <label class="field"><span>Porte do cao para hospedagem</span><select name="dogSize"><option value="pequeno">Porte pequeno - ${currency(hotelDailyPrice("pequeno"))} a diaria</option><option value="grande">Porte grande - ${currency(hotelDailyPrice("grande"))} a diaria</option></select></label>
        ${user.role === "admin" ? `<label class="field"><span>Status</span><select name="status"><option value="agendado">Agendado</option><option value="confirmado">Confirmado</option><option value="atendido">Atendido</option></select></label>` : ""}
        <label class="field"><span>Observacao para a equipe</span><textarea name="notes" placeholder="Ex: horario de alimentacao, ansiedade, banho junto com hospedagem"></textarea></label>
        <button class="btn" type="submit">${user.role === "admin" ? "Salvar agendamento" : "Enviar pedido de agendamento"}</button>
      </form>
    `;
  }

  if (type === "pet") {
    return `
      <form class="form-grid" id="modal-form">
        ${user.role === "admin" ? `<label class="field"><span>Tutor</span><select name="ownerId">${ownerOptions(user.id)}</select></label>` : ""}
        <div class="row">
          <label class="field"><span>Nome do cao</span><input name="name" required></label>
          <label class="field"><span>Raca</span><input name="breed"></label>
        </div>
        <div class="row">
          <label class="field"><span>Idade</span><input name="age" placeholder="Ex: 3 anos"></label>
          <label class="field"><span>Peso</span><input name="weight" placeholder="Ex: 12 kg"></label>
        </div>
        <label class="field"><span>Temperamento</span><input name="temperament" placeholder="Calmo, agitado, medroso..."></label>
        <label class="field"><span>Alergias</span><input name="allergies"></label>
        <label class="field"><span>Alimentacao</span><textarea name="food"></textarea></label>
        <button class="btn" type="submit">Cadastrar cao</button>
      </form>
    `;
  }

  if (type === "vet") {
    return `
      <form class="form-grid" id="modal-form">
        <label class="field"><span>Pet</span><select name="petId" required>${petOptions({ role: "admin" }, payload.petId)}</select></label>
        <div class="row">
          <label class="field"><span>Titulo</span><input name="title" required placeholder="Medicacao, alergia, cuidado especial"></label>
          <label class="field"><span>Tipo</span><select name="kind"><option value="observacao">Observacao</option><option value="remedio">Remedio</option><option value="alimentacao">Alimentacao</option><option value="alerta">Alerta</option></select></label>
        </div>
        <div class="row">
          <label class="field"><span>Data</span><input name="date" type="date" required></label>
          <label class="field"><span>Prioridade</span><select name="priority"><option value="normal">Normal</option><option value="alta">Alta</option></select></label>
        </div>
        <label class="field"><span>Observacoes</span><textarea name="notes" required></textarea></label>
        <button class="btn" type="submit">Salvar observacao</button>
      </form>
    `;
  }

  if (type === "vaccine") {
    return `
      <form class="form-grid" id="modal-form">
        <label class="field"><span>Pet</span><select name="petId" required>${petOptions(user, payload.petId)}</select></label>
        <label class="field"><span>Nome da vacina</span><input name="name" required placeholder="V10, raiva, gripe..."></label>
        <div class="row">
          <label class="field"><span>Aplicacao</span><input name="date" type="date" required></label>
          <label class="field"><span>Validade</span><input name="expires" type="date"></label>
        </div>
        <label class="field"><span>Arquivo da carteira</span><input name="file" type="file" accept="image/*,.pdf"></label>
        <button class="btn" type="submit">Salvar vacina</button>
      </form>
    `;
  }

  return `
    <form class="form-grid" id="modal-form">
      <label class="field"><span>Nome</span><input name="name" required></label>
      <label class="field"><span>Email</span><input name="email" type="email" required></label>
      <div class="row">
        <label class="field"><span>Telefone</span><input name="phone"></label>
        <label class="field"><span>Perfil</span><select name="role"><option value="cliente">Tutor</option><option value="admin">Admin</option></select></label>
      </div>
      <label class="field"><span>Senha inicial</span><input name="password" type="password" minlength="6" required></label>
      <button class="btn" type="submit">Criar usuario</button>
    </form>
  `;
}

function bindModal(type, payload, user) {
  document.getElementById("close-modal").addEventListener("click", closeModal);
  document.querySelector(".modal-backdrop").addEventListener("click", (event) => {
    if (event.target.className === "modal-backdrop") closeModal();
  });

  document.querySelectorAll("[data-switch-modal]").forEach((button) => {
    button.addEventListener("click", () => openModal(button.dataset.switchModal, payload));
  });

  const modalFormEl = document.getElementById("modal-form");
  if (!modalFormEl) return;

  modalFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    const data = Object.fromEntries(new FormData(form));

    if (type === "grooming") {
      const pet = state.pets.find((item) => item.id === data.petId);
      const price = user.role === "admin" ? Number(data.price || 0) : priceForService(data.service);
      const commission = data.commission ? Number(data.commission) : Math.round(price * 0.15 * 100) / 100;
      state.appointments.push({
        id: uid("a"),
        petId: data.petId,
        ownerId: pet.ownerId,
        service: data.service,
        start: data.start,
        end: data.start,
        time: data.time,
        status: user.role === "admin" ? (data.step === "finalizado" ? "atendido" : "confirmado") : "agendado",
        notes: user.role === "admin" ? data.feedback : data.notes,
        price,
        employee: user.role === "admin" ? data.employee : "",
        step: user.role === "admin" ? data.step : "agendado",
        packageName: user.role === "admin" ? data.packageName : serviceLabel(data.service),
        addons: user.role === "admin" ? data.addons : "",
        commission: user.role === "admin" ? commission : 0,
        feedback: user.role === "admin" ? data.feedback : data.notes
      });
      toast(user.role === "admin" ? "Banho/tosa salvo." : "Pedido enviado para o admin.");
    }

    if (type === "clinic") {
      const pet = state.pets.find((item) => item.id === data.petId);
      state.vetRecords.push({
        id: uid("v"),
        petId: data.petId,
        title: data.title,
        kind: data.kind,
        date: data.date,
        priority: data.priority,
        notes: data.notes,
        weight: data.weight,
        deworming: data.deworming,
        prescription: data.prescription,
        hospitalization: data.hospitalization
      });
      state.appointments.push({
        id: uid("a"),
        petId: data.petId,
        ownerId: pet.ownerId,
        service: "veterinario",
        start: data.date,
        end: data.date,
        time: "09:00",
        status: data.kind === "internamento" ? "confirmado" : "agendado",
        notes: data.title,
        price: 0,
        employee: "Clinica",
        step: data.kind,
        packageName: data.title,
        addons: data.prescription,
        commission: 0
      });
      toast("Ficha clinica salva.");
    }

    if (type === "appointment") {
      const pet = state.pets.find((item) => item.id === data.petId);
      const price = data.service === "veterinario" ? 0 : appointmentPrice(data.service, data.start, data.end || data.start, data.dogSize);
      const dogSizeNote = data.service === "hotel" ? `Porte ${data.dogSize}. ${daysBetween(data.start, data.end || data.start)} diaria(s).` : "";
      state.appointments.push({
        id: uid("a"),
        petId: data.petId,
        ownerId: pet.ownerId,
        service: data.service,
        start: data.start,
        end: data.end || data.start,
        time: data.time,
        status: data.status || "agendado",
        notes: [dogSizeNote, data.notes].filter(Boolean).join(" "),
        price,
        employee: "",
        step: "agendado",
        packageName: data.service === "hotel" ? `Hospedagem - porte ${data.dogSize}` : serviceLabel(data.service),
        addons: dogSizeNote,
        commission: 0,
        feedback: data.notes
      });
      toast("Agendamento salvo.");
    }

    if (type === "pet") {
      state.pets.push({
        id: uid("p"),
        ownerId: data.ownerId || user.id,
        name: data.name,
        breed: data.breed,
        age: data.age,
        weight: data.weight,
        temperament: data.temperament,
        allergies: data.allergies,
        food: data.food
      });
      toast("Cao cadastrado.");
    }

    if (type === "vet") {
      state.vetRecords.push({ id: uid("v"), petId: data.petId, title: data.title, kind: data.kind, date: data.date, priority: data.priority, notes: data.notes });
      toast("Observacao salva.");
    }

    if (type === "vaccine") {
      state.vaccines.push({ id: uid("vac"), petId: data.petId, name: data.name, date: data.date, expires: data.expires, fileName: form.file.files[0]?.name || "" });
      toast("Vacina cadastrada.");
    }

    if (type === "user") {
      if (state.users.some((item) => item.email.toLowerCase() === data.email.toLowerCase())) return toast("Este email ja existe.");
      state.users.push({ id: uid("u"), name: data.name, email: data.email, password: data.password, phone: data.phone, role: data.role });
      toast("Usuario criado.");
    }

    saveState();
    closeModal();
    render();
  });
}

render();
