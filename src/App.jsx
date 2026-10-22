import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { useAuth } from '@/context/AuthContext'
import LoadingScreen from '@/components/ui/LoadingScreen'
import AuthRecoveryScreen from '@/components/AuthRecoveryScreen'
import IOSInstallBanner from '@/components/ui/IOSInstallBanner'
import { Capacitor } from '@capacitor/core'

const LandingPage   = lazy(() => import('@/pages/LandingPage'))
const LoginPage     = lazy(() => import('@/pages/LoginPage'))
const RegisterPage  = lazy(() => import('@/pages/RegisterPage'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const PricingPage   = lazy(() => import('@/pages/PricingPage'))
const CheckoutPage  = lazy(() => import('@/pages/CheckoutPage'))
const AppShell      = lazy(() => import('@/components/layout/AppShell'))
const AdminShell    = lazy(() => import('@/components/admin/AdminShell'))
const NotFoundPage  = lazy(() => import('@/pages/NotFoundPage'))
const PrivacyPolicy = lazy(() => import('@/pages/legal/LegalPages').then(m => ({ default: m.PrivacyPolicyPage })))
const TermsOfUse    = lazy(() => import('@/pages/legal/LegalPages').then(m => ({ default: m.TermsOfUsePage })))
const CreditsPage   = lazy(() => import('@/pages/legal/CreditsPage'))
const CommunityJoinPage = lazy(() => import('@/pages/CommunityJoinPage'))
const FriendAddPage     = lazy(() => import('@/pages/FriendAddPage'))

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuth()
  if (loading)  return <LoadingScreen />
  if (!user)    return <Navigate to="/login" replace />
  if (!profile) return <AuthRecoveryScreen />
  if (adminOnly && profile.role !== 'admin') return <Navigate to="/app" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user)    return <Navigate to="/app" replace />
  return children
}

export default function App() {
  const { user, loading, authError } = useAuth()
  if (loading) return <LoadingScreen />
  if (authError) return <AuthRecoveryScreen />

  return (
    // reducedMotion="user": respeita a preferência do sistema operacional
    // (prefers-reduced-motion). Cobre todas as animações do motion/react
    // de uma vez — transições de página, modais e microinterações.
    <MotionConfig reducedMotion="user">
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/"                 element={user ? <Navigate to="/app" replace /> : Capacitor.isNativePlatform() ? <Navigate to="/login" replace /> : <LandingPage />} />
          <Route path="/pricing"          element={<PricingPage />} />
          <Route path="/checkout/:planId" element={<CheckoutPage />} />
          <Route path="/reset-password"   element={<ResetPassword />} />
          <Route path="/privacy"          element={<PrivacyPolicy />} />
          <Route path="/terms"            element={<TermsOfUse />} />
          <Route path="/credits"          element={<CreditsPage />} />
          <Route path="/community/join/:code" element={<CommunityJoinPage />} />
          <Route path="/friend/add/:code"     element={<FriendAddPage />} />
          <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/app/*"    element={<ProtectedRoute><AppShell /></ProtectedRoute>} />
          <Route path="/admin/*"  element={<ProtectedRoute adminOnly><AdminShell /></ProtectedRoute>} />
          <Route path="*"           element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      {/* Aparece só no iOS Safari antes da instalação — instrui o usuário
          a usar Compartilhar → Adicionar à Tela de Início, já que o iOS
          nunca mostra prompt automático de instalação como o Android. */}
      <IOSInstallBanner />
    </MotionConfig>
  )
}
