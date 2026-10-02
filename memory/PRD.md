# PRD — PGMEI (Clone de Estudo) · Tela Inicial

## Atualização (01/10/2026) — Débitos em aberto + Pagar Online via PIX (pgmei6)
- **Regra de situação dos períodos** (`apuracao()`): meses vencidos = **Liquidado**, exceto os **2 últimos vencidos (cálculo GLOBAL, atravessa anos)** = **Devedor**, e os não vencidos = **A Vencer**. Com "hoje" = 01/10/2026 isso reproduz exatamente o print do usuário: Jul/2026 R$ 95,13 e Ago/2026 R$ 85,57; Set-Dez R$ 82,05. Anos antigos ficam integralmente Liquidado.
- **Juros**: 1% no mês do pagamento + `SELIC_MENSAL` (0,010841) por mês intermediário — foi o que fez Julho fechar em R$ 1,71 (antes 1,64), batendo com o documento oficial.
- **Apuração automática dos débitos**: `_periodos_escolhidos()` aceita `pas` vazio e assume **todos os períodos Devedor**. Vale para `/api/das/pdf`, `/api/das/gerados` e `/api/das/pix`. Sem débitos → HTTP 400 "Não há débitos em aberto neste ano-calendário.".
- **Botões da apuração**: `#btnPagarOnline` habilitado; helper `seguirPara()` compartilhado pelos dois botões — sem seleção segue com os débitos em aberto, e sem débitos mostra o banner vermelho.
- **Nova tela `/pgmei6.html` (Pagar Online via PIX)**: construída sobre a estrutura do site (header/navbar/footer idênticos). QR Code, valor total destacado, data do pagamento, tabela dos períodos, campo "PIX copia e cola" com botão **Copiar código PIX** e aviso de estudo. Layout próprio (`#pix-grid`) porque o SingleFile removeu as regras `col-md-5/7`.
- Novo `GET /api/das/pix/{cnpj}/{ano}?pas=&dt=`: BR Code EMV com CRC16 (`codigo_pix_estudo`) + QR em PNG base64 (`qrcode_base64`). **Chave PIX inexistente (`estudo@pgmei.invalido`) → NÃO pagável.**
- Testado (testing_agent iterations 15 e 16): backend 35/35, frontend 100%.

## Atualização (01/10/2026) — Tela "DAS gerados" (pgmei5) + DAS consolidado
- Nova tela `/app/frontend/public/pgmei5.html` (HTML original do usuário): painel **"DAS gerados:"** com Período de Apuração, Número da Apuração, Número do DAS e Data de Vencimento, mais os botões **Imprimir/Visualizar PDF** e **Voltar**.
- O botão `#btnEmitirDas` da apuração **não baixa mais o PDF**: agora navega para `/pgmei5.html?cnpj=&ano=&pas=&dt=` após o spinner de 2s. O PDF só aparece ao clicar em "Imprimir/Visualizar PDF".
- **Correção importante de regra de negócio**: o aviso da página oficial diz que "quando selecionado mais de um PA, será gerado um único DAS consolidado". O PDF passou a ser **1 única página consolidada** (antes era uma página por período), somando os tributos de todos os PAs. Layout compacto automático quando há mais de 13 entradas (ex: 12 meses = 24 linhas).
- Novos endpoints: `GET /api/das/gerados/{cnpj}/{ano}?pas=&dt=` (resumo da tabela) e `GET /api/das/pdf/{cnpj}/{ano}?pas=&dt=` (PDF inline). Helper `_periodos_escolhidos()` centraliza as validações (400 para CNPJ inválido, `pas` vazio e período fora do ano). `numero_apuracao()` = base do CNPJ + ano + mês + sequencial.
- Campos de identificação do PDF passaram a ser alinhados à direita (como no original), evitando transbordo do rótulo consolidado.
- Testado (testing_agent iteration_14): backend 29/29, frontend 100%.

## Atualização (01/10/2026) — PDF real do DAS (documento de estudo)
- Novo `POST /api/das/pdf` + `/app/backend/das_pdf.py`: gera o DAS em PDF com **uma página por período selecionado**.
- **Fidelidade**: layout, cores (azul `#002059`, verde `#64A70B`), fontes e coordenadas foram extraídos do PDF oficial enviado pelo usuário (`pdfplumber`). O logo do Simples Nacional foi extraído do próprio PDF (`/app/backend/assets/simples_nacional.png`).
- **Valores reais**: INSS = 5% do salário mínimo do ano (tabela 2021-2026; 2026 → R$ 81,05), ICMS R$ 1,00, ISS R$ 0,00; multa 0,33%/dia (máx. 20%) e juros 1% por mês de atraso. Confere dígito a dígito com o documento oficial (82,05 / 2,70 / 0,82 / **85,57**).
- **Código de barras FEBRABAN** de 44 dígitos + linha digitável com DVs por módulo 11 — algoritmo validado contra o documento real. O CPF do titular é derivado do nome empresarial do MEI e a UF vem da BrasilAPI (`/api/consulta-cnpj` agora retorna `uf`).
- **Marcação de estudo obrigatória**: marca d'água "DOCUMENTO DE ESTUDO / SEM VALIDADE LEGAL", aviso vermelho "NÃO PAGÁVEL" e QR Code substituído por um QR inócuo. Código de barras/linha digitável/QR **NÃO são pagáveis** (MOCKADOS).
- Frontend: `#btnEmitirDas` envia os períodos marcados, recebe o blob e dispara o download `DAS_<cnpj>_<ano>_estudo.pdf`; sem seleção, mostra o banner vermelho.
- Testado (testing_agent iteration_13): backend 22/22, frontend 3/3. Testes em `/app/backend/tests/test_das_pdf.py`.

## Atualização (01/10/2026) — Página 4: Apuração (tabela de períodos)
- Nova tela `/app/frontend/public/pgmei4.html` (HTML original do usuário), acessada ao clicar **Ok** na tela de emissão: `/pgmei4.html?cnpj=&ano=`.
- Novo endpoint `GET /api/apuracao/{cnpj}/{ano}`: retorna os 12 períodos do ano.
  - **Decisão do usuário**: sem a chave da API oficial (Integra Contador) não há como saber quais meses estão em aberto, então **todos os períodos vêm como "Liquidado"** — e nesse caso a Receita exibe "-" em Principal/Multa/Juros/Total/Datas.
  - `_vencimento_das(ano, mes)`: dia 20 do mês seguinte, adiado para o próximo dia útil (considera fins de semana e o feriado de 20/11). Confere com o print do usuário (Ago→21/09, Out→23/11, Dez→20/01/2027).
- Comportamentos na tela: combo de ano sincronizado com `?ano=` (trocar o ano recarrega a apuração), `#selecionarTodos` marca/desmarca os 12 períodos, `#btnEmitirDas` exige pelo menos um período e informa que a geração do PDF não está disponível nesta versão. "Atualizar Valores" e "Pagar Online" seguem desabilitados como no original.
- Overlay de carregamento de 2s cobre a tela até a tabela estar pronta (sem flash).
- Testado (testing_agent iteration_12): backend 100%, frontend 100% (11/11). Teste criado pelo agente: `/app/backend/tests/test_apuracao.py`.

## Atualização (01/10/2026) — Overlay de carregamento + fim do flash na tela de emissão
- **Causa**: o `pgmei-shared.css` era carregado no FIM do arquivo e a tela de emissão havia perdido as regras `.dropdown-menu>li>a` (removidas pelo SingleFile). Antes do primeiro paint, os itens do menu apareciam como links azuis sem estilo e o combo vazio como uma caixa branca.
- **Fix**:
  1. CSS **crítico inline no `<head>`** de `pgmei2.html`/`pgmei3.html` (esconde `.dropdown-menu` por padrão) + `<link>` do CSS compartilhado movido para o head.
  2. Regras `.dropdown-menu>li>a` recuperadas da tela de início e adicionadas ao `pgmei-shared.css`.
  3. **Overlay `#pg-loading`** (tela branca + spinner verde de 12 barras centralizado) como primeiro elemento do `<body>`: visível por padrão na página 3 e escondido após 2s; na página 2 fica oculto e é exibido no clique do link "Emitir Guia" (`mostrarCarregando`), deixando a transição contínua.
- Testado (testing_agent iteration_11): frontend 100% — 31 amostras a ~90ms, zero flash de menu/combo; overlay visível de 0,3s a 1,8s e ausente após 2,4s.

## Atualização (01/10/2026) — Fim do flash "CNPJ: -- / Nome: Carregando..."
- **Causa**: a consulta do nome só começava depois de entrar na tela interna, e os placeholders do HTML (grande, ~138KB inline) apareciam antes do JS externo rodar.
- **Fix em 3 frentes**:
  1. `pgmei.html`: a consulta `/api/consulta-cnpj` roda **em paralelo ao spinner**; a navegação usa `Promise.all([consulta, minimo2s])`, então só avança com o nome pronto (se a API demorar, o spinner espera).
  2. `pgmei2.html`/`pgmei3.html`: script **inline** logo após o bloco do contribuinte preenche `#pg-cnpj`/`#pg-nome` a partir do `sessionStorage` no primeiro paint.
  3. `pgmei-shared.js`: `preencherContribuinte()` usa o cache antes do fetch e o atualiza depois; `encerrarSessao()` limpa `pgmei_cnpj`, `pgmei_nome` e `pgmei_cnpj_fmt`.
- Testado (testing_agent iteration_10): frontend 100% (5/5) com polling de ~80-100ms — zero flash no login, no refresh e ao navegar; sem vazamento do nome anterior após o logout.

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

## Implementado (2026-06 — ajuste de UX no menu bloqueado)
- Menu "Consulta Extrato/Pendências": as 3 opções seguem bloqueadas (fiel ao site real), mas sem "mouse travado"
  - `cursor: not-allowed` -> `cursor: pointer`, texto mais legível (#8a8a8a) e highlight no hover
  - Popover "Acesso restrito" redesenhado: seta apontando para o item, fade/slide suave, posicionamento automático (acima/abaixo + clamp na viewport), toggle no clique, abre no hover e fecha ao sair do menu
  - Arquivos: `frontend/public/pgmei-shared.css`, `frontend/public/pgmei-shared.js` (afeta pgmei2..pgmei6)
- Testado via screenshot: cursor = pointer e popover visível/posicionado corretamente

## Implementado (2026-06 — Importação de dados REAIS do PGMEI via HTML)
Decisão do usuário: SERPRO Integra Contador fica como **plano B documentado**. Caminho escolhido:
scraping com sessão humana, começando pela **importação manual do HTML** (fase 1) e Chromium
no servidor com relay de captcha (fase 2, pendente).

### Provas técnicas levantadas (por que não dá scraping direto server-side)
- `POST /Identificacao` sem captcha devolve a MESMA tela de login (200, 8412 bytes idênticos)
- A página carrega **hCaptcha invisível** (`hcaptcha.execute()` no submit) → exige `h-captcha-response`
- `x-frame-options: SAMEORIGIN` + CSP `frame-ancestors 'self'` → **iframe embutido impossível**
- Cookie de sessão é `HttpOnly` → JS do cliente **não pode** capturar a sessão
- Conclusão: só funciona com navegador no servidor (Playwright) ou importação manual do HTML

### Entregue (fase 1)
- `backend/pgmei_import.py`: parser do HTML da tela de emissão (BeautifulSoup+lxml).
  Mapeia colunas pelo `<thead>` (trata `rowspan`/`colspan`) com fallback posicional;
  extrai PA do checkbox ou do rótulo (01/2026, 2026/01, Janeiro/2026); `resumir()` agrupa em
  em_aberto / a_vencer / liquidados / baixados e soma o total devido
- `POST /api/apuracao/importar` {cnpj, ano, html} → 422 com mensagem clara se não achar a tabela
- `GET /api/apuracao/importada/{cnpj}/{ano}` e `DELETE` (volta aos dados de exemplo)
- `GET /api/apuracao/{cnpj}/{ano}` agora prefere os dados importados e devolve `origem: real|mock`
  + `importado_em`; PDF/PIX/DAS gerados passam a usar os valores reais automaticamente
- `_em_aberto()` no backend e `classeSituacao()` no front classificam situações livres
  (Devedor/Em cobrança/Baixada/A Vencer), não mais strings fixas
- `pgmei4.html`: faixa de origem dos dados + painel "Importar dados reais do PGMEI"
  (link para o site oficial, instruções Ctrl+U, textarea, Importar/Cancelar, status)
- Deps novas: beautifulsoup4, lxml (requirements.txt atualizado via pip freeze)

### Testado
- Parser: cabeçalho reconhecido e fallback sem `<thead>` → valores, datas e situações corretas
- API: importar 200 (4 PA, 1 em aberto, R$ 94,12), HTML inválido 422, DELETE volta para mock
- `GET /api/das/gerados?pas=` auto-seleciona o PA Devedor **importado** (202602)
- UI (Playwright): importa, tabela troca de 12 linhas mock para 4 reais, faixa vira
  "Dados reais do PGMEI importados em …", botão "Voltar aos dados de exemplo" restaura

## Backlog atualizado
- P1 (fase 2): Chromium/Playwright no servidor com relay do captcha (1 sessão por vez) para
  eliminar o copiar/colar. Atenção: ~300-500 MB por sessão, sessão da Receita expira ~30 min
- P1: aceitar também o HTML da tela de Consulta Extrato/Pendências (versão completa)
- P2: SERPRO Integra Contador (playbook já levantado: auth Basic+mTLS, `DIVIDAATIVA24`,
  `GERARDASPDF21`, trial em `integra-contador-trial/v1`) — ativar quando houver e-CNPJ A1
- P2: histórico de importações por CNPJ/ano

## Implementado (2026-06 — Fase 2: navegador no servidor + importação em 1 clique)
### Fase 2 (sessão com relay de captcha) — CONSTRUÍDA, mas BLOQUEADA pela Receita
- `backend/pgmei_sessao.py`: Chromium (Playwright) no servidor, 1 sessão por vez, timeout de
  10 min de inatividade, Xvfb em :99 (headless puro é recusado), stealth básico
  (navigator.webdriver, languages, plugins), digitação do CNPJ com atraso humano
- Endpoints: `POST /api/sessao/abrir`, `GET /api/sessao/{id}/tela` (JPEG do viewport),
  `GET /api/sessao/{id}/estado`, `POST /api/sessao/{id}/clique|teclar|preencher-cnpj`,
  `POST /api/sessao/{id}/coletar` (varre vários anos e grava as apurações), `POST .../fechar`
- UI: modal "Consulta automática (beta)" em pgmei4.html espelhando a tela (1 quadro/1,2s),
  relay de cliques/teclas, botão "Importar anos" (ano-5 .. ano) e "Repreencher CNPJ"
- **RESULTADO DO TESTE REAL**: a tela da Receita aparece, o CNPJ é digitado, o clique em
  Continuar chega ao site — e a Receita responde **"13896 - Impedido por proteção Captcha.
  Comportamento de Robô."** O hCaptcha é INVISÍVEL e pontua por risco: IP de datacenter (GCP)
  reprova mesmo com navegador gráfico e stealth. Não há desafio para o humano resolver.
- Suporte a proxy já no código: `PGMEI_PROXY_SERVER` / `PGMEI_PROXY_USER` / `PGMEI_PROXY_PASS`
  no backend/.env. Com proxy residencial brasileiro a Fase 2 provavelmente passa (NÃO TESTADO)
- Chromium persistido em `/root/.cache/ms-playwright` (chromium-1243 + headless shell)

### Importação em 1 clique (bookmarklet) — FUNCIONA, é a via recomendada
- Painel de importação agora tem 3 opções: (1) bookmarklet, (2) colar código-fonte, (3) sessão beta
- O bookmarklet roda no navegador DO USUÁRIO (IP e captcha dele), detecta o CNPJ pelo texto da
  página e o ano pelo `input[name=pa]`, e faz POST do `outerHTML` para `/api/apuracao/importar`
- CSP da Receita só restringe `frame-ancestors`, então fetch inline funciona (verificado)
- Testado com Playwright a partir de outra origem (http://127.0.0.1:9099): alerta retornou
  "Importado para o PGMEI de estudo: 4 periodo(s) de 2026, 1 em aberto, total devido R$ 94,12"
- Fixture de teste do HTML de emissão: `/app/memory/fixtures/emissao_pgmei_exemplo.html`

## Backlog atualizado
- P1: Proxy residencial BR para desbloquear a Fase 2 (precisa de credencial do usuário)
- P1: Extensão de navegador (substitui o bookmarklet, importa todos os anos de uma vez)
- P2: SERPRO Integra Contador (playbook levantado) — caminho oficial sem captcha
- P2: Cartão de resumo com total devido e meses atrasados no topo da apuração
- P2: Histórico de importações por CNPJ/ano

## Implementado (2026-06 — Cache de 7 dias)
- `CACHE_DIAS = 7` + `_validade_cache()` em server.py: a partir do `importado_em` calcula
  `cache_expira_em`, `cache_expirado` e `dias_restantes`, expostos em `GET /api/apuracao/{cnpj}/{ano}`
  e em `POST /api/apuracao/importar`
- Os dados reais já viviam no Mongo (coleção `apuracoes_importadas`); agora eles têm validade:
  dentro de 7 dias a tela serve do banco (instantâneo, zero acesso à Receita); passados 7 dias os
  dados continuam sendo exibidos, mas marcados como desatualizados
- UI: faixa verde "Dados reais do PGMEI importados em … Válidos por N dia(s)"; ao vencer vira
  amarela com "Estes dados têm mais de 7 dias. Importe de novo para atualizar." e o botão passa a
  "Atualizar agora". Reimportar (bookmarklet, colar HTML ou sessão) renova o prazo
- Testado: import devolve dias=7/expirado=false; forçando `importado_em` 9 dias atrás a API
  devolve dias=0/expirado=true mantendo os 4 períodos, e a UI mostra a faixa amarela
