import React, { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { healthService, healthErrorMessage } from '@/services/health'
import { HEALTH_PAGES } from '@/services/healthRecords'
import useHealthData, { hasHealthValues } from '@/hooks/useHealthData'
import { HealthIcon } from '@/components/health/HealthVisuals'

export default function HealthView() {
  const { user } = useAuth()
  const data = useHealthData(user.id)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const root = useRef(null)
  const busy = data.busy || working
  const android = healthService.isAndroid()
  useEffect(() => { const scroll = root.current?.closest('.app-content'); if (scroll) scroll.scrollTop = 0 }, [])
  async function action(operation, success) {
    setWorking(true); setActionError(''); setMessage('')
    try { await operation(); setMessage(success) }
    catch (error) { setActionError(healthErrorMessage(error)) }
    finally { setWorking(false) }
  }
  const names = { steps: 'Passos', sleep: 'Sono', nutrition: 'Alimentação', water: 'Água', weight: 'Peso' }
  const hasImported = hasHealthValues(data.imported)

  return <section ref={root} className="max-w-3xl mx-auto p-4 space-y-5" style={{ color: 'var(--text-1)' }}>
    <Link to="/app" className="health-text-button">← Início</Link>
    <header><h1 className="text-2xl font-semibold">Saúde</h1><p className="text-sm mt-2" style={{ color: 'var(--text-3)' }}>Suas categorias, registros e fontes de dados.</p></header>
    <div className="health-category-links">{Object.entries(HEALTH_PAGES).map(([path, metric]) => <Link key={path} to={`/app/health/${path}`}><HealthIcon type={metric.permission} /><span>{metric.label}<small>Registros, histórico e lançamento manual</small></span><span aria-hidden="true">↗</span></Link>)}</div>
    <section className="health-detail space-y-4" aria-labelledby="health-connect-heading">
      <h2 id="health-connect-heading" className="font-semibold">Health Connect</h2>
      <p className="text-sm" style={{ color: 'var(--text-2)' }}>{android ? 'A autorização está separada da disponibilidade dos dados. O Voryn só pode importar registros que existam no Health Connect.' : 'A importação do Health Connect está disponível no Android. Você pode registrar informações manualmente nas telas de cada categoria.'}</p>
      {android && <>
        <p className="text-sm">Categorias autorizadas: {Object.entries(names).filter(([key]) => data.status?.permissions?.includes(key)).map(([, label]) => label).join(', ') || 'nenhuma'}.</p>
        <div className="flex flex-wrap gap-2">
          <button className="f-btn f-btn-accent" disabled={busy || data.status?.available === false} onClick={() => action(async () => { await healthService.connect(); await data.refresh() }, 'Permissões verificadas.')}>Conectar / alterar permissões</button>
          <button className="f-btn f-btn-ghost" disabled={busy} onClick={data.refresh}>Sincronizar agora</button>
          <button className="f-btn f-btn-ghost" disabled={busy} onClick={() => action(healthService.openSettings, '')}>{data.status?.needsUpdate ? 'Instalar / atualizar Health Connect' : 'Abrir Health Connect'}</button>
          <button className="f-btn f-btn-ghost" disabled={busy || !data.status?.permissions?.length} onClick={data.diagnose}>Verificar dados na fonte</button>
        </div>
        {data.status && !data.status.available && <p className="text-sm">Health Connect indisponível neste dispositivo. Instale ou atualize o provedor e confira se está usando o perfil principal do celular.</p>}
      </>}
      {data.notice && <p role="status" className="health-source-notice">{data.notice}</p>}
      {data.diagnostics && <div className="health-source-diagnostics"><h3 className="text-sm font-semibold">Registros encontrados no Health Connect · últimos sete dias</h3>{data.diagnostics.categories.map(category => <div key={category.category}><span>{names[category.category]}</span><strong>{!category.allowed ? 'Sem autorização' : category.hasRecords ? 'Há registros' : 'Nenhum registro'}</strong>{category.sources?.length > 0 && <small>Fonte: {category.sources.map(source => source === 'com.sec.android.app.shealth' ? 'Samsung Health' : source).join(', ')}</small>}</div>)}<p className="text-xs mt-3">Se aparecer “Nenhum registro”, permitir acesso ao Voryn não basta: a fonte precisa compartilhar esses dados. Se aparecer “Há registros”, mas os valores continuarem vazios, envie uma captura deste diagnóstico.</p></div>}
      <details className="text-sm"><summary className="cursor-pointer py-2 font-semibold">Como compartilhar dados do Samsung Health</summary><ol className="list-decimal pl-5 space-y-2 mt-2" style={{ color: 'var(--text-2)' }}><li>No Samsung Health, abra Configurações → Health Connect e autorize a gravação das categorias desejadas.</li><li>Abra o Samsung Health para atualizar seus registros.</li><li>No Health Connect, confira os dados de atividade, sono, nutrição e medidas corporais. Os valores precisam estar disponíveis ali.</li><li>Volte ao Voryn e toque em Sincronizar agora.</li></ol></details>
    </section>
    {busy && <p role="status" className="text-sm">Atualizando…</p>}
    {(actionError || data.error) && <p role="alert" className="text-sm text-red-400">{actionError || data.error}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    <section className="health-detail space-y-4"><h2 className="font-semibold">Resumos importados na conta</h2><p className="text-sm" style={{ color: 'var(--text-3)' }}>A leitura do celular fica nesta sessão. Use o botão abaixo para salvar os valores importados no Supabase. Os registros manuais são salvos quando você envia o formulário, nas telas de cada categoria.</p>
      {!hasImported && <p className="text-sm">Nenhum valor importado disponível para salvar. Consultas vazias não são apresentadas como importação concluída.</p>}
      <div className="flex flex-wrap gap-2"><button className="f-btn f-btn-accent" disabled={busy || !hasImported} onClick={() => action(() => healthService.save(user.id, { days: data.imported, syncedAt: data.imported.find(day => day.synced_at)?.synced_at || new Date().toISOString() }), 'Resumos importados salvos na sua conta.')}>Salvar resumos importados na conta</button><button className="f-btn f-btn-ghost" disabled={busy} onClick={() => setConfirmDelete(true)}>Excluir resumos importados</button></div>
      {confirmDelete && <div className="text-sm space-y-3"><p>Excluir os resumos importados salvos na conta? Seus registros manuais e os dados originais do Health Connect serão preservados.</p><button className="f-btn f-btn-ghost mr-2" disabled={busy} onClick={() => action(async () => { await healthService.remove(user.id); setConfirmDelete(false) }, 'Resumos importados excluídos da conta.')}>Confirmar exclusão</button><button className="f-btn f-btn-ghost" disabled={busy} onClick={() => setConfirmDelete(false)}>Cancelar</button></div>}
      <p className="text-xs" style={{ color: 'var(--text-3)' }}>Você pode revogar o acesso no Health Connect. Os dados deste módulo são privados da sua conta e não são disponibilizados a personal trainers.</p>
    </section>
  </section>
}
