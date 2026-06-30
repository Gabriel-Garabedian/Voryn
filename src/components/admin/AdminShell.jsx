import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { adminService } from '@/services'
import { PLANS } from '@/services/payment'
import { Badge } from '@/components/ui'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

// ── Shell ──────────────────────────────────────────────────
export default function AdminShell() {
  const { signOut, profile } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const tabs = [
    { path: '/admin',       label: 'Dashboard' },
    { path: '/admin/users', label: 'Usuários'  },
    { path: '/admin/subs',  label: 'Assinaturas' },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Topbar */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/voryn-icon-192.png" alt="Voryn" className="w-8 h-8 rounded-lg" />
            <span className="font-display text-xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
              VORYN ADMIN
            </span>
          </div>
          <div className="flex items-center gap-6">
            {tabs.map(t => (
              <button key={t.path} onClick={() => navigate(t.path)}
                className="text-sm font-medium transition-colors"
                style={{ color: location.pathname === t.path ? 'var(--accent)' : 'var(--text-3)', border: 'none', background: 'none', cursor: 'pointer' }}>
                {t.label}
              </button>
            ))}
            <Link to="/app" className="text-sm" style={{ color: 'var(--text-3)' }}>← App</Link>
            <button onClick={signOut}
              className="text-sm px-3 py-1.5 rounded-lg border transition-all"
              style={{ color: 'var(--text-3)', borderColor: 'var(--border)', background: 'none', cursor: 'pointer' }}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Routes>
          <Route index       element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="subs"  element={<AdminSubs />} />
        </Routes>
      </div>
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div className="f-card p-5">
      <div className="font-display text-4xl leading-none mb-1" style={{ color: color || 'var(--accent)' }}>
        {value}
      </div>
      <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{label}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</div>}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="f-card px-3 py-2 text-xs" style={{ border: '1px solid rgba(var(--accent-rgb),.3)' }}>
      <p style={{ color: 'var(--text-2)' }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: '#A855F7' }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  )
}

function AdminDashboard() {
  const [stats, setStats]   = useState(null)
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([adminService.getStats(), adminService.getRecentUsers(10)])
      .then(([s, u]) => { setStats(s); setUsers(u); setLoading(false) })
  }, [])

  if (loading) return <div style={{ color: 'var(--text-3)', paddingTop: 40 }}>Carregando dashboard...</div>

  // Antes, isso gerava números aleatórios a cada reload (Math.random),
  // exibidos como se fossem dados reais de novos usuários e treinos — um
  // dos dois gráficos nem avisava que era simulado. Agora vem de
  // stats.chartData, calculado a partir de users.created_at e
  // workout_logs.date reais (ver adminService.getStats em services/index.js).
  const chartData = stats.chartData || []

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-4xl uppercase tracking-wide mb-1" style={{ color: 'var(--text-1)' }}>
          Dashboard
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          Visão geral do Voryn · Atualizado agora
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Usuários Total" value={stats.totalUsers} sub={`+${stats.newThisMonth} este mês`}/>
        <StatCard label="Alunos" value={stats.totalStudents} color="#A855F7"/>
        <StatCard label="Personais" value={stats.totalPersonals} color="#7c3aed"/>
        <StatCard label="MRR Estimado" value={`R$${stats.mrr}`} color="#4ade80" sub="receita mensal"/>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Assinaturas Ativas" value={stats.activeSubs} color="#4ade80"/>
        <StatCard label="Em Trial" value={stats.trialingSubs} color="#facc15"/>
        <StatCard label="Canceladas" value={stats.canceledSubs} color="#f87171"/>
        <StatCard label="Total Treinos" value={stats.totalWorkouts}/>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="f-card p-5">
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-1)' }}>
            Novos usuários — últimos 7 dias
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="day" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} width={25}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="novos" name="Novos" fill="var(--accent)" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="f-card p-5">
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-1)' }}>
            Treinos realizados — últimos 7 dias
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="day" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} width={30}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Line type="monotone" dataKey="treinos" name="Treinos" stroke="var(--accent-2)"
                strokeWidth={2.5} dot={{ fill: 'var(--accent)', r: 4 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MRR Breakdown */}
      <div className="f-card p-5">
        <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-1)' }}>
          Receita por plano
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { plan: 'Aluno',       price: PLANS.student.price,      color: '#7c3aed' },
            { plan: 'Personal',    price: PLANS.personal.price,     color: '#9333ea' },
            { plan: 'Personal Pro',price: PLANS.personal_pro.price, color: '#a855f7' },
          ].map(p => (
            <div key={p.plan} className="text-center p-4 rounded-xl"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="font-display text-2xl mb-1" style={{ color: p.color }}>
                R${p.price.toFixed(2).replace('.', ',')}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-3)' }}>{p.plan}/mês</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent users */}
      <div className="f-card p-5">
        <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-1)' }}>
          Usuários Recentes
        </h3>
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(var(--accent-rgb),.1)', border: '1px solid rgba(var(--accent-rgb),.2)' }}>
                <span className="font-display text-sm" style={{ color: 'var(--accent)' }}>
                  {u.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{u.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{u.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant={u.role === 'personal' ? 'accent' : 'green'}>{u.role}</Badge>
                <Badge variant={
                  u.subscriptions?.[0]?.status === 'active'   ? 'green'  :
                  u.subscriptions?.[0]?.status === 'trialing' ? 'yellow' : 'red'
                }>
                  {u.subscriptions?.[0]?.plan || 'free'}
                </Badge>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {new Date(u.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Users ──────────────────────────────────────────────────
function AdminUsers() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    adminService.getRecentUsers(200).then(u => { setUsers(u); setLoading(false) })
  }, [])

  async function changeRole(userId, role) {
    await adminService.updateUserRole(userId, role)
    setUsers(u => u.map(x => x.id === userId ? { ...x, role } : x))
  }

  async function changePlan(userId, plan) {
    await adminService.updateSubscription(userId, { plan, status: 'active' })
    setUsers(u => u.map(x => x.id === userId
      ? { ...x, subscriptions: [{ ...(x.subscriptions?.[0] || {}), plan, status: 'active' }] }
      : x
    ))
  }

  async function deleteUser(targetUser) {
    // Excluir um personal dispara cascade (trainers -> trainer_students) que
    // desvincula TODOS os alunos dele silenciosamente — funcionalmente
    // correto (sem erro), mas perigoso sem aviso: o admin podia excluir um
    // personal sem saber que estava desvinculando uma turma inteira de
    // alunos de uma vez. Antes desta correção, o confirm() era genérico
    // para qualquer tipo de usuário.
    let warningMsg = 'Excluir usuário permanentemente? Isso remove a conta de login e todos os dados associados.'
    if (targetUser.role === 'personal') {
      const { data: trainerRow } = await supabase
        .from('trainers').select('id').eq('user_id', targetUser.id).single()
      if (trainerRow) {
        const { count } = await supabase
          .from('trainer_students')
          .select('id', { count: 'exact', head: true })
          .eq('trainer_id', trainerRow.id)
          .eq('status', 'active')
        warningMsg = `Este é um PERSONAL com ${count ?? 0} aluno(s) vinculado(s). Excluí-lo desvincula todos eles imediatamente, sem aviso prévio aos alunos. Continuar?`
      }
    }
    if (!confirm(warningMsg)) return
    const { error, warning } = await adminService.deleteUser(targetUser.id)
    if (error) { alert(`Erro ao excluir: ${error.message}`); return }
    setUsers(u => u.filter(x => x.id !== targetUser.id))
    if (warning) alert(warning)
  }

  const filtered = users.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
            Usuários
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
            {users.length} usuários cadastrados
          </p>
        </div>
      </div>

      <input className="f-input max-w-sm" placeholder="Buscar por nome ou email..."
        value={search} onChange={e => setSearch(e.target.value)}/>

      {loading ? (
        <p style={{ color: 'var(--text-3)' }}>Carregando...</p>
      ) : (
        <div className="f-card overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                {['Usuário','Role','Plano','Status','Criado em','Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div className="flex items-center gap-2">
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(var(--accent-rgb),.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: 'var(--accent)' }}>
                          {u.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{u.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                      style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)', cursor: 'pointer' }}>
                      {['student','personal','admin'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <select value={u.subscriptions?.[0]?.plan || 'free'}
                      onChange={e => changePlan(u.id, e.target.value)}
                      style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)', cursor: 'pointer' }}>
                      {['free','student','personal','personal_pro'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge variant={
                      u.subscriptions?.[0]?.status === 'active'   ? 'green'  :
                      u.subscriptions?.[0]?.status === 'trialing' ? 'yellow' : 'red'
                    }>
                      {u.subscriptions?.[0]?.status || 'inactive'}
                    </Badge>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => deleteUser(u)}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, background: 'rgba(239,68,68,.1)', color: '#f87171', border: '1px solid rgba(239,68,68,.2)', cursor: 'pointer' }}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)', fontSize: 14 }}>
              Nenhum usuário encontrado.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Subscriptions ──────────────────────────────────────────
function AdminSubs() {
  const [users, setUsers] = useState([])

  useEffect(() => { adminService.getRecentUsers(200).then(setUsers) }, [])

  const byPlan   = { free: 0, student: 0, personal: 0, personal_pro: 0 }
  const byStatus = { active: 0, trialing: 0, canceled: 0, inactive: 0, past_due: 0 }
  users.forEach(u => {
    const sub = u.subscriptions?.[0]
    if (sub?.plan)   byPlan[sub.plan]     = (byPlan[sub.plan] || 0) + 1
    if (sub?.status) byStatus[sub.status] = (byStatus[sub.status] || 0) + 1
  })

  // Preços vêm de PLANS (services/payment.js) — fonte única de verdade.
  // Antes, esta tela tinha sua própria cópia hardcoded dos preços,
  // duplicada em mais 2 lugares deste mesmo arquivo e em services/index.js
  // — essa duplicação foi exatamente o que causou, numa rodada anterior, o
  // MRR sendo calculado com valores desatualizados em alguns lugares e
  // corretos em outros, sem nenhum aviso de inconsistência.
  const mrr = users
    .filter(u => u.subscriptions?.[0]?.status === 'active')
    .reduce((a, u) => a + (PLANS[u.subscriptions[0].plan]?.price || 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-4xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
          Assinaturas
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
          MRR atual: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>R${mrr.toFixed(2).replace('.', ',')}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Ativas"    value={byStatus.active}   color="#4ade80"/>
        <StatCard label="Trials"    value={byStatus.trialing} color="#facc15"/>
        <StatCard label="Canceladas"value={byStatus.canceled} color="#f87171"/>
        <StatCard label="MRR"       value={`R$${mrr.toFixed(2).replace('.',',')}`} color="var(--accent)"/>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* By plan */}
        <div className="f-card p-5">
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-1)' }}>Por plano</h3>
          {Object.entries(byPlan).map(([p, c]) => (
            <div key={p} className="flex items-center justify-between py-2"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm capitalize" style={{ color: 'var(--text-2)' }}>
                {p.replace('_', ' ')}
              </span>
              <div className="flex items-center gap-3">
                <div style={{ width: 80, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${users.length > 0 ? (c / users.length) * 100 : 0}%`,
                    height: '100%', background: 'var(--accent)', borderRadius: 3
                  }}/>
                </div>
                <span className="font-display text-lg w-8 text-right" style={{ color: 'var(--accent)' }}>{c}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue breakdown */}
        <div className="f-card p-5">
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-1)' }}>Receita por plano</h3>
          {[
            { label: 'Aluno',        count: byPlan.student,      price: PLANS.student.price },
            { label: 'Personal',     count: byPlan.personal,     price: PLANS.personal.price },
            { label: 'Personal Pro', count: byPlan.personal_pro, price: PLANS.personal_pro.price },
          ].map(p => (
            <div key={p.label} className="flex items-center justify-between py-2"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-2)' }}>
                {p.label} × {p.count}
              </span>
              <span className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>
                R${(p.count * p.price).toFixed(2).replace('.', ',')}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 mt-1">
            <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Total MRR</span>
            <span className="font-display text-2xl" style={{ color: 'var(--accent)' }}>
              R${mrr.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
