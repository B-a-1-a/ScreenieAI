import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastStoreState {
  toasts: Toast[]
  addToast: (message: string, type: ToastType) => void
  removeToast: (id: string) => void
}

let toastCounter = 0

export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],

  addToast: (message, type) => {
    toastCounter += 1
    const id = `toast-${toastCounter}`
    const toast: Toast = { id, message, type }

    set((state) => ({
      toasts: [...state.toasts, toast],
    }))

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    }, 4000)
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },
}))
