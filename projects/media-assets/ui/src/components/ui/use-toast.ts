import * as React from 'react'
import type { ToastProps } from './toast'
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from './toast'

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
}

const actionTypes = {
  ADD_TOAST: 'ADD_TOAST',
  UPDATE_TOAST: 'UPDATE_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType['ADD_TOAST']
      toast: ToasterToast
    }
  | {
      type: ActionType['UPDATE_TOAST']
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType['DISMISS_TOAST']
      toastId?: ToasterToast['id']
    }
  | {
      type: ActionType['REMOVE_TOAST']
      toastId?: ToasterToast['id']
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string, dispatch: (action: Action) => void) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

      const timeout = setTimeout(() => {
      toastTimeouts.delete(toastId)
      dispatch({
        type: 'REMOVE_TOAST',
        toastId: toastId,
      })
    }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export function useToast() {
  const [state, setState] = React.useState<State>({
    toasts: [],
  })

  const dispatch = React.useCallback((action: Action) => {
    setState((prev) => {
      switch (action.type) {
        case 'ADD_TOAST':
          return {
            ...prev,
            toasts: [action.toast, ...prev.toasts].slice(0, TOAST_LIMIT),
          }

        case 'UPDATE_TOAST':
          return {
            ...prev,
            toasts: prev.toasts.map((t) =>
              t.id === action.toast.id ? { ...t, ...action.toast } : t
            ),
          }

        case 'DISMISS_TOAST': {
          const { toastId } = action

    if (toastId) {
      addToRemoveQueue(toastId, dispatch)
    } else {
      state.toasts.forEach((toast) => {
        addToRemoveQueue(toast.id, dispatch)
      })
    }

          return {
            ...prev,
            toasts: prev.toasts.map((t) =>
              t.id === toastId || toastId === undefined
                ? {
                    ...t,
                    open: false,
                  }
                : t
            ),
          }
        }
        case 'REMOVE_TOAST':
          if (action.toastId === undefined) {
            return {
              ...prev,
              toasts: [],
            }
          }
          return {
            ...prev,
            toasts: prev.toasts.filter((t) => t.id !== action.toastId),
          }
      }
    })
  }, [])

  const toast = React.useCallback(
    ({ ...props }: Omit<ToasterToast, 'id'>) => {
      const toastId = genId()

      dispatch({
        type: 'ADD_TOAST',
        toast: {
          ...props,
          id: toastId,
        },
      })

      return { id: toastId, dismiss: () => dispatch({ type: 'DISMISS_TOAST', toastId: toastId }) }
    },
    [dispatch]
  )

  const dismiss = React.useCallback(
    (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
    [dispatch]
  )

  return {
    toast,
    dismiss,
    toasts: state.toasts,
  }
}

export { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport }
