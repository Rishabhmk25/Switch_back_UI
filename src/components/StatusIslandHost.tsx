import { useCallback, useEffect, useRef, useState } from 'react'
import { StatusIsland, type IslandTask } from './kokonutui/status-island'
import { useStore } from '../state'

const MAX_TASKS = 3

/**
 * Feeds Switchback's single status line into Kokonut's StatusIsland. The store
 * stays the authority on timing (2.4 s, or 8 s with Undo); earlier statuses
 * linger behind the current one and leave on the island's own timer.
 */
export function StatusIslandHost() {
  const { s } = useStore()
  const [tasks, setTasks] = useState<IslandTask[]>([])
  const current = useRef<string | null>(null)

  useEffect(() => {
    const st = s.status
    const prevId = current.current
    current.current = st ? String(st.id) : null
    setTasks((list) => {
      // Only the newest status can be undone; older ones keep their text.
      let next = list.map((t) => (t.action ? { ...t, action: undefined } : t))
      if (!st) return next.filter((t) => t.id !== prevId)
      if (next.some((t) => t.id === String(st.id))) return next
      const task: IslandTask = {
        id: String(st.id),
        status: 'done',
        label: st.text.replace(/\.$/, ''),
        action: st.undo ? { label: 'Undo', onClick: () => st.undo?.() } : undefined,
      }
      next = [...next, task]
      return next.slice(-MAX_TASKS)
    })
  }, [s.status])

  const dismiss = useCallback((id: string) => {
    if (id === current.current) return
    setTasks((list) => list.filter((t) => t.id !== id))
  }, [])

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-[55] flex justify-center">
      <div className="kk kk-island pointer-events-auto">
        <StatusIsland tasks={tasks} onDismiss={dismiss} dismissAfter={2400} />
      </div>
    </div>
  )
}
