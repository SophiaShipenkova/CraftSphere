import { useEffect, useMemo, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { ru } from 'date-fns/locale'
import { api, ScheduleSlot } from '../../shared/api'
import {
  datesWithSlots,
  dayHasSlots,
  formatSelectedDay,
  formatSlotTime,
  nearestDayWithSlots,
  slotsForDay
} from '../../shared/scheduleUtils'
import { useAuthStore } from '../../store/auth'

import 'react-day-picker/style.css'

type Props = {
  slots: ScheduleSlot[]
  onBooked: () => void
}

export function ScheduleCalendar({ slots, onBooked }: Props) {
  const token = useAuthStore((s) => s.token)
  const [selected, setSelected] = useState<Date | undefined>()
  const [bookedIds, setBookedIds] = useState<Set<number>>(new Set())
  const [busyId, setBusyId] = useState<number | null>(null)

  const futureSlots = useMemo(() => {
    const now = Date.now()
    return slots.filter((s) => new Date(s.start_time).getTime() >= now)
  }, [slots])

  const daysWithSlots = useMemo(() => datesWithSlots(futureSlots), [futureSlots])

  useEffect(() => {
    const nearest = nearestDayWithSlots(futureSlots)
    setSelected((prev) => {
      if (prev && dayHasSlots(futureSlots, prev)) return prev
      return nearest
    })
  }, [futureSlots])

  useEffect(() => {
    if (!token) {
      setBookedIds(new Set())
      return
    }
    api.enrollments()
      .then((list) => setBookedIds(new Set(list.map((e) => e.schedule_id))))
      .catch(() => setBookedIds(new Set()))
  }, [token, slots])

  const daySlots = selected ? slotsForDay(futureSlots, selected) : []

  async function book(scheduleId: number) {
    if (!token) {
      window.location.href = '/login'
      return
    }
    setBusyId(scheduleId)
    try {
      await api.bookSchedule(scheduleId)
      setBookedIds((prev) => new Set(prev).add(scheduleId))
      onBooked()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Не удалось записаться')
    } finally {
      setBusyId(null)
    }
  }

  async function cancel(scheduleId: number) {
    if (!token) return
    setBusyId(scheduleId)
    try {
      await api.cancelBooking(scheduleId)
      setBookedIds((prev) => {
        const next = new Set(prev)
        next.delete(scheduleId)
        return next
      })
      onBooked()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Не удалось отменить')
    } finally {
      setBusyId(null)
    }
  }

  if (!futureSlots.length) {
    return <p className="muted">Расписание пока не опубликовано.</p>
  }

  return (
    <div className="schedule-calendar card">
      <div className="schedule-calendar__picker">
        <DayPicker
          mode="single"
          locale={ru}
          selected={selected}
          onSelect={setSelected}
          disabled={(date) => !dayHasSlots(futureSlots, date)}
          modifiers={{ hasSlot: daysWithSlots }}
          modifiersClassNames={{ hasSlot: 'rdp-day_has-slot' }}
          showOutsideDays
        />
        <p className="schedule-calendar__hint muted">
          <span className="schedule-calendar__hint-dot" aria-hidden />
          Выделенные дни — есть свободные слоты
        </p>
      </div>
      <div className="schedule-calendar__slots">
        <h3 className="schedule-calendar__day-title">
          {selected ? formatSelectedDay(selected) : 'Выберите дату'}
        </h3>
        {!selected || daySlots.length === 0 ? (
          <p className="muted">На эту дату слотов нет. Выберите другой день в календаре.</p>
        ) : (
          <ul className="schedule-slot-list">
            {daySlots.map((slot) => {
              const enrolled = bookedIds.has(slot.id)
              const full = slot.seats_available <= 0
              return (
                <li
                  key={slot.id}
                  className={`schedule-slot ${enrolled ? 'schedule-slot--booked' : ''} ${full ? 'schedule-slot--full' : ''}`}
                >
                  <div className="schedule-slot__info">
                    <strong>{formatSlotTime(slot.start_time, slot.end_time)}</strong>
                    <span className="muted">{slot.location}</span>
                    <span className="muted">
                      Свободно {slot.seats_available} из {slot.seats}
                    </span>
                  </div>
                  {enrolled ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      disabled={busyId === slot.id}
                      onClick={() => cancel(slot.id)}
                    >
                      Отменить
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={full || busyId === slot.id}
                      onClick={() => book(slot.id)}
                    >
                      Записаться
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
