package com.voryn.app

import kotlin.math.*

data class OutdoorFix(val lat: Double, val lon: Double, val accuracy: Double, val time: Long)

object OutdoorMetrics {
    fun valid(fix: OutdoorFix): Boolean = fix.lat.isFinite() && fix.lon.isFinite() &&
        fix.lat in -90.0..90.0 && fix.lon in -180.0..180.0 && fix.accuracy.isFinite() && fix.accuracy in 0.0..35.0

    fun distance(a: OutdoorFix, b: OutdoorFix): Double {
        val dLat = Math.toRadians(b.lat - a.lat)
        val dLon = Math.toRadians(b.lon - a.lon)
        val h = sin(dLat / 2).pow(2) + cos(Math.toRadians(a.lat)) * cos(Math.toRadians(b.lat)) * sin(dLon / 2).pow(2)
        return 6371000.0 * 2 * asin(sqrt(h.coerceIn(0.0, 1.0)))
    }

    fun accepted(previous: OutdoorFix?, next: OutdoorFix, sport: String): Boolean {
        if (!valid(next)) return false
        if (previous == null) return true
        val seconds = (next.time - previous.time) / 1000.0
        if (seconds <= 0) return false
        val meters = distance(previous, next)
        val maxSpeed = if (sport == "cycling") 35 else if (sport == "walking") 5 else 12
        // shortcut: conservative GPS filtering, calibrate against real outdoor tracks before tuning thresholds.
        return meters >= max(5.0, min(previous.accuracy, next.accuracy) / 2) && meters / seconds <= maxSpeed
    }
}
