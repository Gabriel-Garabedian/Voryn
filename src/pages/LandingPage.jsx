import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PLANS } from '@/services/payment'

// ── Helpers ────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && e.target.classList.add('lp-revealed')),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.lp-reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

function Check() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24"
      stroke="#A855F7" strokeWidth="2.5" style={{ flexShrink: 0, marginTop: 2 }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

// ── NAV ────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(8,8,8,.88)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,.06)' : 'none',
      transition: 'all .3s',
    }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: '.1em', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/voryn-icon-192.png" alt="Voryn" style={{ width: 32, height: 32, borderRadius: 8, boxShadow: '0 0 16px rgba(130,10,209,.5)' }} />
          Voryn
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {[['#features','Funcionalidades'],['#pricing','Preços'],['#faq','FAQ']].map(([h,l]) => (
            <a key={h} href={h} style={{ color: 'rgba(255,255,255,.5)', fontSize: 14, textDecoration: 'none', transition: 'color .2s' }}
              onMouseEnter={e => e.target.style.color='#fff'}
              onMouseLeave={e => e.target.style.color='rgba(255,255,255,.5)'}>
              {l}
            </a>
          ))}
          <Link to="/login" style={{ color: 'rgba(255,255,255,.5)', fontSize: 14, textDecoration: 'none' }}>
            Entrar
          </Link>
          <Link to="/register" style={{
            background: '#820AD1', color: '#fff', fontSize: 13, fontWeight: 600,
            padding: '10px 20px', borderRadius: 10, textDecoration: 'none',
            boxShadow: '0 0 16px rgba(130,10,209,.4)', transition: 'all .2s',
          }}>
            Começar grátis
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ── HERO ───────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden', paddingTop: 100 }}>
      <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 800, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(130,10,209,.12) 0%,transparent 70%)', pointerEvents: 'none' }}/>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 32px 80px', width: '100%' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: 'clamp(72px,11vw,140px)', lineHeight: .9, letterSpacing: '.03em', color: '#fff', margin: '0 0 16px' }}>
            VORYN<br/>
            <span style={{ background: 'linear-gradient(135deg,#A855F7,#820AD1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              SEU
            </span>{' '}CORPO.
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,.5)', maxWidth: 540, margin: '0 auto 48px', lineHeight: 1.7, fontWeight: 300 }}>
            O app de academia que seu aluno vai usar todo dia.
            Calendário de consistência, tracker ao vivo, personal integrado e muito mais.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 60 }}>
            <Link to="/register" style={{ background: '#820AD1', color: '#fff', fontWeight: 600, fontSize: 16, padding: '16px 40px', borderRadius: 14, textDecoration: 'none', boxShadow: '0 0 30px rgba(130,10,209,.45)', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Começar grátis — 14 dias
            </Link>
            <a href="#pricing" style={{ color: 'rgba(255,255,255,.5)', fontSize: 15, fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '16px 20px' }}>
              Ver planos →
            </a>
          </div>
          <div style={{ display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap', paddingTop: 28, borderTop: '1px solid rgba(255,255,255,.07)' }}>
            {[['10+','Telas completas'],['PWA','Instala no celular'],['100%','Dark mode premium'],['LGPD','Conformidade garantida']].map(([v,l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: 34, color: '#A855F7', lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── FEATURES ───────────────────────────────────────────────
function Features() {
  const features = [
    { icon:'📅', title:'Calendário de Consistência',   desc:'Dias treinados destacados em roxo. Sequências automáticas. Motivação visual diária.' },
    { icon:'📋', title:'Planejador Semanal',            desc:'Monte sua rotina de Seg a Dom. Exercícios, séries e reps salvos na nuvem em tempo real.' },
    { icon:'⚡', title:'Tracker ao Vivo',               desc:'Registre cargas por série. Timer de descanso 30s–5min configurável. Vibração no celular.' },
    { icon:'🎯', title:'Metas Semanais',                desc:'Defina quantos treinos quer fazer por semana. Acompanhe com anel visual de progresso.' },
    { icon:'📈', title:'Gráficos de Evolução',          desc:'Progressão de carga por exercício, volume semanal e frequência mensal em gráficos claros.' },
    { icon:'🏆', title:'Conquistas & Streaks',          desc:'12 conquistas desbloqueáveis. Sequências de dias que criam hábito e retenção.' },
    { icon:'👤', title:'Personal Trainer Integrado',    desc:'Chat ao vivo, avaliações físicas, programas de treino e histórico compartilhado.' },
    { icon:'☁️', title:'Dados na Nuvem',                desc:'Supabase PostgreSQL com sincronização entre dispositivos e backup automático.' },
    { icon:'🔐', title:'Segurança Real',                desc:'Row Level Security, autenticação Supabase, conformidade LGPD, política de privacidade.' },
  ]
  return (
    <section id="features" style={{ padding: '120px 0', background: 'rgba(255,255,255,.01)', borderTop: '1px solid rgba(255,255,255,.05)' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 32px' }}>
        <div className="lp-reveal" style={{ textAlign: 'center', marginBottom: 72 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.25em', textTransform: 'uppercase', color: '#A855F7', marginBottom: 12 }}>Funcionalidades</p>
          <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: 'clamp(48px,7vw,88px)', lineHeight: .95, letterSpacing: '.03em', color: '#fff', marginBottom: 14 }}>TUDO QUE<br/>SEU ALUNO PRECISA.</h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,.4)', maxWidth: 480, margin: '0 auto', fontWeight: 300 }}>
            Do calendário ao tracker em tempo real — um sistema completo, em português, no celular.
          </p>
        </div>
        <div className="lp-reveal" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 24, overflow: 'hidden' }}>
          {features.map(f => (
            <div key={f.title} style={{ background: '#18181f', padding: '36px 28px', transition: 'background .2s', cursor: 'default' }}
              onMouseEnter={e => e.currentTarget.style.background='#1e1e28'}
              onMouseLeave={e => e.currentTarget.style.background='#18181f'}>
              <div style={{ width: 50, height: 50, borderRadius: 13, background: 'rgba(130,10,209,.12)', border: '1px solid rgba(130,10,209,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 18 }}>{f.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#f2f2f7', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', lineHeight: 1.65, fontWeight: 300 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── HOW IT WORKS ───────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n:'1', title:'Crie sua conta',    desc:'30 segundos. 7 dias grátis. Sem cartão de crédito necessário.' },
    { n:'2', title:'Configure a rotina', desc:'Monte seus treinos da semana com exercícios, séries e reps.' },
    { n:'3', title:'Instale no celular', desc:'Acesse pelo navegador e adicione à tela inicial como PWA nativo.' },
    { n:'4', title:'Treine e registre',  desc:'Inicie o treino, registre cargas, descanse com timer visual.' },
    { n:'5', title:'Evolua com dados',   desc:'Veja gráficos de carga, bata recordes e conecte seu personal.' },
  ]
  return (
    <section style={{ padding: '100px 0', background: '#111115', borderTop: '1px solid rgba(255,255,255,.05)', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 32px' }}>
        <div className="lp-reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.25em', textTransform: 'uppercase', color: '#A855F7', marginBottom: 12 }}>Como funciona</p>
          <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: 'clamp(44px,6vw,72px)', lineHeight: .95, letterSpacing: '.03em', color: '#fff' }}>
            5 PASSOS PARA<br/>COMEÇAR HOJE.
          </h2>
        </div>
        <div className="lp-reveal" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 0, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 38, left: '10%', right: '10%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(130,10,209,.4),transparent)' }}/>
          {steps.map(s => (
            <div key={s.n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 14px', position: 'relative', zIndex: 1 }}>
              <div style={{ width: 76, height: 76, borderRadius: '50%', background: '#08080a', border: '2px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily:"'Bebas Neue',sans-serif", fontSize: 30, color: 'rgba(255,255,255,.3)', marginBottom: 20, transition: 'all .3s', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='#820AD1'; e.currentTarget.style.color='#A855F7'; e.currentTarget.style.boxShadow='0 0 24px rgba(130,10,209,.35)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,.08)'; e.currentTarget.style.color='rgba(255,255,255,.3)'; e.currentTarget.style.boxShadow='none' }}>
                {s.n}
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f2f2f7', marginBottom: 6 }}>{s.title}</h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', lineHeight: 1.6, fontWeight: 300 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── TESTIMONIALS ───────────────────────────────────────────
function Testimonials() {
  const tests = [
    { name:'Rodrigo M., 28 anos', role:'Aluno · Recife, PE', stars:5, text:'Uso há 3 meses. O calendário de consistência me fez perceber que eu pulava muito. Agora tenho 47 dias seguidos. Nunca tive isso.' },
    { name:'Fernanda C.', role:'Personal Trainer · São Paulo', stars:5, text:'Tentei Trainerize e era caro e complicado demais. Com o Voryn, meus alunos adotaram em menos de uma semana. O chat dentro do app eliminou o WhatsApp bagunçado.' },
    { name:'Thiago L., 34 anos', role:'Aluno · Belo Horizonte', stars:5, text:'O tracker ao vivo mudou meu treino. Eu anotava em papel e sempre esquecia os pesos. Agora vejo minha progressão e fica óbvio quando preciso aumentar a carga.' },
  ]
  return (
    <section style={{ padding: '120px 0' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 32px' }}>
        <div className="lp-reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.25em', textTransform: 'uppercase', color: '#A855F7', marginBottom: 12 }}>Depoimentos</p>
          <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: 'clamp(44px,6vw,72px)', lineHeight: .95, letterSpacing: '.03em', color: '#fff' }}>
            QUEM USA,<br/>NÃO LARGA.
          </h2>
        </div>
        <div className="lp-reveal" className="lp-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {tests.map(t => (
            <div key={t.name} style={{ background: '#18181f', border: '1px solid rgba(255,255,255,.06)', borderRadius: 20, padding: '28px 24px' }}>
              <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
                {Array.from({ length: t.stars }).map((_, i) => (
                  <span key={i} style={{ color: '#820AD1', fontSize: 16 }}>★</span>
                ))}
              </div>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,.7)', lineHeight: 1.7, marginBottom: 20, fontWeight: 300, fontStyle: 'italic' }}>
                "{t.text}"
              </p>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#f2f2f7' }}>{t.name}</p>
                <p style={{ fontSize: 12, color: '#A855F7' }}>{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── PRICING ────────────────────────────────────────────────
function Pricing() {
  const plans = Object.values(PLANS)
  return (
    <section id="pricing" style={{ padding: '120px 0', background: '#111115', borderTop: '1px solid rgba(255,255,255,.05)' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 32px' }}>
        <div className="lp-reveal" style={{ textAlign: 'center', marginBottom: 72 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.25em', textTransform: 'uppercase', color: '#A855F7', marginBottom: 12 }}>Planos e Preços</p>
          <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: 'clamp(48px,7vw,88px)', lineHeight: .95, letterSpacing: '.03em', color: '#fff', marginBottom: 14 }}>
            ESCOLHA SEU<br/>PLANO.
          </h2>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.2)', borderRadius: 99, padding: '8px 18px', fontSize: 13, color: '#4ade80', marginTop: 8 }}>
            <span style={{ width: 7, height: 7, background: '#4ade80', borderRadius: '50%', display: 'inline-block' }}/>
            14 dias grátis em todos os planos — sem cartão necessário
          </div>
        </div>
        <div className="lp-reveal" className="lp-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {plans.map(plan => (
            <div key={plan.id} style={{ background: '#18181f', border: `1px solid ${plan.highlight ? '#820AD1' : 'rgba(255,255,255,.06)'}`, borderRadius: 24, padding: '32px 28px', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: plan.highlight ? '0 0 40px rgba(130,10,209,.15)' : 'none' }}>
              {plan.highlight && (
                <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: '#820AD1', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', padding: '4px 16px', borderRadius: 99 }}>
                  Mais popular
                </div>
              )}
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 6 }}>{plan.description}</p>
              <h3 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: '.04em', color: '#fff', marginBottom: 12 }}>{plan.name}</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: plan.maxStudents ? 6 : 24 }}>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: 52, color: plan.highlight ? '#A855F7' : '#fff', lineHeight: 1 }}>
                  R${plan.price.toFixed(2).replace('.', ',')}
                </span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', marginBottom: 8 }}>/mês</span>
              </div>
              {plan.maxStudents > 0 && (
                <p style={{ fontSize: 13, color: '#A855F7', marginBottom: 20 }}>Até {plan.maxStudents} alunos</p>
              )}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'rgba(255,255,255,.6)', fontWeight: 300 }}>
                    <Check/>{f}
                  </li>
                ))}
              </ul>
              <Link to={`/register?plan=${plan.id}`} style={{ background: plan.highlight ? '#820AD1' : 'rgba(255,255,255,.06)', color: '#fff', fontWeight: 600, fontSize: 14, padding: '14px 24px', borderRadius: 12, textDecoration: 'none', textAlign: 'center', display: 'block', border: plan.highlight ? 'none' : '1px solid rgba(255,255,255,.08)', boxShadow: plan.highlight ? '0 0 24px rgba(130,10,209,.4)' : 'none' }}>
                Começar grátis
              </Link>
            </div>
          ))}
        </div>
        <div className="lp-reveal" style={{ textAlign:'center', marginTop: 40, display:'flex', gap:24, justifyContent:'center', flexWrap:'wrap' }}>
          {['💳 Cartão de crédito','🏦 Pix','📄 Boleto bancário','🔒 Pagamento seguro via Mercado Pago'].map(t => (
            <span key={t} style={{ fontSize:13, color:'rgba(255,255,255,.35)', display:'flex', alignItems:'center', gap:6 }}>{t}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── FAQ ────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState(null)
  const faqs = [
    ['O app funciona sem internet?','Sim. Como é um PWA, após o primeiro carregamento funciona offline. O treino ativo fica salvo no dispositivo e sincroniza ao reconectar.'],
    ['O que acontece após o trial de 14 dias?','Você recebe um aviso por email. Se não assinar, o acesso fica limitado. Nenhum dado é perdido.'],
    ['Quantos alunos posso ter?','Depende do plano: Personal até 20 alunos, Personal Pro até 100.'],
    ['Como funciona o pagamento?','Via Mercado Pago — cartão, Pix ou boleto — com cobrança mensal recorrente. Cancele quando quiser, sem multa.'],
    ['Meus dados ficam seguros?','Sim. Supabase com criptografia, Row Level Security e conformidade LGPD. Seus dados nunca são vendidos ou compartilhados.'],
    ['Como meu aluno entra no meu painel?','Após assinar o Plano Personal, você acessa o painel de alunos e gera um convite. O aluno se cadastra com o link e fica vinculado ao seu painel automaticamente. Todo o processo leva menos de 2 minutos.'],
    ['E se o app sair do ar durante meu treino?','O Voryn é um PWA — após o primeiro acesso, funciona offline. Treinos em andamento ficam salvos no dispositivo e sincronizam quando a conexão voltar.'],
  ]
  return (
    <section id="faq" style={{ padding: '120px 0', background: '#111115', borderTop: '1px solid rgba(255,255,255,.05)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 32px' }}>
        <div className="lp-reveal" style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.25em', textTransform: 'uppercase', color: '#A855F7', marginBottom: 12 }}>Dúvidas</p>
          <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: 'clamp(44px,6vw,72px)', lineHeight: .95, letterSpacing: '.03em', color: '#fff' }}>PERGUNTAS<br/>FREQUENTES.</h2>
        </div>
        <div className="lp-reveal">
          {faqs.map(([q, a], i) => (
            <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,.06)', padding: '20px 0' }}>
              <button onClick={() => setOpen(open === i ? null : i)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', gap: 16, textAlign: 'left' }}>
                <span style={{ fontSize: 16, fontWeight: 500, color: '#f2f2f7' }}>{q}</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(130,10,209,.1)', border: '1px solid rgba(130,10,209,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16, color: '#A855F7', transform: open === i ? 'rotate(45deg)' : 'none', transition: 'all .25s' }}>+</div>
              </button>
              <div style={{ maxHeight: open === i ? 300 : 0, overflow: 'hidden', transition: 'max-height .3s ease' }}>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', lineHeight: 1.7, paddingTop: 12, fontWeight: 300 }}>{a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA ────────────────────────────────────────────────────
function CTA() {
  return (
    <section style={{ padding: '140px 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(130,10,209,.15) 0%,transparent 70%)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#820AD1,transparent)', opacity: .6 }}/>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#820AD1,transparent)', opacity: .6 }}/>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 32px', position: 'relative', zIndex: 1 }} className="lp-reveal">
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.25em', textTransform: 'uppercase', color: '#A855F7', marginBottom: 16 }}>Pronto para começar?</p>
        <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: 'clamp(64px,10vw,130px)', lineHeight: .92, letterSpacing: '.04em', color: '#fff', marginBottom: 24 }}>
          SEU APP.<br/>SEUS ALUNOS.<br/>
          <span style={{ background: 'linear-gradient(135deg,#A855F7,#820AD1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            SUA MARCA.
          </span>
        </h2>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,.4)', marginBottom: 48, fontWeight: 300 }}>
          14 dias grátis. Cancele quando quiser. Sem cartão necessário.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" style={{ background: '#820AD1', color: '#fff', fontWeight: 600, fontSize: 17, padding: '18px 48px', borderRadius: 14, textDecoration: 'none', boxShadow: '0 0 40px rgba(130,10,209,.5)', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            Começar 14 dias grátis →
          </Link>
          <a href="/login" style={{
            color: 'rgba(255,255,255,.5)', fontWeight: 600, fontSize: 14,
            padding: '12px 24px', borderRadius: 12,
            textDecoration: 'none',
            border: '1px solid rgba(255,255,255,.1)',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            🎮 Ver demo
          </a>
          <Link to="/pricing" style={{ color: 'rgba(255,255,255,.5)', fontSize: 15, fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '18px 20px' }}>
            Ver todos os planos
          </Link>
        </div>
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', marginTop: 48 }}>
          {['📱 PWA nativo no celular','🔐 LGPD compliant','💳 Cancele quando quiser','🚀 Deploy gratuito'].map(t => (
            <span key={t} style={{ fontSize: 13, color: 'rgba(255,255,255,.35)' }}>{t}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── FOOTER ─────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,.05)', padding: '40px 0' }}>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/voryn-icon-192.png" alt="Voryn" style={{ width: 24, height: 24, borderRadius: 6 }} />
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: '.1em', color: 'rgba(255,255,255,.3)' }}>Voryn</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,.2)', display: 'block' }}>© 2025 Voryn App · Todos os direitos reservados</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.12)', display: 'block', marginTop: 4 }}>
            VORYN TECNOLOGIA LTDA · CNPJ em registro · contato@vorynapp.com.br
          </span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {[['#features','Funcionalidades'],['#pricing','Preços'],['#faq','FAQ'],['privacy','Privacidade'],['terms','Termos']].map(([h,l]) => (
            <a key={h} href={h.startsWith('#') ? h : `/${h}`}
              style={{ fontSize: 13, color: 'rgba(255,255,255,.25)', textDecoration: 'none' }}>
              {l}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}

// ── Main ───────────────────────────────────────────────────
export default function LandingPage() {
  useReveal()

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .lp-reveal { opacity:0; transform:translateY(28px); transition:opacity .7s ease,transform .7s ease; }
      .lp-revealed { opacity:1; transform:translateY(0); }
      @keyframes lpPulse { 0%,100%{opacity:1} 50%{opacity:.2} }
      @media(max-width:900px){
        div[style*="repeat(3,1fr)"] { grid-template-columns:1fr!important; }
        div[style*="repeat(5,1fr)"] { grid-template-columns:1fr 1fr!important; }
      }
      @media(max-width:600px){
        div[style*="repeat(3,1fr)"] { grid-template-columns:1fr!important; }
        nav > div > div[style*="gap: 28px"] { display:none; }
      }
    `
    document.head.appendChild(style)
    return () => { try { document.head.removeChild(style) } catch {} }
  }, [])

  return (
    <div style={{ background: '#080808', color: '#fff', fontFamily:"'DM Sans',sans-serif", overflowX: 'hidden' }}>
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  )
}
