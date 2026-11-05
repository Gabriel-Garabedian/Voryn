package com.voryn.app

import org.junit.Assert.*
import org.junit.Test

class OutdoorMetricsTest {
    @Test fun distanceUsesMeters() {
        assertEquals(111.19, OutdoorMetrics.distance(OutdoorFix(0.0, 0.0, 5.0, 0), OutdoorFix(0.001, 0.0, 5.0, 10000)), 0.1)
    }
    @Test fun rejectsInvalidAndInaccurateFixes() {
        assertFalse(OutdoorMetrics.accepted(null, OutdoorFix(Double.NaN, 0.0, 5.0, 1000), "running"))
        assertFalse(OutdoorMetrics.accepted(null, OutdoorFix(91.0, 0.0, 5.0, 1000), "running"))
        assertFalse(OutdoorMetrics.accepted(null, OutdoorFix(0.0, 0.0, 100.0, 1000), "running"))
        assertTrue(OutdoorMetrics.accepted(null, OutdoorFix(0.0, 0.0, 10.0, 1000), "running"))
    }
    @Test fun rejectsJitterTimeReversalAndImpossibleJumps() {
        val a = OutdoorFix(0.0, 0.0, 5.0, 10000)
        assertFalse(OutdoorMetrics.accepted(a, OutdoorFix(0.00001, 0.0, 5.0, 15000), "running"))
        assertFalse(OutdoorMetrics.accepted(a, OutdoorFix(0.001, 0.0, 5.0, 9000), "running"))
        assertFalse(OutdoorMetrics.accepted(a, OutdoorFix(1.0, 0.0, 5.0, 15000), "running"))
        assertTrue(OutdoorMetrics.accepted(a, OutdoorFix(0.0001, 0.0, 5.0, 15000), "walking"))
    }
}
