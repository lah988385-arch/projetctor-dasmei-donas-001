import React, { useMemo, useState } from "react";
import axios from "axios";
import "@/styles/pgmei.css";
import { maskCNPJ, isValidCNPJ, onlyDigits } from "@/utils/cnpj";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL as string;
const API = `${BACKEND_URL}/api`;

type Resposta = {
  status: string;
  valido: boolean;
  cnpj: string;
  mensagem: string;
};

export const PGMEIHome: React.FC = () => {
  const [cnpj, setCnpj] = useState("");
  const [touched, setTouched] = useState(false);
  const [captchaOk, setCaptchaOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resposta, setResposta] = useState<Resposta | null>(null);

  const digits = onlyDigits(cnpj);
  const valido = useMemo(() => isValidCNPJ(cnpj), [cnpj]);
  const mostrarErro = touched && digits.length > 0 && !valido;
  const podeEnviar = valido && captchaOk && !loading;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnpj(maskCNPJ(e.target.value));
    setResposta(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeEnviar) {
      setTouched(true);
      return;
    }
    setLoading(true);
    setResposta(null);
    try {
      const { data } = await axios.post<Resposta>(`${API}/identificacao`, {
        cnpj: digits,
      });
      setResposta(data);
    } catch (err) {
      setResposta({
        status: "erro",
        valido: false,
        cnpj: digits,
        mensagem: "Não foi possível processar a solicitação. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pgmei-root" data-testid="pgmei-page">
      {/* Barra de topo (gov.br) */}
      <div className="pgmei-topbar">
        <div className="container">
          <div className="pgmei-topbar-inner" data-testid="pgmei-topbar">
            BRASIL — Governo Federal
          </div>
        </div>
      </div>

      {/* Cabeçalho com faixa verde */}
      <header className="pgmei-header" data-testid="pgmei-header">
        <div className="container">
          <div className="pgmei-header-inner">
            <div className="pgmei-brand">
              <span className="pgmei-brand-gov">Ministério da Fazenda</span>
              <span className="pgmei-brand-org">Receita Federal</span>
            </div>
            <h1 className="pgmei-header-title" data-testid="pgmei-title">
              PGMEI - Programa Gerador de DAS do Microempreendedor Individual
            </h1>
          </div>
        </div>
      </header>

      {/* Aviso de estudo */}
      <div className="pgmei-study-note" data-testid="pgmei-study-note">
        Clone de estudo de front-end. Não possui vínculo com a Receita Federal e
        não realiza nenhuma consulta ou geração real de DAS.
      </div>

      {/* Conteúdo principal */}
      <div className="container-fluid">
        <section className="row">
          <div className="well col-md-12" role="main">
            <div className="container">
              <div className="row">
                <div className="col-md-offset-3 col-md-5">
                  <div className="panel panel-default">
                    <div className="panel-heading">
                      <h4 className="panel-title">
                        Informe o número completo do CNPJ
                      </h4>
                    </div>

                    <div className="panel-body">
                      <form
                        id="identificacao"
                        role="form"
                        onSubmit={handleSubmit}
                        data-testid="pgmei-form"
                      >
                        <div className="form-group">
                          <div className="col-md-offset-1 col-md-8">
                            <div className="form-group">
                              <label htmlFor="cnpj" className="control-label">
                                CNPJ completo:
                              </label>
                              <input
                                type="text"
                                id="cnpj"
                                name="cnpj"
                                inputMode="numeric"
                                autoComplete="off"
                                placeholder="00.000.000/0000-00"
                                className={`form-control ${
                                  mostrarErro ? "input-error" : ""
                                }`}
                                value={cnpj}
                                onChange={handleChange}
                                onBlur={() => setTouched(true)}
                                title="Deve ser informado o CNPJ completo, inclusive com o dígito verificador."
                                data-testid="cnpj-input"
                              />
                              {mostrarErro && (
                                <span
                                  className="help-block"
                                  data-testid="cnpj-error"
                                >
                                  CNPJ inválido. Verifique os dígitos informados.
                                </span>
                              )}
                              <br />

                              {/* Captcha mock (estudo) */}
                              <div
                                className="pgmei-captcha"
                                data-testid="pgmei-captcha"
                              >
                                <input
                                  type="checkbox"
                                  id="captcha"
                                  checked={captchaOk}
                                  onChange={(e) =>
                                    setCaptchaOk(e.target.checked)
                                  }
                                  data-testid="captcha-checkbox"
                                />
                                <label
                                  htmlFor="captcha"
                                  className="pgmei-captcha-label"
                                >
                                  Não sou um robô
                                </label>
                                <span className="pgmei-captcha-logo">
                                  <strong>Captcha</strong>
                                  <span>mock · estudo</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="col-md-offset-1 col-md-11">
                            <div className="form-group">
                              <button
                                id="continuar"
                                type="submit"
                                disabled={!podeEnviar}
                                className={`btn btn-success ladda-button ${
                                  loading ? "loading" : ""
                                }`}
                                data-testid="continuar-button"
                              >
                                <span className="ladda-label">Continuar</span>
                                <span className="ladda-spinner" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </form>

                      {resposta && (
                        <div
                          className={`pgmei-alert ${
                            resposta.valido
                              ? "pgmei-alert-success"
                              : "pgmei-alert-danger"
                          }`}
                          data-testid="pgmei-resposta"
                        >
                          {resposta.mensagem}
                          {resposta.valido && (
                            <div style={{ marginTop: 4, fontWeight: 600 }}>
                              {resposta.cnpj}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Rodapé com versão + selo */}
      <footer className="pgmei-footer" data-testid="pgmei-footer">
        <div className="container">
          <div className="pgmei-footer-inner">
            <span data-testid="pgmei-versao">Versão 2.0.0 (estudo)</span>
            <span className="pgmei-selo" data-testid="pgmei-selo">
              <span className="pgmei-selo-dot" />
              Simples Nacional
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PGMEIHome;
