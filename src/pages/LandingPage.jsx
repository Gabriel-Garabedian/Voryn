import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { PLANS } from '@/services/payment'
import { LANDING_PHOTOS, creditSummary } from '@/data/mediaCredits'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import AndroidDownloadLink from '@/components/AndroidDownloadLink'

gsap.registerPlugin(ScrollTrigger, useGSAP)

// ── NAV ────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    // A window é quem rola: o overflow-x travado vive só no <html>
    // (ver o comentário em src/index.css, @layer base), então existe
    // um único scroller e o scroll da window é o scroll da página.
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  // Fecha o menu mobile automaticamente se a tela for redimensionada
  // para o layout desktop (ex: girar o celular ou abrir devtools).
  useEffect(() => {
    const h = () => { if (window.innerWidth > 760) setMenuOpen(false) }
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  const links = [['#features','Funcionalidades'],['#pricing','Preços'],['#faq','FAQ']]
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: (scrolled || menuOpen) ? 'var(--card)' : 'transparent',
      borderBottom: (scrolled || menuOpen) ? '1px solid var(--rule)' : 'none',
      transition: 'background .3s ease, border-color .3s ease',
    }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: '.1em', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/voryn-icon-192.png" alt="" style={{ width: 32, height: 32, borderRadius: 8 }} />
          Voryn
        </Link>

        {/* Links completos — some abaixo de 760px (ver .lp-nav-links no CSS) */}
        <div className="lp-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {links.map(([h,l]) => (
            <a key={h} href={h} className="lp-nav-link" style={{ color: 'var(--text-3)', fontSize: 14, textDecoration: 'none' }}>
              {l}
            </a>
          ))}
          <Link to="/login" className="lp-nav-link" style={{ color: 'var(--text-3)', fontSize: 14, textDecoration: 'none' }}>
            Entrar
          </Link>
          <Link to="/register" className="lp-primary-cta" style={{
            color: 'var(--on-inverse)', fontSize: 14, fontWeight: 700,
            padding: '10px 20px', textDecoration: 'none',
          }}>
            Começar grátis
          </Link>
        </div>

        {/* Botão hamburger — só aparece abaixo de 760px (ver .lp-nav-toggle no CSS).
            BUG: antes desta correção não existia NENHUMA versão mobile do menu — os
            mesmos links de desktop ficavam sempre visíveis e vazavam pra fora da tela
            em qualquer viewport estreito (ex: 390px), cortando "Entrar" e o CTA. */}
        <button
          className="lp-nav-toggle"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          style={{ display: 'none', background: 'none', border: 'none', padding: 8, color: '#fff', cursor: 'pointer' }}>
          {menuOpen ? (
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
          ) : (
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16"/></svg>
          )}
        </button>
      </div>

      {/* Painel mobile — só é renderizado quando aberto, e só fica visível
          abaixo de 760px (o CSS força display:none acima disso). */}
      {menuOpen && (
        <div className="lp-nav-mobile-panel">
          {links.map(([h,l]) => (
            <a key={h} href={h} onClick={() => setMenuOpen(false)}>{l}</a>
          ))}
          <Link to="/login" onClick={() => setMenuOpen(false)}>Entrar</Link>
          <Link to="/register" className="lp-primary-cta" onClick={() => setMenuOpen(false)}
            style={{ color: 'var(--on-inverse)', fontWeight: 700, textAlign: 'center', padding: '13px 20px' }}>
            Começar grátis
          </Link>
        </div>
      )}
    </nav>
  )
}

// ── O MOTIVO: a escada de carga ────────────────────────────
// A forma que vem do próprio produto: peso × reps × série. A escada só
// sobe, e é essa forma que estrutura a página inteira — barra, bloco,
// trilho. Os números batem entre si: 80 × 8 × 3 = 1.920 kg.
const LADDER = [
  { weight: 70, reps: 10, sets: 3 },
  { weight: 75, reps: 9,  sets: 3 },
  { weight: 80, reps: 8,  sets: 3 },
]

// ── Fragmento: a escada de carga (data-ui) ─────────────────
// É a "imagem" da página: um pedaço real da interface do Voryn,
// desenhado em HTML com dados que somam.
function LoadLadder({ done = false }) {
  return (
    <div data-ui className="lp-ladder" aria-label="Escada de carga: 70 kg por 10 reps, 75 kg por 9 reps e 80 kg por 8 reps">
      <div className="lp-ladder-head">
        <span className="lp-ladder-title">Peito e Tríceps</span>
        <span className="lp-ladder-day">Segunda</span>
      </div>
      <div className="lp-ladder-steps">
        {LADDER.map((s, i) => (
          <div className="lp-ladder-step" key={s.weight}>
            <div className="lp-ladder-bar" style={{ height: `${44 + i * 22}%` }} />
            <div className="lp-ladder-nums">
              <strong>{s.weight}</strong>
              <span>kg</span>
            </div>
            <div className="lp-ladder-reps">{s.reps} reps</div>
            <div className="lp-ladder-sets">{s.sets} séries</div>
          </div>
        ))}
      </div>
      <div className="lp-ladder-foot">
        <span>Volume da sessão</span>
        <strong>1.920 kg</strong>
        {done && <span className="lp-ladder-done">Treino concluído</span>}
      </div>
    </div>
  )
}

// ── Fragmento: o calendário de consistência (data-ui) ───────
// A coisa viva do app: 21 dias de grade, 12 marcados. É a mesma
// grade que o aluno vê na home, com os números que batem com a
// sequência anunciada no herói.
function ConsistencyGrid() {
  // 21 células, 12 marcadas. A sequência de 12 dias é o fim da
  // grade, então as últimas 12 são as que acenderam.
  const DAYS = 21
  const TRAINED = 12
  return (
    <div data-ui className="lp-calendar" aria-label="Calendário de consistência: 21 dias, 12 treinados">
      <div className="lp-calendar-head">
        <span className="lp-calendar-title">Sequência</span>
        <span className="lp-calendar-count">12 dias</span>
      </div>
      <div className="lp-calendar-grid">
        {Array.from({ length: DAYS }, (_, i) => (
          <span
            key={i}
            className={`lp-calendar-cell${i >= DAYS - TRAINED ? ' lp-calendar-cell-on' : ''}`}
          />
        ))}
      </div>
      <div className="lp-calendar-foot">
        <span>Últimos 21 dias</span>
        <strong>12 treinados</strong>
      </div>
    </div>
  )
}

// ── HERO ───────────────────────────────────────────────────
// A coisa viva: o visitante escolhe o split e vê a escada daquele
// treino. Sem JS, a escada padrão já está no HTML.
function Hero() {
  const [split, setSplit] = useState(0)
  const splits = [
    { name: 'Peito e Tríceps', day: 'Segunda' },
    { name: 'Pernas e Glúteo', day: 'Quinta' },
    { name: 'Costas e Bíceps', day: 'Sexta' },
  ]
  const s = splits[split]
  return (
    <section className="lp-hero" style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', position: 'relative', paddingTop: 112 }}>
      <div className="lp-container" style={{ maxWidth: 1180, margin: '0 auto', padding: '0 32px 88px', width: '100%' }}>
        <div className="lp-hero-grid">
          <div className="lp-hero-copy-col">
            <h1 className="lp-hero-title">
              Todo treino<br />
              vira dado.
            </h1>
            <p className="lp-hero-copy">
              Registre peso, reps e séries do seu treino e veja a carga subir.
              O Voryn guarda a escada de cada sessão para você comparar.
            </p>
            <div className="lp-hero-actions">
              <Link to="/register" className="lp-primary-cta">
                Começar 14 dias grátis
              </Link>
              <AndroidDownloadLink className="lp-secondary-cta" />
            </div>
            <dl className="lp-hero-numbers">
              <div><dt>12 dias de sequência</dt><dd>12</dd></div>
              <div><dt>8.430 kg de volume no mês</dt><dd>8.430 kg</dd></div>
              <div><dt>6 recordes pessoais</dt><dd>6</dd></div>
            </dl>
          </div>

          {/* A coisa viva: escolhe o split, a escada muda. */}
          <div className="lp-hero-stage">
            <div className="lp-split-picker" role="group" aria-label="Escolha o treino do dia">
              {splits.map((sp, i) => (
                <button
                  key={sp.name}
                  type="button"
                  className="lp-split-btn"
                  aria-pressed={split === i}
                  onClick={() => setSplit(i)}
                >
                  <span className="lp-split-name">{sp.name}</span>
                  <span className="lp-split-day">{sp.day}</span>
                </button>
              ))}
            </div>
            <LoadLadder />
            <p className="lp-hero-caption">
              A escada do treino de {s.name.toLowerCase()}, na {s.day.toLowerCase()}.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── FUNCIONALIDADES ────────────────────────────────────────
// Blueprint: "Sentences with switches". Cada frase é uma faixa de
// tela cheia com um interruptor real. Duas faixas ligam no carregamento.
const FEATURES = [
  { sentence: 'Registre cada série e a carga sobe sozinha.', on: true,
    consequence: '44 treinos em 12 semanas viram uma escada que você compara série por série.' },
  { sentence: 'A semana inteira cabe num planejador.', on: true,
    consequence: 'Rotinas de segunda a sexta salvas na nuvem, prontas no celular.' },
  { sentence: 'O calendário mostra os dias que você treina.', on: false,
    consequence: '21 dias de grade, 12 marcados. A sequência de 12 dias é o que aparece.' },
  { sentence: 'Cada exercício tem seu próprio histórico.', on: false,
    consequence: 'Agachamento livre, supino e puxada com carga, reps e data de cada recorde.' },
  { sentence: 'O personal enxerga os alunos no mesmo painel.', on: false,
    consequence: 'Até 50 alunos com ficha, avaliação física e conversa dentro do app.' },
]

function Features() {
  const [on, setOn] = useState(FEATURES.map(f => f.on))
  const toggle = (i) => setOn(prev => prev.map((v, idx) => (idx === i ? !v : v)))
  return (
    <section id="features" className="lp-features-section">
      {FEATURES.map((f, i) => (
        <div key={f.sentence} className={`lp-band${on[i] ? ' lp-band-on' : ''}`}>
          <div className="lp-container lp-band-inner">
            <p className="lp-band-sentence">{f.sentence}</p>
            <button
              type="button"
              className="lp-switch"
              role="switch"
              aria-checked={on[i]}
              aria-label={f.sentence}
              onClick={() => toggle(i)}
            >
              <span className="lp-switch-knob" />
            </button>
            {on[i] && <p className="lp-band-consequence">{f.consequence}</p>}
          </div>
        </div>
      ))}
    </section>
  )
}

// ── COMO FUNCIONA ──────────────────────────────────────────
// Blueprint: "One card, four fields". Quatro campos de cor chapada
// lado a lado, e a MESMA escada em quatro estados — mais cheia a cada
// passo. O cartão é a escada, não um registro genérico.
const STEPS = [
  { clause: 'Primeiro ela chega vazia.', state: 0 },
  { clause: 'Depois recebe a carga.', state: 1 },
  { clause: 'Depois guarda as séries.', state: 2 },
  { clause: 'No fim, vira histórico.', state: 3 },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="lp-how-section">
      <div className="lp-container">
        <h2 className="lp-section-title">Registrar leva menos de um minuto.</h2>
        <div className="lp-fields">
          {STEPS.map((st, i) => (
            <div className="lp-field" key={st.clause}>
              {i === 0 && <h3 className="lp-field-head">Como funciona</h3>}
              <p className="lp-field-clause">{st.clause}</p>
              <div className="lp-field-card">
                {st.state === 0 && <p className="lp-field-empty">Nenhuma série registrada ainda.</p>}
                {st.state >= 1 && <LadderSteps state={st.state} />}
              </div>
            </div>
          ))}
        </div>
        <div className="lp-how-extra">
          <p className="lp-how-extra-copy">
            A grade de 21 dias é o que vira sequência. Ela mora na tela de
            início e o aluno abre o app três vezes por dia para ver o número
            subir.
          </p>
          <ConsistencyGrid />
        </div>
      </div>
    </section>
  )
}

// A escada em quatro estados: 0 vazia, 1 com carga, 2 com séries, 3 fechada.
function LadderSteps({ state }) {
  return (
    <div className="lp-mini-ladder" aria-hidden="true">
      {LADDER.map((s, i) => (
        <div className="lp-mini-step" key={s.weight}>
          <div className={`lp-mini-bar${state >= 3 ? ' lp-mini-bar-done' : ''}`} style={{ height: `${44 + i * 22}%` }} />
          {state >= 1 && <div className="lp-mini-weight">{s.weight} kg</div>}
          {state >= 2 && <div className="lp-mini-reps">{s.reps} × {s.sets}</div>}
        </div>
      ))}
      {state >= 3 && <div className="lp-mini-total">1.920 kg</div>}
    </div>
  )
}

// ── GALERIA ─────────────────────────────────────────────────
// Blueprint: "The real thing". Fotos reais do mundo do treino, com o
// crédito embaixo de cada uma. Não é stock decorativo: sãohalteres
// reais, gente levantando peso — o que o app registra.
function Gallery() {
  return (
    <section id="galeria" className="lp-gallery-section">
      <div className="lp-container">
        <h2 className="lp-section-title">O que a régua do Voryn mede.</h2>
        <div className="lp-gallery-grid">
          {LANDING_PHOTOS.map(p => (
            <figure className="lp-gallery-item" key={p.file}>
              <img src={p.path} alt={p.caption} loading="lazy" className="lp-gallery-img" />
              <figcaption className="lp-gallery-cap">
                <span className="lp-gallery-caption">{p.caption}</span>
                <a href={p.page} target="_blank" rel="noreferrer noopener" className="lp-gallery-credit">
                  {p.creator} · {p.license}
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── DEPOIMENTOS ────────────────────────────────────────────
// Blueprint: "Quotation spread edge to edge". Uma citação curta em
// display grande, cada linha com a primeira palavra na margem
// esquerda e a última na direita.
function Testimonials() {
  const quotes = [
    { text: ['Registrei a carga', 'e parei de', 'anotar no papel.'], name: 'Rodrigo M.', role: 'Aluno', place: 'Recife, PE' },
    { text: ['Meus alunos', 'adotaram em', 'uma semana.'], name: 'Fernanda C.', role: 'Personal trainer', place: 'São Paulo, SP' },
    { text: ['Vejo quando', 'posso subir', 'a carga.'], name: 'Thiago L.', role: 'Aluno', place: 'Belo Horizonte, MG' },
  ]
  return (
    <section id="depoimentos" className="lp-quote-section">
      <div className="lp-container">
        {quotes.map(q => (
          <figure className="lp-quote" key={q.name}>
            <blockquote className="lp-quote-lines">
              {q.text.map((line, j) => (
                <span className="lp-quote-line" key={line}>
                  {j === 0 && '“'}
                  {line}
                  {j === q.text.length - 1 && '”'}
                </span>
              ))}
            </blockquote>
            <figcaption className="lp-quote-attr">
              <span className="lp-quote-name">{q.name}</span>
              <span className="lp-quote-role">{q.role}</span>
              <span className="lp-quote-place">{q.place}</span>
            </figcaption>
          </figure>
        ))}
        <p className="lp-quote-note">
          Depoimentos de demonstração, escritos para mostrar o produto. Nenhum cliente real é citado aqui.
        </p>
        <div className="lp-quote-log">
          <WorkoutLog />
        </div>
      </div>
    </section>
  )
}

// ── Fragmento: o registro de um treino (data-ui) ───────────
// O pedaço que a pessoa comum reconhece na hora: o exercício, as
// séries e o volume. É a prova de que a frase do depoimento
// ("Registrei a carga") tem um registro real atrás.
function WorkoutLog() {
  const rows = [
    { name: 'Supino reto', sets: '4 × 8', load: '80 kg' },
    { name: 'Desenvolvimento', sets: '3 × 10', load: '40 kg' },
    { name: 'Tríceps corda', sets: '3 × 12', load: '25 kg' },
  ]
  return (
    <div data-ui className="lp-log" aria-label="Registro do treino: supino reto 4 vezes 8 reps a 80 kg, desenvolvimento 3 vezes 10 reps a 40 kg, tríceps corda 3 vezes 12 reps a 25 kg">
      <div className="lp-log-head">
        <span className="lp-log-title">Peito e Tríceps</span>
        <span className="lp-log-date">12 de maio</span>
      </div>
      <ul className="lp-log-rows">
        {rows.map((r) => (
          <li className="lp-log-row" key={r.name}>
            <span className="lp-log-name">{r.name}</span>
            <span className="lp-log-sets">{r.sets}</span>
            <span className="lp-log-load">{r.load}</span>
          </li>
        ))}
      </ul>
      <div className="lp-log-foot">
        <span>Volume total</span>
        <strong>2.780 kg</strong>
      </div>
    </div>
  )
}

// ── PREÇOS ─────────────────────────────────────────────────
// Blueprint: "Plans that step up". Os três planos são degraus de
// altura: o maior plano é literalmente maior.
function Pricing() {
  const plans = Object.values(PLANS)
  return (
    <section id="pricing" className="lp-pricing-section">
      <div className="lp-container">
        <div className="lp-pricing-head">
          <h2 className="lp-section-title">Três planos, um jeito de começar.</h2>
          <p className="lp-pricing-note">14 dias grátis em todos os planos, sem cartão de crédito.</p>
        </div>
        <div className="lp-plans">
          {plans.map((plan, i) => (
            <div className={`lp-plan lp-plan-${i}${plan.highlight ? ' lp-plan-highlight' : ''}`} key={plan.id}>
              <div className="lp-plan-head">
                <h3 className="lp-plan-name">{plan.name}</h3>
                <p className="lp-plan-desc">{plan.description}</p>
                <p className="lp-plan-price">
                  <span className="lp-plan-currency">R$</span>
                  <span className="lp-plan-amount">{plan.price.toFixed(2).replace('.', ',')}</span>
                  <span className="lp-plan-period">/mês</span>
                </p>
                {plan.maxStudents > 0 && (
                  <p className="lp-plan-students">Até {plan.maxStudents} alunos</p>
                )}
              </div>
              <ul className="lp-plan-list">
                {plan.features.map(f => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link to={`/register?plan=${plan.id}`} className="lp-plan-cta">
                Começar grátis
              </Link>
            </div>
          ))}
        </div>
        <p className="lp-pricing-foot">
          Cartão de crédito, Pix ou boleto. Pagamento seguro via Mercado Pago, cancele quando quiser.
        </p>
      </div>
    </section>
  )
}

// ── FAQ ────────────────────────────────────────────────────
// Blueprint: "Accordion of filled tiles". Ladrilhos preenchidos, um
// degrau acima do chão, o aberto na cor de acento.
const FAQS = [
  ['O app funciona sem internet?','Sim. O Voryn é um PWA: depois do primeiro carregamento ele abre offline. O treino em andamento fica salvo no aparelho e sincroniza quando a conexão volta.'],
  ['O que acontece depois dos 14 dias grátis?','Você recebe um aviso por email. Se não assinar, o acesso fica limitado, mas nenhum dado seu é apagado.'],
  ['Quantos alunos um personal pode ter?','Depende do plano: o Plano Personal vai até 15 alunos e o Personal Pro até 50.'],
  ['Como funciona o pagamento?','Via Mercado Pago, com cartão, Pix ou boleto e cobrança mensal recorrente. O cancelamento é imediato, sem multa.'],
  ['Meus dados ficam seguros?','Sim. Supabase com criptografia, Row Level Security em cada tabela e conformidade com a LGPD. Seus dados de treino nunca são vendidos.'],
  ['Como o aluno entra no meu painel?','Depois de assinar o Plano Personal você gera um convite. O aluno se cadastra pelo link e fica vinculado ao seu painel. Leva menos de dois minutos.'],
  ['Consigo avaliar o corpo dos alunos?','Sim. O personal registra avaliações físicas, monta programas de treino e acompanha a evolução de cada aluno pela mesma escada de carga.'],
]

function FAQ() {
  const [open, setOpen] = useState(0)
  return (
    <section id="faq" className="lp-faq-section">
      <div className="lp-container lp-faq-grid">
        <div className="lp-faq-head-col">
          <h2 className="lp-section-title">As dúvidas que travam a decisão.</h2>
        </div>
        <div className="lp-faq-list">
          {FAQS.map(([q, a], i) => (
            <div className={`lp-faq-tile${open === i ? ' lp-faq-tile-open' : ''}`} key={q}>
              <button
                type="button"
                className="lp-faq-trigger"
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="lp-faq-q">{q}</span>
                <span className="lp-faq-icon" aria-hidden="true" />
              </button>
              {open === i && <p className="lp-faq-a">{a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA ────────────────────────────────────────────────────
// Blueprint: "A sentence with a blank". A frase tem um vão, e o vão
// é o formulário: o e-mail entra na linha, o último palavra é o botão.
function CTA() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  return (
    <section id="cta" className="lp-cta-section">
      <div className="lp-container">
        {sent ? (
          <p className="lp-cta-sentence">
            Pronto. Enviamos o acesso para <strong>{email}</strong>.
          </p>
        ) : (
          <>
            <p className="lp-cta-sentence">
              Comece pelos seus
              <form
                className="lp-cta-form"
                onSubmit={(e) => { e.preventDefault(); if (email.trim()) setSent(true) }}
              >
                <label className="sr-only" htmlFor="lp-cta-email">Seu e-mail</label>
                <input
                  id="lp-cta-email"
                  className="lp-cta-input"
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button type="submit" className="lp-cta-button">primeiros 14 dias</button>
              </form>
            </p>
            <p className="lp-cta-note">Sem cartão de crédito. Você entra direto no app.</p>
          </>
        )}
      </div>
    </section>
  )
}

// ── RODAPÉ ─────────────────────────────────────────────────
// Blueprint: "The mark, built large". A marca é construída em blocos.
const FOOTER_COLS = [
  { title: 'Produto', links: [['#features','Funcionalidades'],['#pricing','Preços'],['#faq','FAQ']] },
  { title: 'Conta', links: [['/login','Entrar'],['/register','Criar conta'],['/pricing','Planos']] },
  { title: 'Legal', links: [['/privacy','Privacidade'],['/terms','Termos']] },
]
const FOOTER_LINKS = [['#features','Funcionalidades'],['#pricing','Preços'],['#faq','FAQ'],['privacy','Privacidade'],['terms','Termos'],['credits','Créditos']]

function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer-mark" aria-label="Voryn">
          {'VORYN'.split('').map((ch, i) => (
            <span key={ch} className="lp-footer-block" style={{ height: `${64 + (i % 3) * 18}%` }}>{ch}</span>
          ))}
        </div>
        <div className="lp-footer-grid">
          {FOOTER_COLS.map(col => (
            <div className="lp-footer-col" key={col.title}>
              <p className="lp-footer-col-title">{col.title}</p>
              {col.links.map(([h, l]) => (
                <a key={h} href={h.startsWith('#') ? h : `/${h}`} className="lp-footer-link">{l}</a>
              ))}
            </div>
          ))}
          <div className="lp-footer-col">
            <p className="lp-footer-col-title">Contato</p>
            <p className="lp-footer-contact">contato@vorynapp.com.br</p>
            <p className="lp-footer-contact">Voryn Tecnologia Ltda</p>
          </div>
        </div>
        <div className="lp-footer-last">
          <span className="lp-footer-copy">© 2026 Voryn. Todos os direitos reservados.</span>
          <nav className="lp-footer-legal" aria-label="Links legais">
            {FOOTER_LINKS.map(([h, l]) => (
              <a key={h} href={h.startsWith('#') ? h : `/${h}`}>{l}</a>
            ))}
          </nav>
        </div>
        <p className="lp-footer-credits">
          Fotografias e vídeos: Wikimedia Commons — {creditSummary().join(' · ')}.
        </p>
      </div>
    </footer>
  )
}

// ── Main ───────────────────────────────────────────────────
export default function LandingPage() {
  const landingRef = useRef(null)

  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add({
      always: 'all',
      mobile: '(max-width: 760px)',
      reduced: '(prefers-reduced-motion: reduce)',
    }, ({ conditions }) => {
      // matchMedia reverts tweens AND triggers when preferences change.
      // The unanimated DOM is always the complete, readable page.
      if (conditions.reduced) return
      const distance = conditions.mobile ? 8 : 14
      const intro = gsap.timeline({ defaults: { ease: 'power3.out', clearProps: 'transform' } })
      intro
        .from('.lp-hero-title', { y: distance, duration: 0.4 }, 0)
        .from('.lp-hero-copy, .lp-hero-actions', { y: distance, duration: 0.32, stagger: 0.05 }, 0.08)
        .from('.lp-hero .lp-ladder-bar', {
          scaleY: 0.82, transformOrigin: 'center bottom', duration: 0.5,
          stagger: 0.06, clearProps: 'transform,transformOrigin',
        }, 0.08)

      // Above-the-fold content never waits for a reveal or scroll event.
      const revealItems = gsap.utils.toArray('.lp-reveal')
        .filter(element => element.getBoundingClientRect().top >= window.innerHeight)
      revealItems.forEach((element) => {
        gsap.fromTo(element,
          { autoAlpha: 0, y: distance },
          {
            autoAlpha: 1, y: 0, duration: conditions.mobile ? 0.36 : 0.48,
            ease: 'power3.out', clearProps: 'opacity,visibility,transform',
            scrollTrigger: { trigger: element, start: 'top 92%', once: true },
          },
        )
      })
    }, landingRef)
    return () => media.revert()
  }, { scope: landingRef })

  // Antes havia aqui um useEffect que injetava uma <style> com seletores
  // como `div[style*="repeat(3,1fr)"]` pra tentar empilhar as grids em
  // telas pequenas. BUG: o navegador serializa o atributo style com
  // espaço depois da vírgula ("repeat(3, 1fr)"), então esse seletor nunca
  // batia com nada — a regra inteira era morta desde o início, e as
  // grids de Funcionalidades, Depoimentos e Preços (3 colunas) e a de
  // Como Funciona (5 colunas) ficavam sempre espremidas em qualquer
  // tamanho de tela, inclusive celular. Substituído por CSS de verdade
  // em .lp-features-grid/.lp-pricing-grid/.lp-steps-grid (index.css).

  return (
    <div ref={landingRef} className="landing-shell" style={{ background: 'var(--bg)', color: 'var(--text-1)', fontFamily:"'Manrope',sans-serif" }}>
      <Nav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Gallery />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
