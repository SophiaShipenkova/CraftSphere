import { FormEvent, useCallback, useEffect, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { CalendarPlus, Pencil, Trash2 } from 'lucide-react'

import { api, ScheduleSlot } from '../../shared/api'
import { formatSlotTime } from '../../shared/scheduleUtils'

export type PendingScheduleSlot = {
  tempId: string
  start_time: string
  end_time: string
  seats: number
  location: string
}

type SlotDraft = {
  date: string
  startTime: string
  endTime: string
  seats: number
  location: string
}

type Props = {
  /** null — черновик до сохранения мастер-класса (слоты только в pending) */
  serviceId: number | null
  durationMinutes: number
  pendingSlots?: PendingScheduleSlot[]
  onPendingSlotsChange?: (slots: PendingScheduleSlot[]) => void
}

function localTodayYmd(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function addDaysToYmd(dateStr: string, days: number): string {
  const base = parseISO(`${dateStr}T12:00:00`)
  return format(addDays(base, days), 'yyyy-MM-dd')
}

const emptySlot = (durationMinutes: number): SlotDraft => {
  const date = localTodayYmd()
  const startTime = '11:00'
  const end = addMinutesToTime(startTime, durationMinutes)
  return {
    date,
    startTime,
    endTime: end,
    seats: 8,
    location: 'Студия'
  }
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

function toISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString()
}

function slotToDraft(slot: ScheduleSlot): SlotDraft {
  const start = new Date(slot.start_time)
  const end = new Date(slot.end_time)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
    seats: slot.seats,
    location: slot.location
  }
}

function pendingToDraft(p: PendingScheduleSlot): SlotDraft {
  return slotToDraft({
    id: 0,
    service_id: 0,
    start_time: p.start_time,
    end_time: p.end_time,
    seats: p.seats,
    seats_booked: 0,
    seats_available: p.seats,
    location: p.location
  })
}

function newTempId(): string {
  return crypto.randomUUID()
}

export function ScheduleEditor({
  serviceId,
  durationMinutes,
  pendingSlots = [],
  onPendingSlotsChange
}: Props) {
  const isDraftMode = serviceId === null
  const setPending = onPendingSlotsChange ?? (() => {})

  const [slots, setSlots] = useState<ScheduleSlot[]>([])
  const [draft, setDraft] = useState<SlotDraft>(() => emptySlot(durationMinutes))
  const [editingApiId, setEditingApiId] = useState<number | null>(null)
  const [editingTempId, setEditingTempId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [weeklyRepeat, setWeeklyRepeat] = useState(false)
  const [weekCount, setWeekCount] = useState(8)

  const load = useCallback(() => {
    if (serviceId === null) return
    api.serviceSchedule(serviceId).then(setSlots).catch(console.error)
  }, [serviceId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!editingApiId && !editingTempId) {
      setDraft(emptySlot(durationMinutes))
    }
  }, [durationMinutes, editingApiId, editingTempId])

  function onStartTimeChange(startTime: string) {
    setDraft((d) => ({
      ...d,
      startTime,
      endTime: addMinutesToTime(startTime, durationMinutes)
    }))
  }

  function buildOccurrenceDates(): string[] {
    if (!weeklyRepeat || editingApiId || editingTempId) {
      return [draft.date]
    }
    const n = Math.min(52, Math.max(1, weekCount))
    return Array.from({ length: n }, (_, i) => addDaysToYmd(draft.date, i * 7))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!draft.location.trim()) {
      setError('Укажите место проведения')
      return
    }

    const dates = buildOccurrenceDates()

    for (const dateStr of dates) {
      const startIso = toISO(dateStr, draft.startTime)
      const endIso = toISO(dateStr, draft.endTime)
      if (new Date(endIso) <= new Date(startIso)) {
        setError('Время окончания должно быть позже начала')
        return
      }
    }

    setBusy(true)
    setError('')
    try {
      const payloads = dates.map((dateStr) => ({
        start_time: toISO(dateStr, draft.startTime),
        end_time: toISO(dateStr, draft.endTime),
        seats: draft.seats,
        location: draft.location.trim()
      }))

      if (isDraftMode) {
        let next = [...pendingSlots]
        if (editingTempId) {
          if (payloads.length !== 1) {
            setError('При редактировании слота недельное повторение недоступно')
            setBusy(false)
            return
          }
          next = next.map((p) =>
            p.tempId === editingTempId ? { ...p, ...payloads[0], tempId: p.tempId } : p
          )
          setEditingTempId(null)
        } else {
          const additions: PendingScheduleSlot[] = payloads.map((payload) => ({
            tempId: newTempId(),
            ...payload
          }))
          next = [...next, ...additions]
        }
        setPending(next)
      } else {
        if (editingApiId) {
          if (payloads.length !== 1) {
            setError('При редактировании слота недельное повторение недоступно')
            setBusy(false)
            return
          }
          await api.updateSchedule(serviceId!, editingApiId, payloads[0])
          setEditingApiId(null)
        } else {
          for (const payload of payloads) {
            await api.createSchedule(serviceId!, payload)
          }
        }
        load()
      }

      setDraft(emptySlot(durationMinutes))
      setWeeklyRepeat(false)
      setWeekCount(8)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить слот')
    } finally {
      setBusy(false)
    }
  }

  function startEdit(slot: ScheduleSlot) {
    setEditingApiId(slot.id)
    setEditingTempId(null)
    setDraft(slotToDraft(slot))
    setWeeklyRepeat(false)
    setError('')
  }

  function startEditPending(p: PendingScheduleSlot) {
    setEditingTempId(p.tempId)
    setEditingApiId(null)
    setDraft(pendingToDraft(p))
    setWeeklyRepeat(false)
    setError('')
  }

  function cancelEdit() {
    setEditingApiId(null)
    setEditingTempId(null)
    setDraft(emptySlot(durationMinutes))
    setWeeklyRepeat(false)
    setError('')
  }

  async function removeApiSlot(slot: ScheduleSlot) {
    if (slot.seats_booked > 0) {
      if (!window.confirm('На этот слот уже есть записи. Удалить всё равно?')) return
    } else if (!window.confirm('Удалить этот слот из расписания?')) {
      return
    }
    setBusy(true)
    try {
      await api.deleteSchedule(serviceId!, slot.id)
      if (editingApiId === slot.id) cancelEdit()
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить')
    } finally {
      setBusy(false)
    }
  }

  function removePendingSlot(tempId: string) {
    if (!window.confirm('Удалить этот слот из списка?')) return
    setPending(pendingSlots.filter((p) => p.tempId !== tempId))
    if (editingTempId === tempId) cancelEdit()
  }

  const editingSomething = editingApiId !== null || editingTempId !== null

  const sortedApiSlots = [...slots].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )
  const sortedPending = [...pendingSlots].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )

  const nowMs = Date.now()

  const pendingHint =
    isDraftMode &&
    !editingSomething &&
    weeklyRepeat &&
    `Будет добавлено ${Math.min(52, Math.max(1, weekCount))} занятий по выбранным дню недели и времени.`

  const apiHint =
    !isDraftMode &&
    !editingSomething &&
    weeklyRepeat &&
    `Будет создано ${Math.min(52, Math.max(1, weekCount))} занятий (каждую неделю).`

  return (
    <div className="schedule-editor">
      <h3 className="schedule-editor__title">Расписание занятий</h3>
      <p className="muted schedule-editor__hint">
        Добавьте даты и время записи. Длительность по умолчанию для расчёта конца слота — {durationMinutes}{' '}
        мин.
        {isDraftMode && ' Слоты сохранятся на сервере после нажатия «Создать» вместе с карточкой.'}
      </p>

      {error && <div className="seller-inventory__alert is-error">{error}</div>}

      <form className="schedule-editor__form" onSubmit={onSubmit}>
        <div className="schedule-editor__row">
          <label className="field">
            <span>Дата первого занятия</span>
            <input
              type="date"
              value={draft.date}
              onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span>Начало</span>
            <input
              type="time"
              value={draft.startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Конец</span>
            <input
              type="time"
              value={draft.endTime}
              onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
              required
            />
          </label>
        </div>
        <div className="schedule-editor__row">
          <label className="field">
            <span>Мест</span>
            <input
              type="number"
              min={1}
              value={draft.seats}
              onChange={(e) => setDraft((d) => ({ ...d, seats: Number(e.target.value) }))}
              required
            />
          </label>
          <label className="field schedule-editor__location">
            <span>Место / формат</span>
            <input
              value={draft.location}
              onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
              placeholder="Студия, онлайн (Zoom)..."
              required
            />
          </label>
        </div>

        <label className="schedule-editor__check field">
          <input
            type="checkbox"
            checked={weeklyRepeat}
            disabled={!!editingSomething}
            onChange={(e) => setWeeklyRepeat(e.target.checked)}
          />
          <span>Повторять каждую неделю</span>
        </label>

        {weeklyRepeat && !editingSomething && (
          <label className="field schedule-editor__weeks">
            <span>Число занятий (недель подряд)</span>
            <input
              type="number"
              min={1}
              max={52}
              value={weekCount}
              onChange={(e) => setWeekCount(Number(e.target.value))}
            />
          </label>
        )}

        {(pendingHint || apiHint) && <p className="muted schedule-editor__repeat-hint">{pendingHint || apiHint}</p>}

        <div className="schedule-editor__actions">
          <button type="submit" className="btn btn-sm" disabled={busy}>
            <CalendarPlus size={14} />
            {editingSomething ? 'Сохранить слот' : weeklyRepeat ? 'Добавить серию слотов' : 'Добавить слот'}
          </button>
          {editingSomething && (
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={cancelEdit}>
              Отмена
            </button>
          )}
        </div>
      </form>

      {isDraftMode && sortedPending.length === 0 && (
        <p className="muted">Пока нет слотов в черновике — добавьте занятия выше (можно несколько раз).</p>
      )}

      {isDraftMode && sortedPending.length > 0 && (
        <ul className="schedule-editor__list">
          {sortedPending.map((p) => (
            <li
              key={p.tempId}
              className={`schedule-editor__item ${editingTempId === p.tempId ? 'is-editing' : ''}`}
            >
              <div>
                <strong>
                  {new Date(p.start_time).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </strong>
                <span className="muted"> · {formatSlotTime(p.start_time, p.end_time)}</span>
                <div className="muted schedule-editor__item-meta">
                  {p.location} · мест: {p.seats}
                  <span className="schedule-editor__draft-badge"> черновик</span>
                </div>
              </div>
              <div className="schedule-editor__item-btns">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => startEditPending(p)}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => removePendingSlot(p.tempId)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isDraftMode && sortedApiSlots.length === 0 && (
        <p className="muted">Слотов пока нет — добавьте занятия выше.</p>
      )}

      {!isDraftMode && sortedApiSlots.length > 0 && (
        <ul className="schedule-editor__list">
          {sortedApiSlots.map((slot) => {
            const isPast = new Date(slot.start_time).getTime() < nowMs
            return (
              <li
                key={slot.id}
                className={`schedule-editor__item ${editingApiId === slot.id ? 'is-editing' : ''} ${
                  isPast ? 'is-past' : ''
                }`}
              >
                <div>
                  <strong>
                    {new Date(slot.start_time).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </strong>
                  <span className="muted"> · {formatSlotTime(slot.start_time, slot.end_time)}</span>
                  <div className="muted schedule-editor__item-meta">
                    {slot.location} · свободно {slot.seats_available} из {slot.seats}
                    {slot.seats_booked > 0 && ` · записано ${slot.seats_booked}`}
                    {isPast && <span className="schedule-editor__past-badge"> прошло</span>}
                  </div>
                </div>
                <div className="schedule-editor__item-btns">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busy}
                    onClick={() => startEdit(slot)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={busy}
                    onClick={() => removeApiSlot(slot)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
