// Native crypto + DOM-event polyfills.
//
// 1. quick-crypto: hash + symmetric primitives via JSI.
// 2. ed25519: RN's WebCrypto ships AES + RSA but no Ed25519, which is
//    what @solana/kit's generateKeyPairSigner needs for the agent
//    keypair on each autonomous task.
// 3. DOM Event globals: ElevenLabs' WebRTC connection (LiveKit) constructs
//    `new Event(...)`, `new CloseEvent(...)`, `new MessageEvent(...)`, and
//    touches `document.createElement('audio')` during track attach. RN
//    0.83 + Hermes 0.13 don't ship these globally yet (the example app
//    runs on RN 0.81 where they do). The shims are no-ops where they
//    don't matter (audio plays via native AudioSession, not the DOM
//    element) and pass through real Event semantics where they do.
import { install as installQuickCrypto } from 'react-native-quick-crypto'
import { install as installEd25519 } from '@solana/webcrypto-ed25519-polyfill'
import {
  Event as LKEvent,
  EventTarget as LKEventTarget,
  registerGlobals as installWebRTCGlobals,
} from '@livekit/react-native-webrtc'

installQuickCrypto()
installEd25519()
// Pre-install WebRTC globals so navigator.mediaDevices exists by the
// time we shim getSupportedConstraints below.
installWebRTCGlobals()

if (typeof globalThis.Event === 'undefined') {
  globalThis.Event = LKEvent
}
if (typeof globalThis.EventTarget === 'undefined') {
  globalThis.EventTarget = LKEventTarget
}
// LiveKit + ElevenLabs do `window.addEventListener('beforeunload', ...)`
// for cleanup hooks. RN's `window` is just globalThis and doesn't expose
// addEventListener/removeEventListener — point them at no-ops.
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis
}
if (typeof globalThis.addEventListener !== 'function') {
  globalThis.addEventListener = () => {}
}
if (typeof globalThis.removeEventListener !== 'function') {
  globalThis.removeEventListener = () => {}
}
if (typeof globalThis.dispatchEvent !== 'function') {
  globalThis.dispatchEvent = () => true
}
// HTMLAudioElement / HTMLMediaElement / Element / Node / HTMLElement —
// livekit-client does `instanceof HTMLAudioElement` and similar checks.
// Stub classes are enough — the checks return false and the code falls
// back to the right path (or harmlessly creates an audio element via
// our document.createElement shim).
class _StubElement {}
if (typeof globalThis.Node === 'undefined') globalThis.Node = _StubElement
if (typeof globalThis.Element === 'undefined') globalThis.Element = _StubElement
if (typeof globalThis.HTMLElement === 'undefined') globalThis.HTMLElement = _StubElement
if (typeof globalThis.HTMLMediaElement === 'undefined') globalThis.HTMLMediaElement = _StubElement
if (typeof globalThis.HTMLAudioElement === 'undefined') globalThis.HTMLAudioElement = _StubElement
if (typeof globalThis.HTMLVideoElement === 'undefined') globalThis.HTMLVideoElement = _StubElement

// navigator.mediaDevices.getSupportedConstraints — livekit-client probes
// browser capabilities at startup. RN's WebRTC navigator shim from
// @livekit/react-native-webrtc adds getUserMedia + enumerateDevices
// but not this one. Return a plausible empty constraints object.
if (
  typeof globalThis.navigator !== 'undefined' &&
  globalThis.navigator.mediaDevices &&
  typeof globalThis.navigator.mediaDevices.getSupportedConstraints !== 'function'
) {
  globalThis.navigator.mediaDevices.getSupportedConstraints = () => ({
    aspectRatio: true,
    autoGainControl: true,
    channelCount: true,
    deviceId: true,
    echoCancellation: true,
    facingMode: true,
    frameRate: true,
    groupId: true,
    height: true,
    noiseSuppression: true,
    sampleRate: true,
    sampleSize: true,
    width: true,
  })
}
if (typeof globalThis.CloseEvent === 'undefined') {
  class CloseEvent extends globalThis.Event {
    constructor(type, init = {}) {
      super(type, init)
      this.code = init.code ?? 0
      this.reason = init.reason ?? ''
      this.wasClean = init.wasClean ?? false
    }
  }
  globalThis.CloseEvent = CloseEvent
}
if (typeof globalThis.MessageEvent === 'undefined') {
  class MessageEvent extends globalThis.Event {
    constructor(type, init = {}) {
      super(type, init)
      this.data = init.data
      this.origin = init.origin ?? ''
      this.lastEventId = init.lastEventId ?? ''
      this.source = init.source ?? null
      this.ports = init.ports ?? []
    }
  }
  globalThis.MessageEvent = MessageEvent
}
if (typeof globalThis.ErrorEvent === 'undefined') {
  class ErrorEvent extends globalThis.Event {
    constructor(type, init = {}) {
      super(type, init)
      this.message = init.message ?? ''
      this.filename = init.filename ?? ''
      this.lineno = init.lineno ?? 0
      this.colno = init.colno ?? 0
      this.error = init.error ?? null
    }
  }
  globalThis.ErrorEvent = ErrorEvent
}

// Minimal `document` shim — livekit-client's Track.attach() does
// `document.createElement('audio')` + `document.body.appendChild(el)` to
// make the browser play audio. On RN, LiveKit plays audio via the
// native AudioSession (no DOM needed), so the JS element is dead weight;
// we return a no-op to keep the chained property assignments harmless.
if (typeof globalThis.document === 'undefined') {
  const noopElement = () => ({
    autoplay: false,
    controls: false,
    muted: false,
    style: {},
    srcObject: null,
    setSinkId: undefined,
    addEventListener: () => {},
    removeEventListener: () => {},
    pause: () => {},
    play: () => Promise.resolve(),
    remove: () => {},
    appendChild: () => {},
    removeChild: () => {},
  })
  globalThis.document = {
    createElement: noopElement,
    createElementNS: noopElement,
    body: { appendChild: () => {}, removeChild: () => {} },
    head: { appendChild: () => {}, removeChild: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    documentElement: { style: {} },
  }
}
