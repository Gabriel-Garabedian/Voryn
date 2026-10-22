import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const platform = vi.hoisted(() => ({ native: false }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => platform.native } }))
import AndroidDownloadLink from '@/components/AndroidDownloadLink'
import DownloadAndroidPage from '@/pages/DownloadAndroidPage'
beforeEach(() => { platform.native = false })
afterEach(cleanup)
describe('Android web download', () => {
  it('links website visitors to the installation page', () => {
    render(<MemoryRouter><AndroidDownloadLink /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Baixar para Android' })).toHaveAttribute('href', '/download')
  })
  it('hides the download promotion inside the installed native application', () => {
    platform.native = true
    render(<MemoryRouter><AndroidDownloadLink /></MemoryRouter>)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
  it('provides a direct versioned APK download and update instructions', () => {
    render(<MemoryRouter><DownloadAndroidPage /></MemoryRouter>)
    const download = screen.getByRole('link', { name: 'Baixar APK para Android' })
    expect(download).toHaveAttribute('href', '/downloads/voryn-1.6.apk')
    expect(download).toHaveAttribute('download', 'voryn-1.6.apk')
    expect(screen.getByText(/Instale por cima da versão atual/)).toBeInTheDocument()
    expect(screen.getByText(/Versão 1.6 de teste/)).toBeInTheDocument()
  })
})
