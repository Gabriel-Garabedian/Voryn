import React from 'react'
import { captureError } from '@/lib/sentry'

// Sem isso, qualquer exceção não tratada em qualquer componente quebrava a
// tela inteira em branco — sem fallback visível, sem nada reportado ao
// Sentry (que estava inicializado mas nunca era chamado de fato). React só
// chama componentDidCatch em class components, por isso não dá pra fazer
// isso como function component.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    captureError(error, { componentStack: info?.componentStack })
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.href = '/app'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: 'var(--bg, #080808)' }}>
        <div className="text-5xl mb-5">😕</div>
        <h1 className="font-display text-2xl uppercase tracking-wide mb-2" style={{ color: 'var(--text-1, #fff)' }}>
          Algo deu errado
        </h1>
        <p className="text-sm max-w-sm mb-8" style={{ color: 'var(--text-3, #888)' }}>
          Encontramos um erro inesperado. Já fomos notificados. Tente recarregar o app.
        </p>
        <button onClick={this.handleReload}
          className="px-8 py-3 rounded-xl font-semibold text-sm"
          style={{ background: '#820AD1', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Recarregar
        </button>
      </div>
    )
  }
}
