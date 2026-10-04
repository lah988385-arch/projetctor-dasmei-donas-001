/* DonasPainel — worker que roda na SUA sessão logada do PGMEI.
   Você já está autenticado (gov.br) e com a emissão de um CNPJ aberta.
   A extensão lê a tabela JÁ autenticada e envia o HTML de cada ano para o
   painel (/api/apuracao/importar), varrendo todos os anos do seletor. */

async function lerEstado() {
  const { estado, config } = await chrome.storage.local.get(['estado', 'config']);
  return { estado, api: ((config && config.api) || '').replace(/\/+$/, '') };
}
async function gravar(estado) { await chrome.storage.local.set({ estado }); }
async function logar(estado, texto, tipo) {
  estado.log = [...(estado.log || []), { texto, tipo }].slice(-80);
  await gravar(estado);
}

function soDigitos(v) { return (v || '').replace(/\D/g, ''); }

function detectarCnpj() {
  // "CNPJ: 67.229.444/0001-74" no cabeçalho do contribuinte
  const m = document.body.innerText.match(/CNPJ[:\s]*([\d]{2}\.?[\d]{3}\.?[\d]{3}\/?[\d]{4}-?[\d]{2})/i);
  if (m) return soDigitos(m[1]);
  const pa = document.querySelector('input[name=pa]');
  return null;
}

function anoDaPagina() {
  const pa = document.querySelector('input[name=pa]');
  if (pa && /^\d{6}$/.test(pa.value)) return Number(pa.value.slice(0, 4));
  const sel = document.querySelector('select[name=ano], #ano');
  if (sel && sel.value) return Number(String(sel.value).slice(0, 4));
  return null;
}

function anosDoSeletor() {
  const sel = document.querySelector('select[name=ano], #ano');
  if (!sel) return [];
  return [...sel.options]
    .map((o) => Number(String(o.value).slice(0, 4)))
    .filter((a) => a > 2000);
}

function enviarFormulario(elemento) {
  const form = (elemento && elemento.closest('form')) || document.querySelector('form');
  if (!form) return false;
  const botao = form.querySelector('button[type=submit], input[type=submit]');
  if (botao) { botao.click(); return true; }
  if (form.requestSubmit) { form.requestSubmit(); return true; }
  form.submit();
  return true;
}

async function selecionarAno(estado, ano) {
  const sel = document.querySelector('select[name=ano], #ano');
  if (!sel) { estado.ativo = false; await logar(estado, 'Seletor de ano não encontrado.', 'erro'); return; }
  const existe = [...sel.options].some((o) => String(o.value).slice(0, 4) === String(ano));
  if (!existe) {
    estado.feitos = [...(estado.feitos || []), ano];
    await logar(estado, `${ano}: não disponível para este CNPJ.`);
    return proximoAno(estado);
  }
  const opt = [...sel.options].find((o) => String(o.value).slice(0, 4) === String(ano));
  sel.value = opt.value;
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  await logar(estado, `Abrindo ${ano}...`);
  setTimeout(() => enviarFormulario(sel), 500);
}

async function proximoAno(estado) {
  const pendentes = (estado.anos || []).filter((a) => !(estado.feitos || []).includes(a));
  if (!pendentes.length) {
    estado.ativo = false;
    await logar(estado, '✓ Concluído! Abra o painel para ver os valores reais no cache.', 'ok');
    return;
  }
  return selecionarAno(estado, pendentes[0]);
}

async function enviarAnoAtual(estado, api) {
  const ano = anoDaPagina();
  if (!ano) { await logar(estado, 'Não identifiquei o ano desta tela.', 'erro'); return; }
  if ((estado.feitos || []).includes(ano)) return proximoAno(estado);

  await logar(estado, `Lendo ${ano}...`);
  try {
    const r = await fetch(`${api}/api/apuracao/importar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnpj: estado.cnpj, ano, html: document.documentElement.outerHTML }),
    });
    const corpo = await r.json().catch(() => ({}));
    if (!r.ok) {
      await logar(estado, `${ano}: ${corpo.detail || 'falhou'}`, 'erro');
    } else {
      await logar(estado, `${ano}: ${corpo.total_periodos} período(s), ${corpo.em_aberto.length} em aberto, devido R$ ${corpo.total_em_aberto_formatado}`, 'ok');
    }
  } catch (e) {
    await logar(estado, `${ano}: falha ao enviar (${e.message})`, 'erro');
  }
  estado.feitos = [...(estado.feitos || []), ano];
  await gravar(estado);
  return proximoAno(estado);
}

(async function () {
  const { estado, api } = await lerEstado();
  if (!estado || !estado.ativo) return;
  if (!api) { await logar(estado, 'Configure o endereço do painel.', 'erro'); estado.ativo = false; await gravar(estado); return; }

  const naEmissao = document.querySelector('tr.pa, input[name=pa], select[name=ano], #ano');
  if (document.querySelector('#cnpj') && !naEmissao) {
    await logar(estado, 'Você não está na emissão. Faça login, abra "Emitir Guia (DAS)" de um CNPJ e clique em Importar.', 'erro');
    estado.ativo = false; await gravar(estado); return;
  }

  if (!estado.cnpj) {
    const cnpj = detectarCnpj();
    if (!cnpj) { await logar(estado, 'Não achei o CNPJ na tela. Abra a emissão de um CNPJ.', 'erro'); estado.ativo = false; await gravar(estado); return; }
    estado.cnpj = cnpj;
    await logar(estado, `CNPJ ${cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')} detectado.`, 'ok');
  }

  if (!estado.anos || !estado.anos.length) {
    let anos = anosDoSeletor();
    if (!anos.length) { const a = anoDaPagina(); anos = a ? [a] : []; }
    estado.anos = anos;
    estado.feitos = [];
    await logar(estado, `Anos a importar: ${anos.join(', ') || '—'}`);
    await gravar(estado);
  }

  if (document.querySelector('tr.pa, input[name=pa]')) return enviarAnoAtual(estado, api);
  if (document.querySelector('select[name=ano], #ano')) return proximoAno(estado);
})();
