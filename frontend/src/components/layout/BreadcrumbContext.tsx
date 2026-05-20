import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type Labels = Record<string, string>

type Ctx = {
  labels: Labels
  setLabel: (key: string, label: string | undefined) => void
}

const BreadcrumbContext = createContext<Ctx | null>(null)

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<Labels>({})

  const setLabel = useCallback((key: string, label: string | undefined) => {
    setLabels((prev) => {
      if (!label) {
        if (!(key in prev)) return prev
        const next = { ...prev }
        delete next[key]
        return next
      }
      if (prev[key] === label) return prev
      return { ...prev, [key]: label }
    })
  }, [])

  const value = useMemo(() => ({ labels, setLabel }), [labels, setLabel])

  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>
}

export function useBreadcrumbLabel(id: string | undefined, label: string | undefined) {
  const ctx = useContext(BreadcrumbContext)
  const key = id ? `#${id}` : undefined

  useEffect(() => {
    if (!ctx || !key) return
    ctx.setLabel(key, label)
    return () => ctx.setLabel(key, undefined)
  }, [ctx, key, label])
}

export function useBreadcrumbLabels() {
  const ctx = useContext(BreadcrumbContext)
  return ctx?.labels ?? {}
}
