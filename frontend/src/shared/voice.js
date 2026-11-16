import { useEffect, useRef, useState } from 'react'

/*
 * Speaking instead of typing, for a text field that keeps working without it.
 *
 * This uses the browser's own speech recognition (the Web Speech API). WarmPath never receives
 * audio: the browser, or the speech service the browser vendor runs, turns speech into text and
 * the page gets only that text. Nothing is installed and no WarmPath endpoint is involved.
 *
 * The flow is push-to-talk with an editable transcript: press the microphone, speak, and the
 * words appear in the field. Nothing is submitted; the person checks the text and sends it the
 * same way as typed text. Where the browser has no speech recognition (Firefox, for example),
 * `supported` is false and the caller shows no microphone at all.
 */

const Recognition = typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition

/* What to say when listening stops without usable text. Typing always remains possible. */
const PROBLEMS = {
  'not-allowed': 'Microphone access is blocked for this site. Allow it in your browser, or type instead.',
  'service-not-allowed': 'Microphone access is blocked for this site. Allow it in your browser, or type instead.',
  'audio-capture': 'No microphone was found. You can type instead.',
  'no-speech': 'Nothing was heard. Try again, or type instead.',
  network: 'Speech recognition could not be reached. You can type instead.',
}
const OTHER_PROBLEM = 'Speech recognition stopped unexpectedly. You can type instead.'

/**
 * `onText(text)` receives what has been heard so far, replacing the field's value each time.
 * Returns { supported, listening, message, toggle }: `message` is a short status for the page to
 * show once listening ends, either a prompt to check the text or the reason nothing was heard.
 */
export function useVoiceInput({ onText, maxLength = 300, lang = 'en-US' }) {
  const [listening, setListening] = useState(false)
  const [message, setMessage] = useState('')
  const session = useRef(null)
  const deliver = useRef(onText)
  deliver.current = onText

  // Leaving the page ends any open session, and its late events are ignored.
  useEffect(() => () => {
    const recognition = session.current
    if (!recognition) return
    recognition.onresult = recognition.onerror = recognition.onend = null
    recognition.abort()
    session.current = null
  }, [])

  const start = () => {
    if (!Recognition || session.current) return
    const recognition = new Recognition()
    recognition.lang = lang
    recognition.interimResults = true     // show words as they are recognised
    recognition.continuous = false        // one utterance; the service stops at a pause
    recognition.maxAlternatives = 1
    let heard = false, problem = ''
    recognition.onresult = (event) => {
      const text = Array.from(event.results, (result) => result[0].transcript).join(' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
      if (!text) return
      heard = true
      deliver.current(text)
    }
    recognition.onerror = (event) => { if (event.error !== 'aborted') problem = PROBLEMS[event.error] || OTHER_PROBLEM }
    recognition.onend = () => {
      session.current = null
      setListening(false)
      // Words that were heard stay in the field even if the session then ended with an error.
      setMessage(heard ? 'Check what was heard and edit it if needed, then press Enter.' : problem || PROBLEMS['no-speech'])
    }
    try {
      recognition.start()
    } catch {
      setMessage(OTHER_PROBLEM)
      return
    }
    session.current = recognition
    setMessage('')
    setListening(true)
  }

  // Stopping asks the service to finish with what it has; `onend` then reports the outcome.
  const toggle = () => (session.current ? session.current.stop() : start())

  return { supported: Boolean(Recognition), listening, message, toggle }
}
