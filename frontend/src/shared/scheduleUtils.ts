import { format, isSameDay, parseISO, startOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'

import { ScheduleSlot } from './api'

export function slotDateKey(iso: string): string {
  return format(parseISO(iso), 'yyyy-MM-dd')
}

export function groupSlotsByDate(slots: ScheduleSlot[]): Map<string, ScheduleSlot[]> {
  const map = new Map<string, ScheduleSlot[]>()
  const now = Date.now()
  for (const slot of slots) {
    if (new Date(slot.start_time).getTime() < now) continue
    const key = slotDateKey(slot.start_time)
    const list = map.get(key) ?? []
    list.push(slot)
    map.set(key, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }
  return map
}

export function datesWithSlots(slots: ScheduleSlot[]): Date[] {
  const keys = [...groupSlotsByDate(slots).keys()].sort()
  return keys.map((k) => parseISO(`${k}T12:00:00`))
}

export function formatSlotTime(start: string, end: string): string {
  const s = parseISO(start)
  const e = parseISO(end)
  return `${format(s, 'HH:mm', { locale: ru })} – ${format(e, 'HH:mm', { locale: ru })}`
}

export function formatSelectedDay(date: Date): string {
  return format(date, 'd MMMM yyyy', { locale: ru })
}

export function slotsForDay(slots: ScheduleSlot[], day: Date): ScheduleSlot[] {
  return slots.filter((s) => isSameDay(parseISO(s.start_time), day))
}

export function nearestDayWithSlots(slots: ScheduleSlot[]): Date | undefined {
  const days = datesWithSlots(slots)
  return days[0]
}

export function dayHasSlots(slots: ScheduleSlot[], day: Date): boolean {
  return slots.some((s) => isSameDay(parseISO(s.start_time), day))
}

export function startOfDayLocal(d: Date): Date {
  return startOfDay(d)
}
