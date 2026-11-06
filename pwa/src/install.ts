type InstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type InstallState = { offered: boolean; installed: boolean }

let promptEvent: InstallPrompt | null = null
let installed = false
let snapshot: InstallState = { offered: false, installed: false }
const listeners = new Set<() => void>()

function standalone() {
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

function publish() {
  const next = { offered: Boolean(promptEvent) && !installed, installed }
  if (next.offered === snapshot.offered && next.installed === snapshot.installed) return
  snapshot = next
  listeners.forEach(listener => listener())
}

installed = standalone()
snapshot = { offered: false, installed }

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault()
  if (installed) return
  promptEvent = event as InstallPrompt
  publish()
})

window.addEventListener('appinstalled', () => {
  installed = true
  promptEvent = null
  publish()
})

export function subscribeInstall(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function installState() {
  return snapshot
}

export async function installApp() {
  if (!promptEvent) return
  try {
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === 'accepted') installed = true
  } catch {
    installed = standalone()
  }
  promptEvent = null
  publish()
}
