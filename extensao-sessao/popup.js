const $ = (id) => document.getElementById(id);
const log = (msg, cls) => {
  const el = $("log");
  const linha = document.createElement("div");
  if (cls) linha.className = cls;
  linha.textContent = msg;
  el.appendChild(linha);
  el.scrollTop = el.scrollHeight;
};

// domínios onde vive a sessão autenticada do gov.br / Receita
const DOMINIOS = ["receita.fazenda.gov.br", "gov.br"];

// restaura o que o usuário já preencheu
chrome.storage.local.get(["painel", "usuario"], (d) => {
  if (d.painel) $("painel").value = d.painel;
  if (d.usuario) $("usuario").value = d.usuario;
});

async function coletarCookies() {
  const vistos = new Map();
  for (const dominio of DOMINIOS) {
    const cookies = await chrome.cookies.getAll({ domain: dominio });
    for (const c of cookies) {
      // mantém a última ocorrência de cada nome
      vistos.set(c.name, c.value);
    }
  }
  return Array.from(vistos.entries()).map(([n, v]) => `${n}=${v}`).join("; ");
}

$("enviar").addEventListener("click", async () => {
  const painel = $("painel").value.trim().replace(/\/+$/, "");
  const usuario = $("usuario").value.trim();
  const senha = $("senha").value;
  const descricao = $("descricao").value.trim();

  $("log").innerHTML = "";
  if (!painel || !usuario || !senha) {
    log("Preencha painel, usuário e senha.", "err");
    return;
  }
  chrome.storage.local.set({ painel, usuario });

  $("enviar").disabled = true;
  try {
    log("Lendo cookies da sessão...");
    const cookie = await coletarCookies();
    if (!cookie) {
      log("Nenhum cookie encontrado. Faça login no gov.br/Receita primeiro.", "err");
      $("enviar").disabled = false;
      return;
    }
    log(`Cookie capturado (${cookie.split(";").length} itens).`);

    log("Autenticando no painel...");
    const rLogin = await fetch(`${painel}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, senha }),
    });
    if (!rLogin.ok) {
      const e = await rLogin.json().catch(() => ({}));
      log(`Falha no login: ${e.detail || rLogin.status}`, "err");
      $("enviar").disabled = false;
      return;
    }
    const { token } = await rLogin.json();

    log("Enviando sessão...");
    const rSessao = await fetch(`${painel}/api/admin/sessao`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ cookie, descricao, senha }),
    });
    if (!rSessao.ok) {
      const e = await rSessao.json().catch(() => ({}));
      log(`Falha ao salvar: ${e.detail || rSessao.status}`, "err");
      $("enviar").disabled = false;
      return;
    }
    log("✓ Sessão enviada e salva no painel!", "ok");
  } catch (err) {
    log(`Erro: ${err.message}`, "err");
  } finally {
    $("enviar").disabled = false;
  }
});
