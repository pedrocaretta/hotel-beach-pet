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
  ]
};

let state = loadState();
migrateState();
let session = JSON.parse(localStorage.getItem("hotelBeachPetSession") || "null");
let view = "dashboard";
let searchTerm = "";
let modal = null;
let toastTimer = null;

const roleViews = {
  admin: ["dashboard", "appointments", "grooming", "clinic", "pets", "vet", "vaccines", "users"],
  cliente: ["appointments", "pets", "vaccines"]
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

function serviceLabel(service) {
  return { hotel: "Hotel", banho: "Banho", tosa: "Tosa", banho_tosa: "Banho e tosa", veterinario: "Veterinario" }[service] || service;
}

function currency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
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

function statusBadge(status) {
  const styles = { confirmado: "blue", atendido: "", agendado: "gold", faltou: "red" };
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
          ${user.role === "admin" ? navButton("grooming", "Banho e Tosa") : ""}
          ${user.role === "admin" ? navButton("clinic", "Clinica") : ""}
          ${navButton("pets", user.role === "admin" ? "Caes" : "Meus caes")}
          ${user.role === "admin" ? navButton("vet", "Veterinario") : ""}
          ${navButton("vaccines", user.role === "admin" ? "Vacinas" : "Carteira de vacina")}
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
  const pets = petsForUser(user);
  const grooming = groomingAppointments();
  const clinic = clinicAppointments();
  const confirmed = appointments.filter((item) => item.status === "confirmado").length;
  const attended = appointments.filter((item) => item.status === "atendido").length;
  const missed = appointments.filter((item) => item.status === "faltou").length;
  const upcoming = [...appointments].sort((a, b) => `${a.start}${a.time}`.localeCompare(`${b.start}${b.time}`)).slice(0, 5);
  const birthdays = pets.slice(0, 4);
  const revenue = appointmentRevenue(appointments);

  return `
    <div class="section-title">
      <div>
        <h2>Dashboard</h2>
        <p class="subtitle">Aqui estao os dados para sua analise.</p>
      </div>
      <div class="filters">
        <select><option>Todos os profissionais</option><option>Banho e tosa</option><option>Veterinario</option></select>
        <input type="date" value="2026-07-10">
      </div>
    </div>
    <section class="stats">
      ${statCard("Pets agendados", appointments.length, "rgba(244, 127, 107, .18)")}
      ${statCard("Pets confirmados", confirmed, "rgba(79, 141, 247, .16)")}
      ${statCard("Banho e tosa", grooming.length, "rgba(232, 185, 73, .2)")}
      ${statCard("Clinica veterinaria", clinic.length, "rgba(41, 188, 135, .16)")}
    </section>
    <section class="stats compact">
      ${statCard("Pets atendidos", attended, "rgba(41, 188, 135, .16)")}
      ${statCard("Pets que faltaram", missed, "rgba(228, 87, 99, .16)")}
      ${statCard("Faturamento previsto", currency(revenue), "rgba(79, 141, 247, .16)", "total")}
      ${statCard("Comissoes banho/tosa", currency(grooming.reduce((total, item) => total + Number(item.commission || 0), 0)), "rgba(244, 127, 107, .18)", "previsto")}
    </section>
    <section class="dash-grid">
      <div class="panel">
        <h3>Atendimentos do periodo</h3>
        <div class="chart">
          ${[35, 74, 42, 88, 56, 68, 46].map((h, index) => `<div class="bar" style="height:${h}%"><span>${["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"][index]}</span></div>`).join("")}
        </div>
      </div>
      <div class="panel">
        <h3>Proximos agendamentos</h3>
        <div class="list">${upcoming.map(appointmentLine).join("") || emptySmall("Nenhum agendamento ainda.")}</div>
      </div>
      <div class="panel">
        <h3>Procedimentos realizados</h3>
        <div class="list">
          ${procedureRow("Hotel", appointments.filter((item) => item.service === "hotel").length, "gold")}
          ${procedureRow("Banho", appointments.filter((item) => item.service === "banho").length, "")}
          ${procedureRow("Tosa", appointments.filter((item) => item.service === "tosa" || item.service === "banho_tosa").length, "blue")}
          ${procedureRow("Clinica", clinic.length, "red")}
        </div>
      </div>
      <div class="panel">
        <h3>Pets cadastrados</h3>
        <div class="list">${birthdays.map((pet) => `<div class="list-item"><div><strong>${pet.name}</strong><span>${pet.breed} - ${ownerName(pet.ownerId)}</span></div><span class="badge">ativo</span></div>`).join("") || emptySmall("Nenhum pet cadastrado.")}</div>
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
  const hotel = items.filter((item) => item.service === "hotel").length;
  const grooming = items.filter((item) => ["banho", "tosa", "banho_tosa"].includes(item.service)).length;
  const emptyColspan = user.role === "admin" ? 7 : 6;

  return `
    <div class="section-title">
      <div>
        <h2>${user.role === "admin" ? "Central de agendamentos" : "Agendar meu cachorro"}</h2>
        <p class="subtitle">${user.role === "admin" ? "Acompanhe reservas do hotel, banho, tosa e status de atendimento." : "Escolha o cachorro, a data e contrate hotel, banho ou tosa."}</p>
      </div>
      <button class="btn" data-modal="appointment">Novo agendamento</button>
    </div>
    <section class="stats compact">
      ${statCard(user.role === "admin" ? "Aguardando confirmacao" : "Pedidos enviados", pending, "rgba(232, 185, 73, .2)")}
      ${statCard("Confirmados", confirmed, "rgba(79, 141, 247, .16)")}
      ${statCard("Hotel", hotel, "rgba(41, 188, 135, .16)")}
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
            ${user.role === "admin" ? `<td><button class="btn secondary" data-status="${item.id}">Atualizar</button></td>` : ""}
          </tr>`).join("") || `<tr><td colspan="${emptyColspan}">${emptySmall(user.role === "admin" ? "Nenhum agendamento encontrado." : "Voce ainda nao tem agendamentos.")}</td></tr>`}</tbody>
      </table>
    </div>
  `;
}

function groomingTemplate(user) {
  if (user.role !== "admin") return appointmentsTemplate(user);
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
        <h2>Clinica Veterinaria</h2>
        <p class="subtitle">Fichas digitais, prontuario, receitas, peso, vermifugo, vacinas e internamentos.</p>
      </div>
      <button class="btn" data-modal="clinic">Nova ficha clinica</button>
    </div>
    <section class="module-hero clinic-hero">
      <div>
        <span class="module-kicker">Prontuario digital</span>
        <h3>Acabe com o papel: fichas e atendimentos em um so lugar.</h3>
        <p>Acompanhe consultas, retornos, receituarios, alertas de vacina e cuidados especiais de cada cachorro.</p>
      </div>
      <div class="module-list">
        <span>Fichas e anamnese por especialidade</span>
        <span>Receituarios e formularios</span>
        <span>Controle de peso e vermifugos</span>
        <span>Alertas automaticos de vacinas</span>
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
        <h3>Alertas de vacina</h3>
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
    button.addEventListener("click", () => openModal(button.dataset.modal, { petId: button.dataset.pet }));
  });

  document.querySelectorAll("[data-status]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.appointments.find((appointment) => appointment.id === button.dataset.status);
      const next = { agendado: "confirmado", confirmado: "atendido", atendido: "faltou", faltou: "agendado" };
      item.status = next[item.status] || "agendado";
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
  if (user.role !== "admin" && ["vet", "user", "grooming", "clinic"].includes(type)) {
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
  return services.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
}

function modalForm(type, payload, user) {
  if (type === "grooming") {
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
      const price = Number(data.price || 0);
      const commission = data.commission ? Number(data.commission) : Math.round(price * 0.15 * 100) / 100;
      state.appointments.push({
        id: uid("a"),
        petId: data.petId,
        ownerId: pet.ownerId,
        service: data.service,
        start: data.start,
        end: data.start,
        time: data.time,
        status: data.step === "finalizado" ? "atendido" : "confirmado",
        notes: data.feedback,
        price,
        employee: data.employee,
        step: data.step,
        packageName: data.packageName,
        addons: data.addons,
        commission,
        feedback: data.feedback
      });
      toast("Banho/tosa salvo.");
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
      state.appointments.push({
        id: uid("a"),
        petId: data.petId,
        ownerId: pet.ownerId,
        service: data.service,
        start: data.start,
        end: data.end || data.start,
        time: data.time,
        status: data.status || "agendado",
        notes: data.notes
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
