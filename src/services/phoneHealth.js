import { Capacitor, registerPlugin } from '@capacitor/core'

const PhoneHealth = registerPlugin('PhoneHealth')
export const phoneHealth = {
  available: () => Capacitor.getPlatform() === 'android',
  read: userId => PhoneHealth.read({ userId }),
  start: userId => PhoneHealth.start({ userId }),
  stop: () => PhoneHealth.stop(),
  openSleepSettings: () => PhoneHealth.openSleepSettings(),
  sleepCandidates: userId => PhoneHealth.sleepCandidates({ userId }),
}

// Each day uses one step source. Never add the phone total to Health Connect.
export function withPhoneSteps(days, phoneDays) {
  const merged = new Map(days.map(day => [day.date, { ...day }]))
  for (const phone of phoneDays) {
    const day = merged.get(phone.date) || { date: phone.date }
    merged.set(phone.date, { ...day, steps: phone.steps, sources: { ...day.sources, steps: 'phone' } })
  }
  return [...merged.values()].sort((a, b) => b.date.localeCompare(a.date))
}
