import { FormEvent, useEffect, useState } from 'react'
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Modal } from '../ui/Modal'
import { TagInput } from '../ui/TagInput'
import { PendingScheduleSlot, ScheduleEditor } from './ScheduleEditor'
import { api, Product, resolveMediaUrl, Service } from '../../shared/api'

type Kind = 'product' | 'service'
type ModalState = { mode: 'create' } | { mode: 'edit'; id: number }

type Props = {
  kind: Kind
  items: Product[] | Service[]
  onRefresh: () => Promise<void>
  showcaseSellerId?: number | null
}

type Draft = {
  title: string
  description: string
  price: number
  stock: number
  duration: number
  tags: string[]
  images: string[]
}

const emptyDraft = (kind: Kind): Draft => ({
  title: '',
  description: '',
  price: kind === 'product' ? 1000 : 2000,
  stock: 10,
  duration: 120,
  tags: [],
  images: []
})

function itemToDraft(item: Product | Service, kind: Kind): Draft {
  return {
    title: item.title,
    description: item.description,
    price: item.price,
    stock: kind === 'product' ? (item as Product).stock : 10,
    duration: kind === 'service' ? (item as Service).duration : 120,
    tags: [...item.tags],
    images: [...item.images]
  }
}

async function uploadFiles(files: FileList | null): Promise<string[]> {
  if (!files || files.length === 0) return []
  const uploaded = await Promise.all(Array.from(files).map((file) => api.uploadImage(file)))
  return uploaded.map((x) => x.url)
}

export function SellerInventoryManager({ kind, items, onRefresh, showcaseSellerId }: Props) {
  const [modal, setModal] = useState<ModalState | null>(null)
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(kind))
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [scheduleServiceId, setScheduleServiceId] = useState<number | null>(null)
  const [pendingScheduleSlots, setPendingScheduleSlots] = useState<PendingScheduleSlot[]>([])

  const title = kind === 'product' ? 'Товары' : 'Мастер-классы'
  const itemLabel = kind === 'product' ? 'товар' : 'мастер-класс'

  useEffect(() => {
    setModal(null)
    setMessage('')
    setError('')
    setPendingScheduleSlots([])
  }, [kind])

  function openCreate() {
    setDraft(emptyDraft(kind))
    setPendingFiles(null)
    setError('')
    setMessage('')
    setScheduleServiceId(null)
    setPendingScheduleSlots([])
    setModal({ mode: 'create' })
  }

  function openEdit(id: number) {
    const item = items.find((x) => x.id === id)
    if (!item) return
    setDraft(itemToDraft(item, kind))
    setPendingFiles(null)
    setError('')
    setMessage('')
    setScheduleServiceId(kind === 'service' ? id : null)
    setPendingScheduleSlots([])
    setModal({ mode: 'edit', id })
  }

  function closeModal() {
    if (busy) return
    setModal(null)
    setScheduleServiceId(null)
    setPendingScheduleSlots([])
    setError('')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!draft.title.trim()) {
      setError('Укажите название')
      return
    }
    if (draft.price <= 0) {
      setError('Цена должна быть больше 0')
      return
    }
    setBusy(true)
    setError('')
    try {
      const uploaded = await uploadFiles(pendingFiles)
      const images = [...draft.images, ...uploaded]
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        price: draft.price,
        images,
        tags: draft.tags
      }

      if (modal?.mode === 'create') {
        if (kind === 'product') {
          await api.createProduct({ ...payload, stock: draft.stock })
          setMessage(`${itemLabel} создан`)
          await onRefresh()
          setModal(null)
        } else {
          const slotsToCreate = [...pendingScheduleSlots]
          const savedSlotsCount = slotsToCreate.length
          const created = await api.createService({ ...payload, duration: draft.duration })
          for (const slot of slotsToCreate) {
            await api.createSchedule(created.id, {
              start_time: slot.start_time,
              end_time: slot.end_time,
              seats: slot.seats,
              location: slot.location
            })
          }
          setPendingScheduleSlots([])
          setScheduleServiceId(created.id)
          setModal({ mode: 'edit', id: created.id })
          const slotsHint =
            savedSlotsCount > 0 ? ` Сохранено слотов: ${savedSlotsCount}.` : ''
          setMessage(`Мастер-класс создан.${slotsHint} При необходимости добавьте ещё слоты ниже.`)
          await onRefresh()
        }
      } else if (modal?.mode === 'edit') {
        if (kind === 'product') {
          await api.updateProduct(modal.id, { ...payload, stock: draft.stock })
          setMessage('Изменения сохранены')
          await onRefresh()
          setModal(null)
        } else {
          await api.updateService(modal.id, { ...payload, duration: draft.duration })
          setScheduleServiceId(modal.id)
          setMessage('Изменения сохранены. Расписание — ниже.')
          await onRefresh()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    if (modal?.mode !== 'edit') return
    if (!window.confirm(`Удалить этот ${itemLabel}?`)) return
    setBusy(true)
    setError('')
    try {
      if (kind === 'product') await api.deleteProduct(modal.id)
      else await api.deleteService(modal.id)
      setMessage(`${itemLabel} удалён`)
      await onRefresh()
      setModal(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления')
    } finally {
      setBusy(false)
    }
  }

  function removeImage(url: string) {
    setDraft((d) => ({ ...d, images: d.images.filter((x) => x !== url) }))
  }

  const modalTitle =
    modal?.mode === 'create' ? `Новый ${itemLabel}` : modal?.mode === 'edit' ? 'Редактирование' : ''

  const publicPath = modal?.mode === 'edit' ? (kind === 'product' ? `/products/${modal.id}` : `/services/${modal.id}`) : null

  return (
    <div className="seller-inventory">
      <div className="seller-inventory__toolbar">
        <div>
          <h2>{title}</h2>
          <p className="muted">{items.length} в каталоге</p>
        </div>
        <div className="seller-inventory__toolbar-actions">
          {showcaseSellerId && (
            <Link className="btn btn-ghost btn-sm" to={`/sellers/${showcaseSellerId}`}>
              <ExternalLink size={16} /> Витрина
            </Link>
          )}
          <button type="button" className="btn btn-sm" onClick={openCreate}>
            <Plus size={16} /> Добавить
          </button>
        </div>
      </div>

      {(message || error) && !modal && (
        <div className={`seller-inventory__alert ${error ? 'is-error' : 'is-success'}`}>
          {error || message}
        </div>
      )}

      {items.length === 0 ? (
        <div className="seller-inventory__empty card">
          <p>Пока ничего нет.</p>
          <button type="button" className="btn" onClick={openCreate}>
            <Plus size={16} /> Создать первый {itemLabel}
          </button>
        </div>
      ) : (
        <div className="seller-inventory__grid">
          {items.map((item) => (
            <article key={item.id} className="seller-inventory__card card">
              <div className="seller-inventory__card-media">
                {item.images[0] ? (
                  <img src={resolveMediaUrl(item.images[0])} alt="" />
                ) : (
                  <span className="seller-inventory__item-placeholder">Нет фото</span>
                )}
              </div>
              <div className="seller-inventory__card-body">
                <h3>{item.title}</h3>
                <p className="muted seller-inventory__card-desc">{item.description}</p>
                <div className="seller-inventory__card-meta">
                  <strong>{item.price.toLocaleString('ru-RU')} ₽</strong>
                  {kind === 'product' && <span>Остаток: {(item as Product).stock}</span>}
                  {kind === 'service' && <span>{(item as Service).duration} мин</span>}
                </div>
                {item.tags.length > 0 && (
                  <div className="seller-inventory__card-tags">
                    {item.tags.map((t) => (
                      <span key={t} className="tag-chip tag-chip--readonly">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(item.id)}>
                  <Pencil size={14} /> Редактировать
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={modal !== null} title={modalTitle} onClose={closeModal} wide>
        <form className="seller-inventory__form" onSubmit={onSubmit}>
          {message && !error && (
            <div className="seller-inventory__alert is-success">{message}</div>
          )}
          {error && <div className="seller-inventory__alert is-error">{error}</div>}

          <label className="field">
            <span>Название</span>
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Название"
              required
              autoFocus
            />
          </label>

          <label className="field">
            <span>Описание</span>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Расскажите о товаре или формате занятия"
              rows={4}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Цена, ₽</span>
              <input
                type="number"
                min={1}
                value={draft.price}
                onChange={(e) => setDraft((d) => ({ ...d, price: Number(e.target.value) }))}
              />
            </label>
            {kind === 'product' ? (
              <label className="field">
                <span>Остаток, шт.</span>
                <input
                  type="number"
                  min={0}
                  value={draft.stock}
                  onChange={(e) => setDraft((d) => ({ ...d, stock: Number(e.target.value) }))}
                />
              </label>
            ) : (
              <label className="field">
                <span>Длительность, мин</span>
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={draft.duration}
                  onChange={(e) => setDraft((d) => ({ ...d, duration: Number(e.target.value) }))}
                />
              </label>
            )}
          </div>

          <div className="field">
            <span>Теги</span>
            <TagInput tags={draft.tags} onChange={(tags) => setDraft((d) => ({ ...d, tags }))} />
          </div>

          <div className="field">
            <span>Фотографии</span>
            <div className="seller-inventory__images">
              {draft.images.map((url) => (
                <div key={url} className="seller-inventory__thumb">
                  <img src={resolveMediaUrl(url)} alt="" />
                  <button type="button" aria-label="Удалить фото" onClick={() => removeImage(url)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPendingFiles(e.target.files)}
            />
          </div>

          <div className="modal__footer">
            <button type="submit" className="btn" disabled={busy}>
              {busy ? 'Сохранение…' : modal?.mode === 'create' ? 'Создать' : 'Сохранить'}
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={closeModal}>
              Отмена
            </button>
            {modal?.mode === 'edit' && publicPath && (
              <>
                <Link className="btn btn-ghost" to={publicPath} target="_blank">
                  Просмотр
                </Link>
                <button type="button" className="btn btn-danger" disabled={busy} onClick={onDelete}>
                  <Trash2 size={16} /> Удалить
                </button>
              </>
            )}
          </div>
        </form>

        {kind === 'service' && modal !== null && (
          <ScheduleEditor
            serviceId={scheduleServiceId}
            durationMinutes={draft.duration}
            pendingSlots={pendingScheduleSlots}
            onPendingSlotsChange={setPendingScheduleSlots}
          />
        )}
      </Modal>
    </div>
  )
}
