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
  admin: ["dashboard", "clinic", "pets"],
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
    record.hospitalizationName ||= "";
    record.hospitalizationTime ||= "";
    record.medication ||= "";
    record.complaint ||= record.notes || "";
    record.vitals ||= "";
    record.diagnosis ||= "";
    record.conduct ||= record.prescription || "";
    record.returnDate ||= "";
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
  const user = state.users.find((item) => item.id === session?.id);
  return user?.role === "admin" ? user : null;
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

function hotelAdminAppointments() {
  return state.appointments.filter((item) => !["banho", "tosa", "banho_tosa"].includes(item.service));
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

function todayDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
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

function hotelAppointments() {
  return state.appointments
    .filter((item) => item.service === "hotel")
    .sort((a, b) => `${a.start}${a.time}`.localeCompare(`${b.start}${b.time}`));
}

function currentHotelStay(petId) {
  const today = todayDate();
  return hotelAppointments().find((item) => {
    if (item.petId !== petId || item.status === "recusado") return false;
    return dateOnly(item.start) <= today && dateOnly(item.end || item.start) >= today;
  });
}

function nextHotelStay(petId) {
  const today = todayDate();
  return hotelAppointments().find((item) => item.petId === petId && item.status !== "recusado" && dateOnly(item.start) > today);
}

function lastHotelStay(petId) {
  const today = todayDate();
  return [...hotelAppointments()].reverse().find((item) => item.petId === petId && dateOnly(item.end || item.start) < today);
}

function hotelStayStatus(petId) {
  const current = currentHotelStay(petId);
  if (current) return { label: "hospedado", tone: "blue", stay: current };
  const next = nextHotelStay(petId);
  if (next) return { label: "vai chegar", tone: "gold", stay: next };
  const last = lastHotelStay(petId);
  if (last) return { label: "saiu", tone: "red", stay: last };
  return { label: "sem hospedagem", tone: "", stay: null };
}

function hotelAppointmentStatus(item) {
  if (!item || item.status === "recusado") return { label: item?.status || "sem hospedagem", tone: "red" };
  const today = todayDate();
  if (dateOnly(item.start) <= today && dateOnly(item.end || item.start) >= today) return { label: "hospedado", tone: "blue" };
  if (dateOnly(item.start) > today) return { label: "vai chegar", tone: "gold" };
  return { label: "saiu", tone: "red" };
}

function vaccineStatus(item) {
  if (!item.expires) return { label: "sem validade", tone: "" };
  const today = todayDate();
  const limit = new Date(today);
  limit.setUTCMonth(limit.getUTCMonth() + 2);
  const expires = dateOnly(item.expires);
  if (expires < today) return { label: "vencida", tone: "red" };
  if (expires <= limit) return { label: "vence breve", tone: "gold" };
  return { label: "em dia", tone: "blue" };
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
          <h1>Gestao interna do hotel pet.</h1>
          <p>Controle os caes hospedados, observacoes, saude, vacinas e internacoes em uma operacao simples para a equipe.</p>
        </div>
      </section>
      <section class="auth-panel">
        <div class="auth-card">
          <h2>Acessar administracao</h2>
          <p class="subtitle">Painel exclusivo para a equipe do Hotel Beach Pet.</p>
          <div id="auth-form">${loginForm()}</div>
          <div class="demo-logins">
            <strong>Acesso de teste</strong>
            <span>Admin: admin@hotelbeachpet.com / admin123</span>
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
          ${user.role === "admin" ? "" : navButton("appointments", "Agendar")}
          ${user.role === "admin" ? "" : navButton("grooming", "Banho e Tosa")}
          ${user.role === "admin" ? navButton("clinic", "Saude") : ""}
          ${navButton("pets", user.role === "admin" ? "Hotel" : "Meus caes")}
          ${user.role === "admin" ? "" : navButton("vaccines", "Carteira de vacina")}
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
    clinic: clinicTemplate,
    pets: petsTemplate,
    vet: vetTemplate,
    vaccines: vaccinesTemplate
  };
  return (templates[view] || dashboardTemplate)(user);
}

function dashboardTemplate(user) {
  const appointments = user.role === "admin" ? hotelAdminAppointments() : appointmentsForUser(user);
  const clinic = clinicAppointments();
  const week = weekAppointments();
  const weekPets = [...new Set(week.map((item) => item.petId))].length;
  const pending = appointments.filter((item) => item.status === "agendado");
  const confirmed = appointments.filter((item) => item.status === "confirmado").length;
  const upcoming = [...appointments].filter((item) => item.status !== "recusado").sort((a, b) => `${a.start}${a.time}`.localeCompare(`${b.start}${b.time}`)).slice(0, 5);
  const hospitalized = state.vetRecords.filter((item) => item.kind === "internamento" || String(item.hospitalization || "").toLowerCase().includes("sim")).length;
  const vaccineLimit = new Date();
  vaccineLimit.setMonth(vaccineLimit.getMonth() + 6);
  const vaccineAlerts = state.vaccines.filter((item) => item.expires && new Date(`${item.expires}T00:00:00Z`) <= vaccineLimit).slice(0, 4);

  return `
    <div class="section-title">
      <div>
        <h2>Painel de operacao</h2>
        <p class="subtitle">O essencial para gerir chegadas do hotel, rotina dos caes e cuidados de saude.</p>
      </div>
      <div class="actions inline-actions">
        <button class="btn" data-view="pets">Ver hotel</button>
        <button class="btn secondary" data-modal="appointment">Nova hospedagem</button>
      </div>
    </div>
    <section class="stats">
      ${statCard("Pedidos pendentes", pending.length, "rgba(232, 185, 73, .2)")}
      ${statCard("Caes no hotel", weekPets, "rgba(244, 127, 107, .18)")}
      ${statCard("Confirmados", confirmed, "rgba(79, 141, 247, .16)")}
      ${statCard("Internacoes", hospitalized, "rgba(228, 87, 99, .16)")}
    </section>
    <section class="ops-grid">
      <div class="panel priority-panel">
        <div class="panel-head">
          <h3>Pedidos para aceitar</h3>
          <button class="btn secondary" data-view="pets">Abrir hotel</button>
        </div>
        <div class="list">${pending.slice(0, 4).map((item) => `
          <div class="decision-item">
            <div><strong>${petName(item.petId)} - ${serviceLabel(item.service)}</strong><span>${ownerName(item.ownerId)} - ${formatDate(item.start)} ${item.time}</span></div>
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
          <h3>Rotina em movimento</h3>
          <button class="btn secondary" data-view="pets">Hotel</button>
        </div>
        <div class="list">
          ${procedureRow("Hotel", appointments.filter((item) => item.service === "hotel").length, "gold")}
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
      <div class="panel operations-panel">
        <div class="panel-head">
          <h3>Atalhos da operacao</h3>
        </div>
        <div class="quick-actions">
          <button class="quick-action" data-modal="pet"><strong>Novo cao</strong><span>Cadastrar tutor e pet</span></button>
          <button class="quick-action" data-modal="appointment"><strong>Hospedagem</strong><span>Cadastrar chegada</span></button>
          <button class="quick-action" data-modal="hospitalization"><strong>Internacao</strong><span>Remedio, horario e cuidado</span></button>
        </div>
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
  const emptyColspan = user.role === "admin" ? 7 : 5;

  return `
    <div class="section-title">
      <div>
        <h2>${user.role === "admin" ? "Pedidos de agendamento" : "Agendar meu cachorro"}</h2>
        <p class="subtitle">${user.role === "admin" ? "Crie reservas, aceite pedidos e acompanhe cada servico do hotel." : "Escolha o cachorro, a data e contrate hotel, banho ou tosa."}</p>
      </div>
      <button class="btn" data-modal="appointment">Novo agendamento</button>
    </div>
    <section class="stats compact">
      ${statCard(user.role === "admin" ? "Aguardando confirmacao" : "Pedidos enviados", pending, "rgba(232, 185, 73, .2)")}
      ${statCard("Confirmados", confirmed, "rgba(79, 141, 247, .16)")}
      ${user.role === "admin" ? statCard("Recusados", rejected, "rgba(228, 87, 99, .16)") : statCard("Hotel", hotel, "rgba(41, 188, 135, .16)")}
      ${statCard("Banho e tosa", grooming, "rgba(244, 127, 107, .18)")}
    </section>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Pet</th>${user.role === "admin" ? "<th>Tutor</th>" : ""}<th>Servico</th><th>Data</th><th>Status</th><th>Observacao</th>${user.role === "admin" ? "<th>Acoes</th>" : ""}</tr></thead>
        <tbody>${items.map((item) => `
          <tr>
            <td><strong>${petName(item.petId)}</strong></td>
            ${user.role === "admin" ? `<td>${ownerName(item.ownerId)}</td>` : ""}
            <td>${serviceLabel(item.service)}</td>
            <td>${formatDate(item.start)} ${item.end !== item.start ? `ate ${formatDate(item.end)}` : ""}<br><span class="meta">${item.time}</span></td>
            <td>${statusBadge(item.status)}</td>
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
        <p>O pedido entra direto na rotina da equipe para aceite e acompanhamento.</p>
      </div>
      <div class="module-list">
        <span>Pedido enviado direto para o admin</span>
        <span>Status acompanhado na sua conta</span>
      </div>
    </section>
    <section class="service-grid">
      ${services.map(([key, label, unit]) => `
        <article class="service-card">
          <span class="badge gold">${unit}</span>
          <h3>${label}</h3>
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
        <thead><tr><th>Pet</th><th>Servico</th><th>Data</th><th>Status</th><th>Observacao</th></tr></thead>
        <tbody>${myRequests.map((item) => `
          <tr>
            <td><strong>${petName(item.petId)}</strong></td>
            <td>${serviceLabel(item.service)}</td>
            <td>${formatDate(item.start)}<br><span class="meta">${item.time}</span></td>
            <td>${statusBadge(item.status)}</td>
            <td>${item.notes || "-"}</td>
          </tr>`).join("") || `<tr><td colspan="5">${emptySmall("Voce ainda nao contratou banho e tosa.")}</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function groomingTemplate(user) {
  if (user.role !== "admin") return clientGroomingTemplate(user);
  const items = filterItems(groomingAppointments(), (item) => `${petName(item.petId)} ${ownerName(item.ownerId)} ${item.employee} ${item.packageName} ${item.addons} ${item.feedback}`);
  const active = items.filter((item) => item.status !== "atendido" && item.status !== "faltou").length;
  const packages = items.filter((item) => item.packageName).length;
  const finished = items.filter((item) => item.step === "finalizado" || item.status === "atendido").length;

  return `
    <div class="section-title">
      <div>
        <h2>Banho e Tosa</h2>
        <p class="subtitle">Agendamento, pacotes, etapas, adicionais, funcionario e historico do servico.</p>
      </div>
      <button class="btn" data-modal="grooming">Novo banho/tosa</button>
    </div>
    <section class="module-hero grooming-hero">
      <div>
        <span class="module-kicker">Modulo operacional</span>
        <h3>Produtividade real da equipe de banho e tosa.</h3>
        <p>Controle cada servico desde o agendamento ate a finalizacao, com responsavel e historico visiveis para a equipe.</p>
      </div>
      <div class="module-list">
        <span>Agendamento e etapas do servico</span>
        <span>Venda e controle de pacotes</span>
        <span>Adicionais e funcionario responsavel</span>
        <span>Historico com feedback do cliente</span>
      </div>
    </section>
    <section class="stats compact">
      ${statCard("Servicos ativos", active, "rgba(232, 185, 73, .2)")}
      ${statCard("Pacotes vendidos", packages, "rgba(79, 141, 247, .16)")}
      ${statCard("Finalizados", finished, "rgba(41, 188, 135, .16)")}
      ${statCard("Na fila", items.filter((item) => item.status === "agendado").length, "rgba(244, 127, 107, .18)")}
    </section>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Pet</th><th>Pacote</th><th>Data</th><th>Etapa</th><th>Funcionario</th><th>Adicionais</th><th>Acoes</th></tr></thead>
        <tbody>${items.map((item) => `
          <tr>
            <td><strong>${petName(item.petId)}</strong><br><span class="meta">${ownerName(item.ownerId)}</span></td>
            <td>${item.packageName || serviceLabel(item.service)}<br><span class="meta">${item.feedback || "Sem feedback"}</span></td>
            <td>${formatDate(item.start)}<br><span class="meta">${item.time}</span></td>
            <td><span class="badge ${item.step === "finalizado" ? "blue" : "gold"}">${item.step || "agendado"}</span></td>
            <td>${item.employee || "-"}</td>
            <td>${item.addons || "-"}</td>
            <td><button class="btn secondary" data-grooming-step="${item.id}">Proxima etapa</button></td>
          </tr>`).join("") || `<tr><td colspan="7">${emptySmall("Nenhum servico de banho e tosa cadastrado.")}</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function clinicTemplate(user) {
  if (user.role !== "admin") return appointmentsTemplate(user);
  const consultations = filterItems(clinicAppointments(), (item) => `${petName(item.petId)} ${ownerName(item.ownerId)} ${item.employee} ${item.notes}`);
  const records = filterItems(state.vetRecords, (record) => `${petName(record.petId)} ${record.title} ${record.kind} ${record.notes} ${record.weight} ${record.deworming} ${record.prescription} ${record.complaint} ${record.vitals} ${record.diagnosis} ${record.conduct}`);
  const stays = records.filter((item) => item.kind === "internamento" || String(item.hospitalization || "").toLowerCase().includes("sim"));
  const vaccineLimit = new Date();
  vaccineLimit.setMonth(vaccineLimit.getMonth() + 6);
  const vaccineAlerts = state.vaccines.filter((item) => item.expires && new Date(`${item.expires}T00:00:00Z`) <= vaccineLimit).length;
  const hospitalizations = stays.length;
  const attention = records.filter((item) => item.priority === "alta" || item.kind === "internamento" || String(item.hospitalization || "").toLowerCase().includes("sim"));
  const medicationList = records.filter((item) => item.medication || item.prescription || item.kind === "remedio" || item.kind === "internamento");
  const vaccineItems = [...state.vaccines].sort((a, b) => (a.expires || "9999").localeCompare(b.expires || "9999"));

  return `
    <div class="section-title">
      <div>
        <h2>Saude do pet</h2>
        <p class="subtitle">Clinica, veterinario, observacoes, prontuario e vacinas em uma unica area.</p>
      </div>
      <div class="actions inline-actions">
        <button class="btn" data-modal="clinic">Nova ficha</button>
        <button class="btn secondary" data-modal="hospitalization">Internacao</button>
        <button class="btn secondary" data-modal="vet">Obs. veterinaria</button>
        <button class="btn secondary" data-modal="vaccine">Vacina</button>
      </div>
    </div>
    <section class="module-hero clinic-hero">
      <div>
        <span class="module-kicker">Rotina veterinaria</span>
        <h3>O que exige atencao fica primeiro.</h3>
        <p>Controle triagem, sinais vitais, conduta, medicacao, internacao, retorno e vacinas em uma unica area.</p>
      </div>
      <div class="module-list">
        <span>Queixa, exame e conduta</span>
        <span>Medicacoes e horarios de cuidado</span>
        <span>Internacoes com acompanhamento</span>
        <span>Vacinas vencidas ou proximas</span>
      </div>
    </section>
    <section class="stats compact">
      ${statCard("Pacientes em atencao", attention.length, "rgba(228, 87, 99, .16)")}
      ${statCard("Prontuarios", records.length, "rgba(41, 188, 135, .16)")}
      ${statCard("Alertas de vacina", vaccineAlerts, "rgba(232, 185, 73, .2)")}
      ${statCard("Internamentos", hospitalizations, "rgba(228, 87, 99, .16)")}
    </section>
    <section class="dash-grid">
      <div class="panel">
        <h3>Pacientes em atencao</h3>
        <div class="list">${attention.map((item) => `
          <div class="list-item">
            <div><strong>${petName(item.petId)} - ${item.title}</strong><span>${item.complaint || item.notes || "Acompanhar evolucao"}${item.returnDate ? ` - retorno ${formatDate(item.returnDate)}` : ""}</span></div>
            <span class="badge ${item.priority === "alta" ? "red" : "gold"}">${item.priority || item.kind}</span>
          </div>
        `).join("") || emptySmall("Nenhum paciente marcado como atencao.")}</div>
      </div>
      <div class="panel">
        <h3>Medicacoes e internacoes</h3>
        <div class="list">${medicationList.map((item) => `
          <div class="list-item">
            <div><strong>${petName(item.petId)} - ${item.medication || item.prescription || item.title}</strong><span>${item.hospitalizationTime || "Horario a definir"} - ${item.conduct || item.notes || "Sem orientacao cadastrada"}</span></div>
            <span class="badge ${item.kind === "internamento" ? "red" : "blue"}">${item.kind}</span>
          </div>
        `).join("") || emptySmall("Nenhuma medicacao ou internacao cadastrada.")}</div>
      </div>
      <div class="panel">
        <h3>Consultas e retornos</h3>
        <div class="list">${consultations.map((item) => `
          <div class="appointment">
            <div><strong>${petName(item.petId)} - ${item.employee || "Veterinario"}</strong><span>${formatDate(item.start)} ${item.time} - ${item.notes || "Consulta"}</span></div>
            ${statusBadge(item.status)}
          </div>`).join("") || emptySmall("Nenhuma consulta veterinaria agendada.")}</div>
      </div>
      <div class="panel">
        <h3>Vacinas</h3>
        <div class="list">${vaccineItems.map((item) => {
          const status = vaccineStatus(item);
          return `
          <div class="list-item"><div><strong>${petName(item.petId)} - ${item.name}</strong><span>Aplicacao: ${formatDate(item.date)} - validade: ${formatDate(item.expires)}</span></div><span class="badge ${status.tone}">${status.label}</span></div>
        `;
        }).join("") || emptySmall("Nenhuma vacina cadastrada.")}</div>
      </div>
    </section>
    <section class="content-grid clinic-records">
      ${records.map((record) => `
        <article class="record-card">
          <span class="badge ${record.priority === "alta" ? "red" : "blue"}">${record.priority}</span>
          <h3>${record.title}</h3>
          <p class="meta">${petName(record.petId)} - ${formatDate(record.date)} - ${record.kind}</p>
          <dl class="record-details">
            <dt>Queixa</dt><dd>${record.complaint || "-"}</dd>
            <dt>Sinais vitais</dt><dd>${record.vitals || "-"}</dd>
            <dt>Peso</dt><dd>${record.weight || "-"}</dd>
            <dt>Diagnostico</dt><dd>${record.diagnosis || "-"}</dd>
            <dt>Conduta</dt><dd>${record.conduct || record.prescription || "-"}</dd>
            <dt>Retorno</dt><dd>${record.returnDate ? formatDate(record.returnDate) : "-"}</dd>
            <dt>Vermifugo</dt><dd>${record.deworming || "-"}</dd>
            <dt>Internamento</dt><dd>${record.hospitalization || "Nao"}</dd>
            <dt>Horario</dt><dd>${record.hospitalizationTime || "-"}</dd>
            <dt>Remedio</dt><dd>${record.medication || "-"}</dd>
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
  const appointments = filterItems(weekAppointments().filter((item) => !["banho", "tosa", "banho_tosa"].includes(item.service)), (item) => `${petName(item.petId)} ${ownerName(item.ownerId)} ${serviceLabel(item.service)} ${item.status} ${item.notes}`);
  const petIds = [...new Set(appointments.map((item) => item.petId))];
  const scheduledPets = petIds.map((id) => state.pets.find((pet) => pet.id === id)).filter(Boolean);
  const unscheduledPets = filterItems(state.pets.filter((pet) => !petIds.includes(pet.id)), (pet) => `${pet.name} ${pet.breed} ${ownerName(pet.ownerId)} ${pet.temperament} ${pet.allergies}`);
  const pets = [...scheduledPets, ...unscheduledPets];
  const selectedPet = state.pets.find((pet) => pet.id === selectedPetId) || pets[0] || state.pets[0];
  selectedPetId = selectedPet?.id || null;
  const selectedAppointments = selectedPet ? petAppointments(selectedPet.id) : [];
  const weekSelected = selectedAppointments.filter(isAppointmentInWeek);
  const activeStays = state.pets.filter((pet) => currentHotelStay(pet.id)).length;
  const arrivingStays = state.pets.filter((pet) => nextHotelStay(pet.id)).length;
  const leftStays = state.pets.filter((pet) => hotelStayStatus(pet.id).label === "saiu").length;
  const confirmed = appointments.filter((item) => item.status === "confirmado").length;
  const { start, end } = weekRange();

  return `
    <div class="section-title">
      <div>
        <h2>Hotel e caes</h2>
        <p class="subtitle">Cadastre os caes, veja quem chega entre ${shortDate(start.toISOString().slice(0, 10))} e ${shortDate(end.toISOString().slice(0, 10))}, e deixe as observacoes sempre visiveis.</p>
      </div>
      <div class="actions inline-actions">
        <button class="btn" data-modal="appointment">Nova hospedagem</button>
        <button class="btn secondary" data-modal="pet">Novo cao</button>
      </div>
    </div>
    <section class="stats compact">
      ${statCard("Caes cadastrados", state.pets.length, "rgba(244, 127, 107, .18)")}
      ${statCard("No hotel hoje", activeStays, "rgba(41, 188, 135, .16)")}
      ${statCard("Proximas chegadas", arrivingStays, "rgba(79, 141, 247, .16)")}
      ${statCard("Ja sairam", leftStays, "rgba(232, 185, 73, .2)")}
    </section>
    <section class="hotel-board">
      <div class="kennel-map">
        ${pets.map((pet, index) => hotelPetCard(pet, appointments.filter((item) => item.petId === pet.id), index)).join("") || emptyBlock("Nenhum cachorro cadastrado ainda.")}
      </div>
      <aside class="pet-suite">
        ${selectedPet ? petSuite(selectedPet, weekSelected, selectedAppointments, user) : emptyBlock("Selecione um cachorro para ver detalhes.")}
      </aside>
    </section>
  `;
}

function hotelPetCard(pet, appointments, index) {
  const hotelStatus = hotelStayStatus(pet.id);
  const next = hotelStatus.stay || appointments[0];
  const isActive = selectedPetId === pet.id;
  const tones = ["room-aqua", "room-coral", "room-gold", "room-blue"];
  return `
    <button class="hotel-pet ${tones[index % tones.length]} ${isActive ? "active" : ""}" data-select-pet="${pet.id}">
      <span class="room-number">Suite ${String(index + 1).padStart(2, "0")}</span>
      <span class="pet-bubble">${petInitials(pet.name)}</span>
      <strong>${pet.name}</strong>
      <span>${pet.breed || "Sem raca"} - ${ownerName(pet.ownerId)}</span>
      <small>${next ? `${shortDate(next.start)} ate ${shortDate(next.end || next.start)} - ${next.time}` : "Sem hospedagem cadastrada"}</small>
      <span class="badge ${hotelStatus.tone}">${hotelStatus.label}</span>
    </button>
  `;
}

function petSuite(pet, weekItems, allItems, user) {
  const records = state.vetRecords.filter((record) => record.petId === pet.id);
  const vaccines = state.vaccines.filter((item) => item.petId === pet.id);
  const hotelStatus = hotelStayStatus(pet.id);
  const current = hotelStatus.stay || weekItems[0] || allItems[0];
  const stays = hotelAppointments().filter((item) => item.petId === pet.id);
  return `
    <div class="suite-hero">
      <div class="pet-bubble large">${petInitials(pet.name)}</div>
      <div>
        <span class="badge ${hotelStatus.tone}">${hotelStatus.label}</span>
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
      <h4>Hospedagens</h4>
      <div class="timeline">
        ${stays.map((item) => {
          const itemStatus = hotelAppointmentStatus(item);
          return `
          <div class="timeline-item">
            <span>${shortDate(item.start)}<br>${shortDate(item.end || item.start)}</span>
            <div><strong>${item.time || "09:00"} - ${itemStatus.label}</strong><small>${item.notes || "Sem observacao"}</small></div>
            <button class="btn secondary" data-edit-appointment="${item.id}">Editar</button>
          </div>
        `;
        }).join("") || emptySmall("Sem hospedagem cadastrada.")}
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
      <button class="btn secondary" data-modal="appointment" data-pet="${pet.id}">Hospedagem</button>
      <button class="btn secondary" data-edit-pet="${pet.id}">Editar cao</button>
      <button class="btn secondary" data-modal="hospitalization" data-pet="${pet.id}">Internacao</button>
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
    if (user.role !== "admin") return toast("Acesso exclusivo da administracao.");
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

  document.querySelectorAll("[data-edit-pet]").forEach((button) => {
    button.addEventListener("click", () => openModal("pet", { editId: button.dataset.editPet }));
  });

  document.querySelectorAll("[data-edit-appointment]").forEach((button) => {
    button.addEventListener("click", () => openModal("appointment", { editId: button.dataset.editAppointment }));
  });

  document.querySelectorAll("[data-appointment-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.appointments.find((appointment) => appointment.id === button.dataset.id);
      item.status = button.dataset.appointmentAction;
      saveState();
      render();
    });
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
  const titles = { appointment: "Novo agendamento", grooming: "Novo banho/tosa", clinic: "Nova ficha clinica", hospitalization: "Internacao", pet: "Novo cao", vet: "Observacao veterinaria", vaccine: "Carteira de vacina", user: "Novo usuario" };
  if (payload.editId && type === "appointment") titles.appointment = "Editar hospedagem";
  if (payload.editId && type === "pet") titles.pet = "Editar cao";
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

function serviceOptions(user, selected = "hotel") {
  const services = user.role === "admin"
    ? [["hotel", "Hotel"], ["veterinario", "Veterinario"]]
    : [["hotel", "Hotel"], ["banho", "Banho"], ["tosa", "Tosa"], ["banho_tosa", "Banho e tosa"]];
  return services.map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("");
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
            <option value="banho" ${selectedService === "banho" ? "selected" : ""}>Banho</option>
            <option value="tosa" ${selectedService === "tosa" ? "selected" : ""}>Tosa</option>
            <option value="banho_tosa" ${selectedService === "banho_tosa" ? "selected" : ""}>Banho e tosa</option>
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
          <label class="field"><span>Tipo</span><select name="kind"><option value="consulta">Consulta</option><option value="triagem">Triagem</option><option value="anamnese">Anamnese</option><option value="vacina">Vacina</option><option value="remedio">Remedio</option><option value="internamento">Internamento</option><option value="retorno">Retorno</option></select></label>
        </div>
        <div class="row">
          <label class="field"><span>Data</span><input name="date" type="date" required></label>
          <label class="field"><span>Prioridade</span><select name="priority"><option value="normal">Normal</option><option value="alta">Alta</option></select></label>
        </div>
        <div class="row">
          <label class="field"><span>Peso</span><input name="weight" placeholder="Ex: 12 kg"></label>
          <label class="field"><span>Internamento</span><select name="hospitalization"><option value="Nao">Nao</option><option value="Sim">Sim</option></select></label>
        </div>
        <label class="field"><span>Queixa principal</span><textarea name="complaint" required placeholder="O que o cachorro apresenta, desde quando e o que o tutor observou"></textarea></label>
        <label class="field"><span>Sinais vitais / exame fisico</span><textarea name="vitals" placeholder="Temperatura, mucosas, hidratacao, dor, ausculta, pele, fezes/urina"></textarea></label>
        <label class="field"><span>Suspeita ou diagnostico</span><input name="diagnosis" placeholder="Hipotese clinica ou diagnostico"></label>
        <label class="field"><span>Controle de vermifugo</span><input name="deworming" placeholder="Em dia, aplicar em 30 dias..."></label>
        <label class="field"><span>Medicacao / receita</span><textarea name="prescription" placeholder="Medicamentos, doses, exames ou formularios"></textarea></label>
        <label class="field"><span>Conduta e plano</span><textarea name="conduct" placeholder="Cuidados, exames, dieta, isolamento, acompanhamento"></textarea></label>
        <div class="row">
          <label class="field"><span>Retorno previsto</span><input name="returnDate" type="date"></label>
          <label class="field"><span>Horario de medicacao</span><input name="hospitalizationTime" type="time"></label>
        </div>
        <label class="field"><span>Observacoes gerais</span><textarea name="notes" placeholder="Evolucao, comportamento, pontos de atencao"></textarea></label>
        <button class="btn" type="submit">Salvar ficha clinica</button>
      </form>
    `;
  }

  if (type === "hospitalization") {
    return `
      <form class="form-grid" id="modal-form">
        <label class="field"><span>Pet</span><select name="petId" required>${petOptions({ role: "admin" }, payload.petId)}</select></label>
        <div class="row">
          <label class="field"><span>Nome da internacao</span><input name="hospitalizationName" required placeholder="Ex: Pos-operatorio, observacao 24h"></label>
          <label class="field"><span>Horario do cuidado</span><input name="hospitalizationTime" type="time" required></label>
        </div>
        <div class="row">
          <label class="field"><span>Remedio</span><input name="medication" required placeholder="Nome do remedio"></label>
          <label class="field"><span>Data</span><input name="date" type="date" required></label>
        </div>
        <label class="field"><span>Observacoes da internacao</span><textarea name="notes" placeholder="Dose, alimentacao, sinais de atencao e responsavel"></textarea></label>
        <button class="btn" type="submit">Salvar internacao</button>
      </form>
    `;
  }

  if (type === "appointment") {
    const editing = state.appointments.find((item) => item.id === payload.editId);
    const pets = petOptions(user, editing?.petId || payload.petId);
    const selectedService = editing?.service || "hotel";
    const selectedDogSize = (editing?.addons || "").includes("grande") ? "grande" : "pequeno";
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
          <label class="field"><span>Servico</span><select name="service">${serviceOptions(user, selectedService)}</select></label>
          <label class="field"><span>Horario</span><input name="time" type="time" value="${editing?.time || "09:00"}" required></label>
        </div>
        <div class="row">
          <label class="field"><span>Entrada</span><input name="start" type="date" value="${editing?.start || ""}" required></label>
          <label class="field"><span>Saida</span><input name="end" type="date" value="${editing?.end || editing?.start || ""}" required></label>
        </div>
        <label class="field"><span>Porte do cao</span><select name="dogSize"><option value="pequeno" ${selectedDogSize === "pequeno" ? "selected" : ""}>Porte pequeno</option><option value="grande" ${selectedDogSize === "grande" ? "selected" : ""}>Porte grande</option></select></label>
        ${user.role === "admin" ? `<label class="field"><span>Status</span><select name="status"><option value="agendado" ${editing?.status === "agendado" ? "selected" : ""}>Agendado</option><option value="confirmado" ${!editing || editing.status === "confirmado" ? "selected" : ""}>Confirmado</option><option value="atendido" ${editing?.status === "atendido" ? "selected" : ""}>Atendido</option></select></label>` : ""}
        <label class="field"><span>Observacao para a equipe</span><textarea name="notes" placeholder="Ex: horario de alimentacao, ansiedade, cuidado na entrada">${editing?.feedback || editing?.notes || ""}</textarea></label>
        <button class="btn" type="submit">${payload.editId ? "Salvar alteracoes" : user.role === "admin" ? "Salvar hospedagem" : "Enviar pedido de agendamento"}</button>
      </form>
    `;
  }

  if (type === "pet") {
    const editing = state.pets.find((item) => item.id === payload.editId);
    const owner = state.users.find((item) => item.id === editing?.ownerId);
    return `
      <form class="form-grid" id="modal-form">
        ${user.role === "admin" ? `
          <label class="field"><span>Tutor ja cadastrado</span><select name="ownerId"><option value="">Criar novo tutor</option>${ownerOptions(editing?.ownerId || "")}</select></label>
          <div class="row">
            <label class="field"><span>Nome do tutor</span><input name="ownerName" value="${owner?.name || ""}" placeholder="Responsavel pelo cao"></label>
            <label class="field"><span>Telefone do tutor</span><input name="ownerPhone" value="${owner?.phone || ""}" placeholder="(00) 00000-0000"></label>
          </div>
          <label class="field"><span>Email do tutor</span><input name="ownerEmail" type="email" value="${owner?.email?.includes("@hotelbeachpet.local") ? "" : owner?.email || ""}" placeholder="Opcional"></label>
        ` : ""}
        <div class="row">
          <label class="field"><span>Nome do cao</span><input name="name" value="${editing?.name || ""}" required></label>
          <label class="field"><span>Raca</span><input name="breed" value="${editing?.breed || ""}"></label>
        </div>
        <div class="row">
          <label class="field"><span>Idade</span><input name="age" value="${editing?.age || ""}" placeholder="Ex: 3 anos"></label>
          <label class="field"><span>Peso</span><input name="weight" value="${editing?.weight || ""}" placeholder="Ex: 12 kg"></label>
        </div>
        <label class="field"><span>Temperamento</span><input name="temperament" value="${editing?.temperament || ""}" placeholder="Calmo, agitado, medroso..."></label>
        <label class="field"><span>Alergias</span><input name="allergies" value="${editing?.allergies || ""}"></label>
        <label class="field"><span>Alimentacao</span><textarea name="food">${editing?.food || ""}</textarea></label>
        <button class="btn" type="submit">${payload.editId ? "Salvar alteracoes" : "Cadastrar cao"}</button>
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
        notes: data.notes || data.complaint,
        weight: data.weight,
        deworming: data.deworming,
        prescription: data.prescription,
        hospitalization: data.hospitalization,
        hospitalizationName: data.title,
        hospitalizationTime: data.hospitalizationTime,
        medication: data.prescription,
        complaint: data.complaint,
        vitals: data.vitals,
        diagnosis: data.diagnosis,
        conduct: data.conduct,
        returnDate: data.returnDate
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
        notes: data.returnDate ? `${data.title}. Retorno: ${formatDate(data.returnDate)}` : data.title,
        price: 0,
        employee: "Clinica",
        step: data.kind,
        packageName: data.title,
        addons: data.prescription,
        commission: 0
      });
      toast("Ficha clinica salva.");
    }

    if (type === "hospitalization") {
      const pet = state.pets.find((item) => item.id === data.petId);
      state.vetRecords.push({
        id: uid("v"),
        petId: data.petId,
        title: `Internacao - ${data.hospitalizationName}`,
        kind: "internamento",
        date: data.date,
        priority: "alta",
        notes: data.notes,
        weight: pet?.weight || "",
        deworming: "",
        prescription: data.medication,
        hospitalization: "Sim",
        hospitalizationName: data.hospitalizationName,
        hospitalizationTime: data.hospitalizationTime,
        medication: data.medication
      });
      state.appointments.push({
        id: uid("a"),
        petId: data.petId,
        ownerId: pet.ownerId,
        service: "veterinario",
        start: data.date,
        end: data.date,
        time: data.hospitalizationTime,
        status: "confirmado",
        notes: `Internacao: ${data.hospitalizationName}. Remedio: ${data.medication}. ${data.notes || ""}`,
        price: 0,
        employee: "Saude",
        step: "internamento",
        packageName: data.hospitalizationName,
        addons: data.medication,
        commission: 0
      });
      toast("Internacao salva.");
    }

    if (type === "appointment") {
      const pet = state.pets.find((item) => item.id === data.petId);
      const price = data.service === "veterinario" ? 0 : appointmentPrice(data.service, data.start, data.end || data.start, data.dogSize);
      const dogSizeNote = data.service === "hotel" ? `Porte ${data.dogSize}. ${daysBetween(data.start, data.end || data.start)} diaria(s).` : "";
      const existing = state.appointments.find((item) => item.id === payload.editId);
      const appointmentData = {
        id: existing?.id || uid("a"),
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
      };
      if (existing) {
        Object.assign(existing, appointmentData);
        toast("Hospedagem atualizada.");
      } else {
        state.appointments.push(appointmentData);
        toast("Hospedagem salva.");
      }
    }

    if (type === "pet") {
      const existingPet = state.pets.find((item) => item.id === payload.editId);
      let ownerId = data.ownerId || user.id;
      if (user.role === "admin" && !data.ownerId) {
        const ownerEmail = data.ownerEmail?.trim();
        const existingOwner = ownerEmail ? state.users.find((item) => item.email.toLowerCase() === ownerEmail.toLowerCase()) : null;
        if (existingOwner) {
          ownerId = existingOwner.id;
        } else {
          ownerId = uid("u");
          state.users.push({
            id: ownerId,
            name: data.ownerName || "Tutor sem nome",
            email: ownerEmail || `${ownerId}@hotelbeachpet.local`,
            password: "hotel123",
            phone: data.ownerPhone,
            role: "cliente"
          });
        }
      }
      const owner = state.users.find((item) => item.id === ownerId);
      if (owner && user.role === "admin") {
        owner.name = data.ownerName || owner.name;
        owner.phone = data.ownerPhone || owner.phone;
        if (data.ownerEmail) owner.email = data.ownerEmail;
      }
      const petData = {
        id: existingPet?.id || uid("p"),
        ownerId,
        name: data.name,
        breed: data.breed,
        age: data.age,
        weight: data.weight,
        temperament: data.temperament,
        allergies: data.allergies,
        food: data.food
      };
      if (existingPet) {
        Object.assign(existingPet, petData);
        toast("Cao atualizado.");
      } else {
        state.pets.push(petData);
        toast("Cao cadastrado.");
      }
    }

    if (type === "vet") {
      state.vetRecords.push({ id: uid("v"), petId: data.petId, title: data.title, kind: data.kind, date: data.date, priority: data.priority, notes: data.notes });
      toast("Observacao salva.");
    }

    if (type === "vaccine") {
      state.vaccines.push({ id: uid("vac"), petId: data.petId, name: data.name, date: data.date, expires: data.expires, fileName: form.file.files[0]?.name || "" });
      toast("Vacina cadastrada.");
    }

    saveState();
    closeModal();
    render();
  });
}

render();
