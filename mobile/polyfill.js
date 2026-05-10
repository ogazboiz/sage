// Native crypto + WebRTC polyfills.
//
// 1. quick-crypto: hash + symmetric primitives via JSI.
// 2. ed25519: RN's WebCrypto ships AES + RSA but no Ed25519, which is
//    what @solana/kit's generateKeyPairSigner needs.
// 3. WebRTC globals (navigator.mediaDevices.getUserMedia,
//    RTCPeerConnection, etc.) — required by LiveKit and ElevenLabs
//    even in websocket mode.
// 4. document/window/audio-element shims — RN doesn't ship these at
//    all; livekit-client + elevenlabs-client touch them in the audio
//    attach / window listener / capability probe paths.
import { install as installQuickCrypto } from 'react-native-quick-crypto'
import { install as installEd25519 } from '@solana/webcrypto-ed25519-polyfill'
import { registerGlobals as installWebRTCGlobals } from '@livekit/react-native-webrtc'

installQuickCrypto()
installEd25519()
installWebRTCGlobals()

// document — livekit-client's Track.attach() does
// `document.createElement('audio')` + `document.body.appendChild(el)`.
// On RN, audio plays via native AudioSession — the JS element is dead
// weight, so a no-op shim keeps the chained property assignments safe.
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

// window — RN's `window` is just globalThis but doesn't expose
// addEventListener/removeEventListener. SDKs install beforeunload-
// style cleanup hooks; point them at no-ops.
if (typeof globalThis.window === 'undefined') globalThis.window = globalThis
if (typeof globalThis.addEventListener !== 'function') globalThis.addEventListener = () => {}
if (typeof globalThis.removeEventListener !== 'function') globalThis.removeEventListener = () => {}
if (typeof globalThis.dispatchEvent !== 'function') globalThis.dispatchEvent = () => true

// HTMLAudioElement / HTMLMediaElement / Element / Node / HTMLElement —
// livekit-client does `instanceof HTMLAudioElement` checks. Stub
// classes return false, which sends the code down the right path.
class _StubElement {}
if (typeof globalThis.Node === 'undefined') globalThis.Node = _StubElement
if (typeof globalThis.Element === 'undefined') globalThis.Element = _StubElement
if (typeof globalThis.HTMLElement === 'undefined') globalThis.HTMLElement = _StubElement
if (typeof globalThis.HTMLMediaElement === 'undefined') globalThis.HTMLMediaElement = _StubElement
if (typeof globalThis.HTMLAudioElement === 'undefined') globalThis.HTMLAudioElement = _StubElement
if (typeof globalThis.HTMLVideoElement === 'undefined') globalThis.HTMLVideoElement = _StubElement

// navigator.mediaDevices.getSupportedConstraints — livekit-client
// probes this at startup. registerGlobals from @livekit/react-native-webrtc
// adds getUserMedia + enumerateDevices but not this one.
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

// CloseEvent / MessageEvent / ErrorEvent — DOM Event subclasses the
// SDK constructs on websocket close + state changes. Use the native
// Event class as the base so Hermes' instanceof checks work.
const BaseEvent =
  typeof globalThis.Event === 'function'
    ? globalThis.Event
    : class FallbackEvent {
        constructor(type, init = {}) {
          this.type = type
          this.bubbles = init.bubbles ?? false
          this.cancelable = init.cancelable ?? false
          this.timeStamp = Date.now()
          this.defaultPrevented = false
        }
        preventDefault() { this.defaultPrevented = true }
        stopPropagation() {}
        stopImmediatePropagation() {}
      }
if (typeof globalThis.Event === 'undefined') globalThis.Event = BaseEvent

if (typeof globalThis.CloseEvent === 'undefined') {
  class CloseEvent extends BaseEvent {
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
  class MessageEvent extends BaseEvent {
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
  class ErrorEvent extends BaseEvent {
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

// Web Audio API stubs — @elevenlabs/client's setupInputOutput
// instantiates InputController + OutputController which build an
// audio analysis chain via AudioContext / AnalyserNode. RN doesn't
// ship Web Audio at all; LiveKit handles real audio routing through
// its native AudioSession, so these stubs are dead weight that just
// keep `class X extends Y` and `new AudioContext()` from blowing up.
class _StubAudioNode {
  connect() { return this }
  disconnect() {}
  addEventListener() {}
  removeEventListener() {}
}
class _StubAudioContext {
  constructor() {
    this.state = 'suspended'
    this.destination = new _StubAudioNode()
    this.currentTime = 0
    this.sampleRate = 48000
  }
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true }
  createAnalyser() {
    const node = new _StubAudioNode()
    node.fftSize = 2048
    node.frequencyBinCount = 1024
    node.smoothingTimeConstant = 0.8
    node.minDecibels = -100
    node.maxDecibels = -30
    node.getByteFrequencyData = (arr) => arr && arr.fill(0)
    node.getByteTimeDomainData = (arr) => arr && arr.fill(128)
    node.getFloatFrequencyData = (arr) => arr && arr.fill(-100)
    node.getFloatTimeDomainData = (arr) => arr && arr.fill(0)
    return node
  }
  createGain() {
    const node = new _StubAudioNode()
    node.gain = { value: 1, setValueAtTime: () => {} }
    return node
  }
  createOscillator() { return new _StubAudioNode() }
  createBuffer() { return { length: 0, getChannelData: () => new Float32Array(0) } }
  createBufferSource() { return new _StubAudioNode() }
  createMediaStreamSource() { return new _StubAudioNode() }
  createMediaStreamDestination() { return { stream: null } }
  createScriptProcessor() { return new _StubAudioNode() }
  decodeAudioData() { return Promise.resolve({ length: 0 }) }
  resume() { this.state = 'running'; return Promise.resolve() }
  suspend() { this.state = 'suspended'; return Promise.resolve() }
  close() { this.state = 'closed'; return Promise.resolve() }
}
if (typeof globalThis.AudioContext === 'undefined') globalThis.AudioContext = _StubAudioContext
if (typeof globalThis.webkitAudioContext === 'undefined') globalThis.webkitAudioContext = _StubAudioContext
if (typeof globalThis.AnalyserNode === 'undefined') globalThis.AnalyserNode = _StubAudioNode
if (typeof globalThis.GainNode === 'undefined') globalThis.GainNode = _StubAudioNode
if (typeof globalThis.MediaStreamAudioSourceNode === 'undefined') {
  globalThis.MediaStreamAudioSourceNode = _StubAudioNode
}

// URL.createObjectURL — RN's URL implementation throws
// "Cannot create URL for blob!" when given a Blob/MediaSource.
// ElevenLabs calls it to get an asset URL for an audio worklet.
// Force-replace with a stub that always returns a fake URL — the
// returned URL isn't used for actual audio playback (LiveKit handles
// audio via native AudioSession). Always-replace regardless of
// detection because the polyfilled URL exposes/throws inconsistently.
if (typeof globalThis.URL !== 'undefined') {
  let _blobCounter = 0
  globalThis.URL.createObjectURL = () => {
    _blobCounter++
    return `blob:rn-stub/${_blobCounter}`
  }
  globalThis.URL.revokeObjectURL = () => {}
}
