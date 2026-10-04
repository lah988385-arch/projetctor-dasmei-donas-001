import { useEffect, useState } from "react";
import { KeyRound, Loader2, CheckCircle2, AlertTriangle, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { api, fmtData, formatApiError } from "./api";

function StatusBadge({ sessao }) {
  if (!sessao || !sessao.tem_cookie) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-700/40 text-slate-400 text-xs font-medium">
        <X className="w-3.5 h-3.5" /> Sem sessão
      </span>
    );
  }
  if (sessao.expirada) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-medium">
        <AlertTriangle className="w-3.5 h-3.5" /> Expirada — renove
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-medium">
      <CheckCircle2 className="w-3.5 h-3.5" /> Ativa
    </span>
  );
}

export default function Configuracoes() {
  const [sessao, setSessao] = useState(null);
  const [cookie, setCookie] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modal, setModal] = useState(false);
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = () => api.get("/sessao").then(({ data }) => setSessao(data));
  useEffect(() => { carregar(); }, []);

  const abrirConfirmacao = () => {
    if (!cookie.trim()) {
      toast.error("Cole o cookie da sessão autenticada antes de salvar.");
      return;
    }
    setSenha("");
    setModal(true);
  };

  const salvar = async () => {
    if (!senha.trim()) {
      toast.error("Digite a senha do painel para confirmar.");
      return;
    }
    setSalvando(true);
    try {
      await api.post("/sessao", { cookie, descricao, senha });
      toast.success("Sessão atualizada com sucesso.");
      setModal(false);
      setCookie("");
      setDescricao("");
      setSenha("");
      await carregar();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div data-testid="admin-configuracoes" className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Configurações</h2>
        <p className="text-sm text-slate-400">Gestão da sessão autenticada reaproveitada nas consultas.</p>
      </div>

      {/* status atual */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5" data-testid="sessao-status">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Sessão gov.br</h3>
          </div>
          <StatusBadge sessao={sessao} />
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Atualizada em</p>
            <p className="text-slate-200" data-testid="sessao-atualizada">{fmtData(sessao?.atualizada_em)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Expira em</p>
            <p className="text-slate-200" data-testid="sessao-expira">{fmtData(sessao?.expira_em)}</p>
          </div>
          {sessao?.descricao && (
            <div className="col-span-2">
              <p className="text-xs text-slate-500 mb-0.5">Descrição</p>
              <p className="text-slate-200">{sessao.descricao}</p>
            </div>
          )}
        </div>
      </div>

      {/* trocar sessão */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-1">Trocar sessão</h3>
        <p className="text-xs text-slate-500 mb-4">
          Cole o cookie da sessão autenticada capturada no seu navegador. A Receita derruba a
          sessão periodicamente (normalmente toda segunda) — quando isso acontecer, renove aqui.
        </p>

        <label className="block text-xs font-medium text-slate-400 mb-1.5">Cookie da sessão</label>
        <textarea
          data-testid="sessao-cookie-input"
          value={cookie}
          onChange={(e) => setCookie(e.target.value)}
          rows={4}
          placeholder="Ex.: _ga=...; JSESSIONID=...; sessao=..."
          className="w-full bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none"
        />

        <label className="block text-xs font-medium text-slate-400 mb-1.5 mt-4">Descrição (opcional)</label>
        <input
          data-testid="sessao-descricao-input"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: sessão de segunda 15/06"
          className="w-full bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
        />

        <button
          data-testid="sessao-salvar-btn"
          onClick={abrirConfirmacao}
          className="mt-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors"
        >
          Salvar nova sessão
        </button>
      </div>

      {/* modal de confirmação por senha */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" data-testid="sessao-confirm-modal">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Confirmar alteração</h3>
                <p className="text-xs text-slate-400">Digite sua senha do painel para salvar.</p>
              </div>
            </div>
            <input
              data-testid="sessao-confirm-senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && salvar()}
              placeholder="Senha do painel"
              className="w-full bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
            <div className="flex gap-2 mt-5">
              <button
                data-testid="sessao-confirm-cancelar"
                onClick={() => setModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg py-2.5 text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                data-testid="sessao-confirm-salvar"
                onClick={salvar}
                disabled={salvando}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-semibold rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
              >
                {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
