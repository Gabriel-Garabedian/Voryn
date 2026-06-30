import React from 'react'
import { Link } from 'react-router-dom'

function LegalLayout({ title, children }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link to="/" className="flex items-center gap-2 text-sm mb-10" style={{ color: 'var(--text-3)' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Voltar
        </Link>
        <div className="flex items-center gap-3 mb-8">
          <img src="/voryn-icon-192.png" alt="Voryn" className="w-10 h-10 rounded-xl"
            style={{ boxShadow: '0 0 16px rgba(130,10,209,.4)' }} />
          <div>
            <h1 className="font-display text-3xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
              {title}
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Voryn Tracker · Última atualização: Junho 2025</p>
          </div>
        </div>
        <div className="prose space-y-6 text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function H2({ children }) {
  return <h2 className="font-display text-xl uppercase tracking-wide mt-8 mb-3" style={{ color: 'var(--text-1)' }}>{children}</h2>
}
function P({ children }) {
  return <p className="mb-3" style={{ color: 'var(--text-2)' }}>{children}</p>
}
function Li({ children }) {
  return <li className="flex items-start gap-2 mb-1"><span style={{ color: 'var(--accent)' }}>·</span>{children}</li>
}

export function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Política de Privacidade">
      <P>A presente Política de Privacidade descreve como o <strong>Voryn Tracker</strong> coleta, usa, armazena e protege os dados pessoais dos usuários, em conformidade com a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)</strong>.</P>

      <H2>1. Dados Coletados</H2>
      <P>Coletamos os seguintes dados para prestação do serviço:</P>
      <ul className="space-y-1 ml-2">
        <Li>Nome completo e endereço de e-mail (cadastro)</Li>
        <Li>Dados de treino: exercícios, séries, repetições e cargas registradas</Li>
        <Li>Dados corporais opcionais: peso, percentual de gordura (somente se inseridos pelo usuário)</Li>
        <Li>Registros de histórico de treinos e evolução</Li>
        <Li>Dados de pagamento processados exclusivamente pelo Mercado Pago (não armazenamos dados de cartão)</Li>
      </ul>

      <H2>2. Finalidade do Tratamento</H2>
      <P>Os dados são utilizados exclusivamente para:</P>
      <ul className="space-y-1 ml-2">
        <Li>Prestação do serviço de acompanhamento de treinos</Li>
        <Li>Comunicação sobre a conta e a assinatura</Li>
        <Li>Melhorias no produto (dados anonimizados)</Li>
        <Li>Cumprimento de obrigações legais</Li>
      </ul>

      <H2>3. Compartilhamento de Dados</H2>
      <P>Seus dados <strong>não são vendidos ou compartilhados</strong> com terceiros para fins comerciais. O compartilhamento ocorre apenas com:</P>
      <ul className="space-y-1 ml-2">
        <Li>Seu personal trainer vinculado (somente dados de treino, mediante sua autorização)</Li>
        <Li>Supabase — provedor de banco de dados e autenticação</Li>
        <Li>Mercado Pago — processador de pagamentos</Li>
        <Li>Autoridades públicas, quando exigido por lei</Li>
      </ul>

      <H2>4. Armazenamento e Segurança</H2>
      <P>Todos os dados são armazenados em servidores seguros da Supabase com criptografia em trânsito (TLS) e em repouso. Utilizamos Row Level Security (RLS) para garantir que cada usuário acesse apenas seus próprios dados.</P>

      <H2>5. Seus Direitos (LGPD)</H2>
      <P>Você tem direito a:</P>
      <ul className="space-y-1 ml-2">
        <Li>Acessar seus dados pessoais</Li>
        <Li>Corrigir dados incompletos ou incorretos</Li>
        <Li>Solicitar a exclusão completa dos seus dados</Li>
        <Li>Revogar o consentimento a qualquer momento</Li>
        <Li>Portabilidade dos dados em formato legível</Li>
      </ul>
      <P>Para exercer seus direitos, entre em contato: <strong>privacidade@vorynapp.com.br</strong></P>

      <H2>6. Exclusão de Conta</H2>
      <P>Você pode solicitar a exclusão completa da sua conta e de todos os dados associados a qualquer momento pelo próprio aplicativo (Perfil → Excluir conta) ou por e-mail. A exclusão é processada em até 30 dias.</P>

      <H2>7. Cookies e Rastreamento</H2>
      <P>O Voryn utiliza apenas cookies essenciais para manter a sessão autenticada. Não utilizamos cookies de rastreamento ou publicidade.</P>

      <H2>8. Alterações nesta Política</H2>
      <P>Eventuais atualizações serão comunicadas por e-mail e/ou notificação no aplicativo com antecedência mínima de 15 dias.</P>

      <H2>9. Contato</H2>
      <P>Dúvidas sobre privacidade: <strong>privacidade@vorynapp.com.br</strong><br/>Encarregado de Dados (DPO): A ser designado conforme crescimento da empresa.</P>
    </LegalLayout>
  )
}

export function TermsOfUsePage() {
  return (
    <LegalLayout title="Termos de Uso">
      <P>Ao criar uma conta no <strong>Voryn Tracker</strong>, você concorda com os presentes Termos de Uso. Leia atentamente antes de utilizar o serviço.</P>

      <H2>1. Descrição do Serviço</H2>
      <P>O Voryn é uma plataforma SaaS de acompanhamento de treinos voltada a alunos e personal trainers. O serviço é prestado por meio de assinatura mensal recorrente.</P>

      <H2>2. Cadastro e Conta</H2>
      <ul className="space-y-1 ml-2">
        <Li>Você deve ter no mínimo 16 anos para criar uma conta</Li>
        <Li>As informações cadastrais devem ser verídicas e atualizadas</Li>
        <Li>Você é responsável pela segurança da sua senha</Li>
        <Li>É proibido criar contas falsas ou usar o serviço em nome de terceiros sem autorização</Li>
      </ul>

      <H2>3. Planos e Pagamentos</H2>
      <ul className="space-y-1 ml-2">
        <Li>O período de teste gratuito é de 7 dias, sem necessidade de cartão</Li>
        <Li>Após o trial, a assinatura é cobrada mensalmente via Mercado Pago</Li>
        <Li>O cancelamento pode ser feito a qualquer momento, sem multa</Li>
        <Li>O acesso permanece ativo até o fim do período pago após cancelamento</Li>
        <Li>Não realizamos reembolso de períodos já cobrados, salvo falha comprovada do serviço</Li>
      </ul>

      <H2>4. Uso Aceitável</H2>
      <P>É proibido:</P>
      <ul className="space-y-1 ml-2">
        <Li>Usar o serviço para fins ilegais</Li>
        <Li>Tentar acessar dados de outros usuários</Li>
        <Li>Automatizar requisições sem autorização prévia</Li>
        <Li>Revender o acesso ao serviço sem autorização</Li>
      </ul>

      <H2>5. Disponibilidade do Serviço</H2>
      <P>Nos esforçamos para manter o serviço disponível 24/7, mas não garantimos disponibilidade ininterrupta. Manutenções planejadas serão comunicadas com antecedência.</P>

      <H2>6. Propriedade Intelectual</H2>
      <P>O código, design e marca Voryn são de propriedade exclusiva do desenvolvedor. Os dados inseridos pelo usuário são de propriedade do usuário.</P>

      <H2>7. Limitação de Responsabilidade</H2>
      <P>O Voryn não se responsabiliza por lesões físicas decorrentes de treinos registrados na plataforma. A plataforma é uma ferramenta de registro e acompanhamento, não um substituto para orientação médica ou profissional de educação física.</P>

      <H2>8. Rescisão</H2>
      <P>Reservamo-nos o direito de suspender contas que violem estes termos, mediante notificação prévia quando possível.</P>

      <H2>9. Foro</H2>
      <P>Fica eleito o foro da Comarca de Recife/PE para dirimir eventuais conflitos decorrentes destes termos.</P>

      <H2>10. Contato</H2>
      <P>suporte@vorynapp.com.br</P>
    </LegalLayout>
  )
}
