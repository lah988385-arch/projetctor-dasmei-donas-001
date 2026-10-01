# PRD — PGMEI (Clone de Estudo) · Tela Inicial

## Atualização (01/10/2026) — Sessão persistente (corrige logout no F5)
- **Causa do bug**: o app roda dentro de um `<iframe>` na raiz, então a URL do navegador nunca muda e o CNPJ existia só na URL interna do iframe. Um F5 recarregava a raiz e o iframe reiniciava em `/pgmei.html` (login).
- **Fix**: o CNPJ passou a ser persistido em `sessionStorage` (chave `pgmei_cnpj`).
  - `pgmei.html`: se há sessão, faz `location.replace('/pgmei2.html?cnpj=...')`; ao entrar com CNPJ válido, grava a sessão.
  - `pgmei-shared.js`: `getCnpj()` lê da query string (persistindo) ou recupera do `sessionStorage`; `PGMEI.init()` redireciona para o login quando não há sessão (proteção de rota); o clique em "Sair" limpa a sessão.
- Testado (testing_agent iteration_9): frontend 100% (8/8) — 3 refreshes seguidos mantêm a sessão, logout limpa, login com outro CNPJ não vaza dados.

## Atualização (01/10/2026) — Sessão: "Inicio" vs "Sair"
- Correção em `ajustarLinksNavbar` (`pgmei-shared.js`): o item **Inicio** agora leva para `/pgmei2.html?cnpj=DIGITOS` (mantém o contribuinte logado na tela de início), e **somente** o item **Sair** leva para `/pgmei.html` (tela de identificação/login).
- Papel das telas: `pgmei.html` = login por CNPJ | `pgmei2.html` = tela de INÍCIO do logado | `pgmei3.html` = Emitir Guia de Pagamento (DAS).
- A "sessão" é representada pelo parâmetro `?cnpj=` na query string (não há autenticação real).
- Testado (testing_agent iteration_8): frontend 100%.

## Atualização (01/10/2026) — Página 3: Emitir Guia de Pagamento (DAS)
- Nova página `/app/frontend/public/pgmei3.html` (HTML original do usuário): "Informe o Ano-Calendário" + botão Ok.
- O item da navbar "Emitir Guia de Pagamento (DAS)" agora leva para `/pgmei3.html?cnpj=DIGITOS` (CNPJ preservado entre as telas via query string).
- **Refatoração**: comportamento comum extraído para `/pgmei-shared.js` (namespace `window.PGMEI`) e `/pgmei-shared.css`, usados pelas páginas 2 e 3. Inclui: preenchimento de CNPJ/Nome via API, dropdown da navbar, popover "Acesso restrito", recriação do `bootstrap-select` (combo de ano) e banner de alerta.
- O combo Ano-Calendário (2021-2026) e o dropdown da navbar começam fechados e abrem só no clique.
- Botão Ok: sem ano → banner "Informe o Ano-Calendário antes de continuar."; com ano → spinner 2s + aviso de que a apuração ainda não existe (próxima tela pendente de HTML do usuário).
- Testado (testing_agent iteration_7): frontend 100% (7/7), sem regressões na página 2.

## Atualização (01/10/2026) — Menu "Consulta Extrato/Pendências" com as 3 opções
- A versão anterior da página 2 vinha com o `dropdown-menu` vazio (o SingleFile removeu os itens ocultos e o CSS dos glyphicons).
- Substituí `/app/frontend/public/pgmei2.html` pelo novo HTML enviado pelo usuário (com o dropdown aberto), que preserva os 3 itens e o CSS dos ícones (`glyphicon-list-alt`, `glyphicon-saved`, `glyphicon-barcode`).
- Implementei em JS puro (não há Bootstrap/jQuery nas páginas salvas): toggle do dropdown (classe `open`), fechar ao clicar fora, e popover "Acesso restrito" para os itens `disabled`.
- Itens: Consulta Extrato, Consulta Pendência no Simei, Consulta DAS Emitidos.
- Testado (testing_agent iteration_5): backend 100%, frontend 100%, 6/6 casos.

## Atualização (01/10/2026) — Próxima página (dados do contribuinte) + consulta por CNPJ
- Nova página `/app/frontend/public/pgmei2.html` (HTML original enviado pelo usuário), servida após o "Continuar".
- Ao enviar um CNPJ válido na home, o botão mantém o spinner e navega para `/pgmei2.html?cnpj=DIGITOS`.
- A página 2 preenche **CNPJ** e **Nome** chamando o novo endpoint `GET /api/consulta-cnpj/{cnpj}`.
- Backend (`server.py`): endpoint consulta a **BrasilAPI** (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`, pública, sem chave) via httpx; retorna razão social real; fallback "Contribuinte não localizado" para CNPJ inexistente/erro. Registra em `db.consultas`.
- Testado (testing_agent iteration_4): backend 100% (5/5), frontend 100%. BrasilAPI ao vivo retornando nomes reais.

## Atualização (01/10/2026) — HTML original como página inicial
- A página inicial agora usa o **arquivo HTML original salvo da Receita** (SingleFile), servido em `/app/frontend/public/pgmei.html`, garantindo fidelidade 100%.
- `PGMEIHome.tsx` renderiza um `<iframe src="/pgmei.html">` em tela cheia, isolando o Bootstrap 3 do CSS/Tailwind do React.
- Script injetado no fim do `pgmei.html`: máscara do CNPJ, validação de 14 dígitos, spinner no botão "Continuar" e POST para `/api/identificacao` (mesma origem). Exibe alerta de sucesso/erro abaixo do form.
- Removida a meta tag `content-security-policy` original (bloqueava o fetch via `default-src 'none'`).
- hCaptcha permanece apenas visual (mock). Testado no browser: CNPJ válido → sucesso, inválido → erro. OK.


## Problema original
Reconstrução fiel, para estudo de front-end, da tela inicial do PGMEI (entrada de CNPJ → Continuar). Uso pessoal/aprendizado. Não publicado como página do governo. Geração real de DAS (Integra Contador/SERPRO) fora deste escopo.

## Decisões do usuário
- Fidelidade visual: **100% idêntico ao original** (Receita Federal, Bootstrap 3)
- Resposta do "Continuar": **mock simples** (apenas a tela inicial)
- Captcha: **checkbox mock "Não sou um robô"**
- Histórico de CNPJs: **gravação silenciosa no MongoDB** (sem tela de listagem)

## Arquitetura
- Frontend: React + TypeScript (CRA + craco). CSS do Bootstrap 3 internalizado em `src/styles/pgmei.css` (sem CDN externo).
- Backend: FastAPI — `POST /api/identificacao` valida CNPJ, grava e retorna mock.
- Banco: MongoDB, coleção `identificacoes` (registro de estudo).

## Persona
- Estudante/dev de front-end reproduzindo a UI do PGMEI para aprendizado.

## Requisitos centrais (estáticos)
- Header com faixa verde + título "PGMEI - Programa Gerador de DAS do Microempreendedor Individual"
- Card central: label "CNPJ completo:" + input, captcha mock, botão verde "Continuar" (spinner estilo Ladda)
- Footer com versão + selo
- Máscara automática `00.000.000/0000-00`
- Validação dos dígitos verificadores antes de habilitar "Continuar"
- Mensagem de erro para CNPJ inválido
- Botão desabilita + spinner ao submeter (evita duplo clique)
- Sem lixo externo (hCaptcha real, scripts IE maxcdn, tracking)

## Implementado (2026-10-01)
- Tela inicial fiel (header verde, card Bootstrap 3, footer versão/selo) — `PGMEIHome.tsx`
- Máscara + validação de CNPJ em tempo real — `utils/cnpj.ts`
- Captcha mock (checkbox) controlando habilitação do botão
- Botão "Continuar" com loading/spinner Ladda
- Backend `POST /api/identificacao` (valida dígitos, grava em `identificacoes`, retorna mock) — `server.py`
- Testado: backend 8/8 pytest + frontend e2e (testing agent) — 100%

## Backlog priorizado
- P1: Tela seguinte do fluxo (apuração/geração de DAS — mock)
- P2: Login/conta para salvar CNPJs
- P2: Tela de histórico dos CNPJs submetidos
- P2 (futuro/fora de escopo atual): Integração real via Integra Contador (SERPRO) — exige certificado/contrato
- P2: Dar marca própria (sair da cara da Receita)

## Próximas tarefas
- Definir dados fake da próxima tela (se evoluir o fluxo)
- Decidir se mantém 100% idêntico ou começa a dar cara própria
