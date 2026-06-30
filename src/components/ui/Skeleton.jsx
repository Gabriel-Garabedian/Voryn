import React from 'react'

// Pulse animation done via CSS in index.css
export function SkeletonBox({ width = '100%', height = 20, radius = 8, style = {} }) {
  return (
    <div className="skeleton-pulse" style={{
      width, height, borderRadius: radius,
      background: 'var(--border)',
      ...style,
    }}/>
  )
}

export function SkeletonCard({ lines = 2, style = {} }) {
  return (
    <div className="f-card p-4 space-y-3" style={style}>
      <SkeletonBox height={16} width="60%" radius={6}/>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox key={i} height={12} width={i === lines - 1 ? '40%' : '100%'} radius={6}/>
      ))}
    </div>
  )
}

export function SkeletonHome() {
  return (
    <div className="px-4 pt-6 pb-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <SkeletonBox height={12} width={80} radius={4}/>
          <SkeletonBox height={32} width={160} radius={6}/>
          <SkeletonBox height={12} width={120} radius={4}/>
        </div>
        <SkeletonBox height={64} width={72} radius={12}/>
      </div>
      {/* CTA */}
      <SkeletonBox height={52} radius={12}/>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[...Array(4)].map((_,i) => <SkeletonBox key={i} height={64} radius={12}/>)}
      </div>
      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        {[...Array(4)].map((_,i) => <SkeletonBox key={i} height={52} radius={12}/>)}
      </div>
      {/* Calendar */}
      <SkeletonBox height={280} radius={14}/>
    </div>
  )
}

export function SkeletonList({ count = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={1}/>
      ))}
    </div>
  )
}
