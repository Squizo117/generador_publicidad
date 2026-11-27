import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { api } from './api'
import type { AppMode, ChatMessage, GeneratedImage, GenerationInput, GenerationRecord, GenerationType, ImageGenerationInput, ModelTier } from './types'
import './App.css'

const MODES: { id: AppMode; label: string; number: string }[] = [
  { id: 'anuncio', label: 'Anuncio', number: '01' },
  { id: 'facebook', label: 'Facebook', number: '02' },
  { id: 'slogan', label: 'Frases', number: '03' },
  { id: 'nombres', label: 'Nombres', number: '04' },
  { id: 'chat', label: 'Asistente IA', number: '05' },
  { id: 'imagen', label: 'Imagen IA', number: '06' },
]

const BUSINESS_TYPES = [
  'Cafetería',
  'Restaurante',
  'Belleza y cuidado personal',
  'Ropa y accesorios',
  'Servicios profesionales',
  'Salud y bienestar',
  'Educación',
  'Tecnología',
  'Otro',
]

const TONES = ['Cercano', 'Profesional', 'Divertido', 'Elegante', 'Inspirador', 'Urgente']
const CHANNELS = ['Facebook', 'Instagram', 'WhatsApp', 'TikTok', 'Volantes / impresión', 'General']
const CHAT_STORAGE_KEY = 'impulso-chat-session'
const MODEL_TIER_STORAGE_KEY = 'impulso-model-tier'

const MODE_LABELS: Record<GenerationType, string> = {
  anuncio: 'Anuncio comercial',
  facebook: 'Post para Facebook',
  slogan: 'Frases publicitarias',
  nombres: 'Nombres para negocio',
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.'
}

function readChatSession() {
  try {
    return sessionStorage.getItem(CHAT_STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

function readModelTier(): ModelTier {
  try {
    return localStorage.getItem(MODEL_TIER_STORAGE_KEY) === 'advanced' ? 'advanced' : 'basic'
  } catch {
    return 'basic'
  }
}

function saveChatSession(sessionId: string) {
  try {
    sessionStorage.setItem(CHAT_STORAGE_KEY, sessionId)
  } catch {
    // The conversation remains usable for this page even if storage is unavailable.
  }
}

function clearChatSession() {
  try {
    sessionStorage.removeItem(CHAT_STORAGE_KEY)
  } catch {
    // The new conversation still starts without the previous session id.
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Reciente'
    : new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(date)
}

function App() {
  const [mode, setMode] = useState<AppMode>('anuncio')
  const [modelTier, setModelTier] = useState<ModelTier>(readModelTier)
  const [businessType, setBusinessType] = useState('Cafetería')
  const [customBusinessType, setCustomBusinessType] = useState('')
  const [product, setProduct] = useState('')
  const [channel, setChannel] = useState('Facebook')
  const [tone, setTone] = useState('Cercano')
  const [location, setLocation] = useState('')
  const [additionalDetails, setAdditionalDetails] = useState('')
  const [result, setResult] = useState<GenerationRecord | null>(null)
  const [history, setHistory] = useState<GenerationRecord[]>([])
  const [formError, setFormError] = useState('')
  const [chatError, setChatError] = useState('')
  const [notice, setNotice] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [sessionId, setSessionId] = useState<string | undefined>(readChatSession)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatDraft, setChatDraft] = useState('')
  const [imageStyle, setImageStyle] = useState<ImageGenerationInput['style']>('fotografia')
  const [imageSize, setImageSize] = useState<ImageGenerationInput['size']>('cuadrado')
  const [imageResult, setImageResult] = useState<GeneratedImage | null>(null)
  const [imageError, setImageError] = useState('')
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)

  useEffect(() => {
    let active = true
    api.health()
      .then(() => active && setApiStatus('online'))
      .catch(() => active && setApiStatus('offline'))
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(MODEL_TIER_STORAGE_KEY, modelTier)
    } catch {
      // The selected model remains active until the page is closed.
    }
  }, [modelTier])

  useEffect(() => {
    let active = true
    api.history()
      .then(({ items }) => active && setHistory(items))
      .catch(() => {
        if (active) setHistory([])
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!sessionId) return
    let active = true
    api.chatMessages(sessionId)
      .then(({ messages }) => {
        if (active) setChatMessages(messages)
      })
      .catch((error: unknown) => {
        if (active) setChatError(getErrorMessage(error))
      })
    return () => {
      active = false
    }
  }, [sessionId])

  const selectedMode = MODES.find((item) => item.id === mode) ?? MODES[0]
  const visibleResult = result?.type === mode ? result : null
  const resolvedBusinessType = businessType === 'Otro' ? customBusinessType.trim() : businessType

  function changeMode(nextMode: AppMode) {
    setMode(nextMode)
    setFormError('')
    setImageError('')
    setNotice('')
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    setNotice('')

    if (mode === 'chat' || mode === 'imagen') return
    if (resolvedBusinessType.length < 2) {
      setFormError('Escribe el giro de tu negocio para continuar.')
      return
    }
    if (product.trim().length < 2) {
      setFormError('Cuéntanos qué producto o servicio quieres promocionar.')
      return
    }

    const input: GenerationInput = {
      type: mode,
      modelTier,
      businessType: resolvedBusinessType,
      product: product.trim(),
      channel,
      tone,
      ...(location.trim() ? { location: location.trim() } : {}),
      ...(additionalDetails.trim() ? { additionalDetails: additionalDetails.trim() } : {}),
    }

    setIsGenerating(true)
    try {
      const { generation } = await api.generate(input)
      setResult(generation)
      setHistory((items) => [generation, ...items.filter((item) => item.id !== generation.id)].slice(0, 6))
    } catch (error) {
      setFormError(getErrorMessage(error))
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleGenerateImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setImageError('')

    if (resolvedBusinessType.length < 2) {
      setImageError('Escribe el giro de tu negocio para continuar.')
      return
    }
    if (product.trim().length < 2) {
      setImageError('Cuéntanos qué producto o servicio quieres mostrar.')
      return
    }

    const input: ImageGenerationInput = {
      businessType: resolvedBusinessType,
      product: product.trim(),
      style: imageStyle,
      size: imageSize,
    }

    setIsGeneratingImage(true)
    try {
      setImageResult(await api.generateImage(input))
    } catch (error) {
      setImageError(getErrorMessage(error))
    } finally {
      setIsGeneratingImage(false)
    }
  }

  async function handleSendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = chatDraft.trim()
    if (!message || isSending) return

    setChatError('')
    setChatDraft('')
    setChatMessages((items) => [...items, { role: 'user', content: message }])
    setIsSending(true)

    try {
      const response = await api.sendChat(message, modelTier, sessionId)
      if (response.sessionId !== sessionId) {
        setSessionId(response.sessionId)
        saveChatSession(response.sessionId)
      }
      setChatMessages((items) => [...items, { role: 'assistant', content: response.message }])
    } catch (error) {
      setChatError(getErrorMessage(error))
      setChatDraft(message)
    } finally {
      setIsSending(false)
    }
  }

  function handleChatKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  function startNewChat() {
    clearChatSession()
    setSessionId(undefined)
    setChatMessages([])
    setChatError('')
    setChatDraft('')
  }

  async function copyResult() {
    if (!visibleResult) return
    try {
      await navigator.clipboard.writeText(visibleResult.result)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setNotice('No se pudo copiar. Selecciona el texto y cópialo manualmente.')
    }
  }

  function selectHistoryItem(item: GenerationRecord) {
    setMode(item.type)
    setResult(item)
    setProduct(item.product)
    setChannel(item.channel ?? 'General')
    setTone(item.tone ?? 'Cercano')
    setLocation(item.location ?? '')
    setNotice('')
  }

  const apiStatusLabel = apiStatus === 'checking'
    ? 'Conectando'
    : apiStatus === 'online'
      ? 'API conectada'
      : 'API sin conexión'

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Impulso, inicio">
          <span className="brand-mark">i.</span>
          <span>impulso<span className="brand-period">.</span></span>
        </a>
        <div className={`api-indicator api-${apiStatus}`} role="status">
          <span className="status-dot" />
          {apiStatusLabel}
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">TU ESTUDIO CREATIVO CON IA</p>
          <h1>Ideas que hacen<br /><span>crecer tu negocio.</span></h1>
          <p className="intro-copy">
            Crea contenido que conecta con tus clientes. Tú conoces tu negocio;
            nosotros te ayudamos a contarlo.
          </p>
        </div>
        <div className="intro-note" aria-hidden="true">
          <span className="note-star">✳</span>
          <span>Hecho para<br />negocios reales</span>
        </div>
      </section>

      <nav className="mode-tabs" aria-label="Herramientas de creación">
        {MODES.map((item) => (
          <button
            className={`mode-tab ${mode === item.id ? 'mode-tab-active' : ''}`}
            key={item.id}
            type="button"
            aria-pressed={mode === item.id}
            onClick={() => changeMode(item.id)}
          >
            <span className="mode-number">{item.number}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="workspace">
        <section className="panel input-panel">
          {mode !== 'imagen' && (
            <>
              <label className="model-picker">
                <span className="field-label">MODELO DE IA · TEXTO</span>
                <select
                  value={modelTier}
                  disabled={isGenerating || isSending}
                  onChange={(event) => {
                    const nextTier = event.target.value
                    if (nextTier === 'basic' || nextTier === 'advanced') setModelTier(nextTier)
                  }}
                >
                  <option value="basic">Básico · rápido y económico</option>
                  <option value="advanced">Potente · Gemini 3.8 Flash</option>
                </select>
              </label>
              <p className="model-picker-help">
                Se aplica al chat y al contenido. Las imágenes usan un modelo de OpenAI independiente.
              </p>
            </>
          )}
          {mode === 'chat' ? (
            <div className="chat-guide">
              <div className="panel-kicker"><span>05</span> ASISTENTE VIRTUAL</div>
              <h2>¿En qué podemos<br />ayudarte hoy?</h2>
              <p className="panel-description">
                Cuéntame qué quieres lograr. Mantendré el hilo de la conversación para darte ideas más útiles.
              </p>
              <div className="suggestion-list">
                <p className="field-label">PRUEBA PREGUNTANDO</p>
                {[
                  '¿Cómo atraigo más clientes esta semana?',
                  'Dame una promoción para un día tranquilo.',
                  '¿Qué puedo publicar en redes este fin de semana?',
                ].map((suggestion) => (
                  <button
                    className="suggestion-button"
                    key={suggestion}
                    type="button"
                    onClick={() => setChatDraft(suggestion)}
                  >
                    <span>↗</span>{suggestion}
                  </button>
                ))}
              </div>
              <div className="privacy-note">
                <span aria-hidden="true">i</span>
                Tus conversaciones se guardan para mantener el contexto del chat.
              </div>
            </div>
          ) : mode === 'imagen' ? (
            <form className="generation-form" onSubmit={handleGenerateImage}>
              <div className="panel-kicker"><span>06</span> GENERACIÓN CON OPENAI</div>
              <h2>Crea una imagen para tu negocio.</h2>
              <p className="panel-description">Describe qué quieres promocionar y elige un estilo y formato.</p>

              <label className="field">
                <span className="field-label">GIRO DE TU NEGOCIO</span>
                <select value={businessType} onChange={(event) => setBusinessType(event.target.value)}>
                  {BUSINESS_TYPES.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>

              {businessType === 'Otro' && (
                <label className="field">
                  <span className="field-label">¿A QUÉ SE DEDICA?</span>
                  <input
                    maxLength={120}
                    placeholder="Ej. reparación de bicicletas"
                    value={customBusinessType}
                    onChange={(event) => setCustomBusinessType(event.target.value)}
                    required
                  />
                </label>
              )}

              <label className="field">
                <span className="field-label">PRODUCTO O SERVICIO</span>
                <textarea
                  maxLength={500}
                  placeholder="Ej. café frío con espuma de vainilla, servido en vaso transparente"
                  rows={3}
                  value={product}
                  onChange={(event) => setProduct(event.target.value)}
                  required
                />
              </label>

              <div className="field-row">
                <label className="field">
                  <span className="field-label">ESTILO VISUAL</span>
                  <select value={imageStyle} onChange={(event) => {
                    const style = event.target.value
                    if (style === 'fotografia' || style === 'ilustracion' || style === 'editorial') setImageStyle(style)
                  }}>
                    <option value="fotografia">Fotografía</option>
                    <option value="ilustracion">Ilustración</option>
                    <option value="editorial">Editorial</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">FORMATO</span>
                  <select value={imageSize} onChange={(event) => {
                    const size = event.target.value
                    if (size === 'cuadrado' || size === 'horizontal' || size === 'vertical') setImageSize(size)
                  }}>
                    <option value="cuadrado">Cuadrado · publicación</option>
                    <option value="vertical">Vertical · historia / reel</option>
                    <option value="horizontal">Horizontal · portada</option>
                  </select>
                </label>
              </div>

              {imageError && <p className="error-message" role="alert">{imageError}</p>}

              <button className="primary-button generate-button" disabled={isGeneratingImage} type="submit">
                {isGeneratingImage ? <><span className="spinner" /> Creando imagen...</> : <>Generar imagen <span aria-hidden="true">↗</span></>}
              </button>
              <p className="form-footnote">La imagen no incluirá texto; podrás agregarlo en tu diseño final.</p>
            </form>
          ) : (
            <form className="generation-form" onSubmit={handleGenerate}>
              <div className="panel-kicker"><span>{selectedMode.number}</span> CONFIGURA TU CONTENIDO</div>
              <h2>{mode === 'anuncio' ? 'Cuéntanos tu idea.' : mode === 'facebook' ? 'Conversemos con tus clientes.' : mode === 'slogan' ? 'Encuentra tus palabras.' : 'Dale nombre a tu próximo paso.'}</h2>
              <p className="panel-description">Unos detalles sobre tu negocio y preparamos opciones para ti.</p>

              <label className="field">
                <span className="field-label">GIRO DE TU NEGOCIO</span>
                <select value={businessType} onChange={(event) => setBusinessType(event.target.value)}>
                  {BUSINESS_TYPES.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>

              {businessType === 'Otro' && (
                <label className="field">
                  <span className="field-label">¿A QUÉ SE DEDICA?</span>
                  <input
                    maxLength={120}
                    placeholder="Ej. reparación de bicicletas"
                    value={customBusinessType}
                    onChange={(event) => setCustomBusinessType(event.target.value)}
                    required
                  />
                </label>
              )}

              <label className="field">
                <span className="field-label">PRODUCTO O SERVICIO</span>
                <textarea
                  maxLength={500}
                  placeholder="¿Qué quieres promocionar y qué lo hace especial?"
                  rows={3}
                  value={product}
                  onChange={(event) => setProduct(event.target.value)}
                  required
                />
              </label>

              <div className="field-row">
                <label className="field">
                  <span className="field-label">CANAL</span>
                  <select value={channel} onChange={(event) => setChannel(event.target.value)}>
                    {CHANNELS.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">TONO</span>
                  <select value={tone} onChange={(event) => setTone(event.target.value)}>
                    {TONES.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
              </div>

              <label className="field">
                <span className="field-label">UBICACIÓN <span className="optional-label">OPCIONAL</span></span>
                <input
                  maxLength={160}
                  placeholder="Ciudad o zona donde vendes"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
              </label>

              <label className="field">
                <span className="field-label">ALGO MÁS QUE DEBAMOS SABER <span className="optional-label">OPCIONAL</span></span>
                <textarea
                  maxLength={1000}
                  placeholder="Promociones, público ideal, fechas..."
                  rows={2}
                  value={additionalDetails}
                  onChange={(event) => setAdditionalDetails(event.target.value)}
                />
              </label>

              {formError && <p className="error-message" role="alert">{formError}</p>}

              <button className="primary-button generate-button" disabled={isGenerating} type="submit">
                {isGenerating ? <><span className="spinner" /> Creando ideas...</> : <>Crear contenido <span aria-hidden="true">↗</span></>}
              </button>
              <p className="form-footnote">La creatividad es nuestra. La última palabra siempre es tuya.</p>
            </form>
          )}
        </section>

        <section className={`panel output-panel ${mode === 'chat' ? 'output-chat' : ''}`}>
          {mode === 'chat' ? (
            <>
              <div className="output-header">
                <div>
                  <div className="panel-kicker">CONVERSACIÓN</div>
                  <h2>Tu asistente</h2>
                </div>
                <button className="text-button" type="button" onClick={startNewChat}>Nueva charla +</button>
              </div>
              <div className="chat-messages" aria-live="polite">
                {chatMessages.length === 0 && (
                  <div className="chat-welcome">
                    <span className="assistant-avatar">i.</span>
                    <div className="chat-bubble assistant-bubble">
                      ¡Hola! Soy tu asistente para ideas de negocio. ¿Qué te gustaría mejorar o promocionar?
                    </div>
                  </div>
                )}
                {chatMessages.map((message, index) => (
                  <div
                    className={`chat-message ${message.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}
                    key={message.id ?? `${message.role}-${index}`}
                  >
                    {message.role === 'assistant' && <span className="assistant-avatar">i.</span>}
                    <div className={`chat-bubble ${message.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
                      {message.content}
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="chat-message chat-message-assistant">
                    <span className="assistant-avatar">i.</span>
                    <div className="chat-bubble assistant-bubble typing-indicator" aria-label="El asistente está escribiendo">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
              </div>
              {chatError && <p className="error-message chat-error" role="alert">{chatError}</p>}
              <form className="chat-compose" onSubmit={handleSendChat}>
                <label className="sr-only" htmlFor="chat-message">Escribe tu mensaje</label>
                <textarea
                  id="chat-message"
                  maxLength={4000}
                  onChange={(event) => setChatDraft(event.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Escribe tu pregunta..."
                  rows={2}
                  value={chatDraft}
                />
                <button className="send-button" type="submit" disabled={!chatDraft.trim() || isSending} aria-label="Enviar mensaje">
                  {isSending ? <span className="spinner spinner-light" /> : '↑'}
                </button>
              </form>
              <p className="chat-footnote">Enter para enviar · Shift + Enter para nueva línea</p>
            </>
          ) : mode === 'imagen' ? (
            <>
              <div className="output-header">
                <div>
                  <div className="panel-kicker">IMAGEN GENERADA CON OPENAI</div>
                  <h2>Tu imagen.</h2>
                </div>
                {imageResult && (
                  <a className="copy-button" href={imageResult.image} download="impulso-anuncio.png">
                    Descargar PNG
                  </a>
                )}
              </div>
              {imageResult ? (
                <div className="image-preview-card">
                  <img src={imageResult.image} alt={`Imagen publicitaria de ${product}`} />
                  <p>{imageResult.size} · Generada con OpenAI</p>
                </div>
              ) : isGeneratingImage ? (
                <div className="image-generating" role="status">
                  <span className="spinner spinner-light" />
                  <p>OpenAI está creando tu imagen. Esto puede tardar un momento...</p>
                </div>
              ) : (
                <div className="empty-result">
                  <div className="empty-art" aria-hidden="true">
                    <span className="art-sun" />
                    <span className="art-card art-card-back" />
                    <span className="art-card art-card-front"><i /><i /><i /></span>
                    <span className="art-spark art-spark-one">✳</span>
                    <span className="art-spark art-spark-two">✦</span>
                  </div>
                  <p className="empty-kicker">TU PRÓXIMA CAMPAÑA</p>
                  <h3>Una idea, una imagen<br />hecha para tu marca.</h3>
                  <p>Configura el producto, estilo y formato para generar una imagen publicitaria.</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="output-header">
                <div>
                  <div className="panel-kicker">TU ESPACIO CREATIVO</div>
                  <h2>El resultado.</h2>
                </div>
                {visibleResult && (
                  <button className="copy-button" type="button" onClick={copyResult}>
                    {copied ? 'Copiado ✓' : 'Copiar texto'}
                  </button>
                )}
              </div>

              {visibleResult ? (
                <article className="result-card">
                  <div className="result-meta">
                    <span className="result-type">{MODE_LABELS[visibleResult.type]}</span>
                    <span>{formatDate(visibleResult.created_at)}</span>
                  </div>
                  <div className="result-copy">{visibleResult.result}</div>
                  <div className="result-context">
                    <span>{visibleResult.business_type}</span>
                    <span>{visibleResult.tone ?? 'Tono general'}</span>
                    {visibleResult.channel && <span>{visibleResult.channel}</span>}
                  </div>
                </article>
              ) : (
                <div className="empty-result">
                  <div className="empty-art" aria-hidden="true">
                    <span className="art-sun" />
                    <span className="art-card art-card-back" />
                    <span className="art-card art-card-front"><i /><i /><i /></span>
                    <span className="art-spark art-spark-one">✳</span>
                    <span className="art-spark art-spark-two">✦</span>
                  </div>
                  <p className="empty-kicker">LISTO CUANDO TÚ LO ESTÉS</p>
                  <h3>Tu próxima gran idea<br />empieza aquí.</h3>
                  <p>Completa los datos de tu negocio y crea contenido hecho a tu medida.</p>
                </div>
              )}

              {notice && <p className="notice-message" role="status">{notice}</p>}

              <div className="recent-section">
                <div className="recent-heading">
                  <div>
                    <p className="panel-kicker">TU HISTORIAL</p>
                    <h3>Creaciones recientes</h3>
                  </div>
                  <span className="history-count">{history.length}</span>
                </div>
                {history.length === 0 ? (
                  <p className="history-empty">Tus creaciones guardadas aparecerán aquí.</p>
                ) : (
                  <div className="history-list">
                    {history.map((item) => (
                      <button
                        className={`history-item ${result?.id === item.id ? 'history-item-active' : ''}`}
                        key={item.id}
                        type="button"
                        onClick={() => selectHistoryItem(item)}
                      >
                        <span className="history-type">{MODE_LABELS[item.type]}</span>
                        <span className="history-business">{item.business_type}</span>
                        <span className="history-date">{formatDate(item.created_at)}</span>
                        <span className="history-arrow" aria-hidden="true">↗</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <footer className="app-footer">
        <span>impulso<span className="brand-period">.</span></span>
        <span>Ideas para negocios que mueven su comunidad.</span>
        <span>Hecho con intención.</span>
      </footer>
    </main>
  )
}

export default App
