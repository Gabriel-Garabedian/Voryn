import React from 'react'
import { Link } from 'react-router-dom'

export const ANDROID_APK = '/downloads/voryn-1.6.apk'

export default function DownloadAndroidPage() {
  return <main className="min-h-dvh px-5 py-12" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
    <div className="max-w-xl mx-auto space-y-7">
      <Link to="/" className="health-text-button">← Voltar ao Voryn</Link>
      <header className="space-y-3"><img src="/voryn-logo-purple.png" alt="" className="w-16 h-16 rounded-2xl" /><h1 className="text-3xl font-bold">Voryn no seu Android</h1><p style={{ color: 'var(--text-3)' }}>Use sua conta de sempre e tenha os recursos do aplicativo no celular.</p></header>
      <section className="f-card p-5 space-y-4" aria-labelledby="android-download-title">
        <h2 id="android-download-title" className="text-lg font-semibold">Baixar aplicativo</h2>
        <p className="text-sm">Versão 1.6 de teste · aproximadamente 20 MB · Android 9 ou superior.</p>
        <a href={ANDROID_APK} download="voryn-1.6.apk" className="f-btn f-btn-accent">Baixar APK para Android</a>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>O arquivo é para celulares Android. No iPhone, continue usando o Voryn pelo navegador.</p>
      </section>
      <section className="space-y-4" aria-labelledby="android-install-title"><h2 id="android-install-title" className="text-xl font-semibold">Como instalar</h2>
        <ol className="list-decimal pl-5 space-y-3 text-sm"><li>Baixe o arquivo e abra-o pela pasta Downloads do seu celular.</li><li>Se o Android pedir, autorize este navegador a instalar o aplicativo e confirme a instalação.</li><li>Abra o Voryn e entre com o mesmo email e senha que você usa no site.</li></ol>
        <p className="text-sm">Já tem o Voryn? Instale por cima da versão atual. Evite desinstalar para preservar registros locais ainda não sincronizados.</p>
      </section>
      <section className="f-card p-5 space-y-3"><h2 className="font-semibold">Recursos de saúde</h2><p className="text-sm">Ative a contagem automática na tela Passos e autorize atividade física. O sono pelo celular oferece horários estimados para você conferir. Água, alimentação e peso podem ser registrados manualmente.</p><p className="text-sm" style={{ color: 'var(--text-3)' }}>Esta versão ainda está em testes. Sensores e funcionamento em segundo plano dependem do aparelho e das permissões do Android.</p></section>
      <Link to="/login" className="health-text-button">Continuar no navegador →</Link>
    </div>
  </main>
}
