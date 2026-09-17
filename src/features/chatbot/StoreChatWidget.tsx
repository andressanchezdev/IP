import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { answerLandingChat, type ChatReply } from './answerChat'
import { endChatSession, startChatSession } from './sessionContext'
import { chatDraftError, readChatGuard, registerChatSend } from './chatGuard'
import { getBotSettings } from './botSettings'
import { welcomeReply, type ChatAction } from './intents'
import './StoreChatWidget.css'

const BOT_ICON = '/static/landing/IconBot/botIP.png'

type ChatMessage = {
  id: string
  role: 'bot' | 'user'
  reply?: ChatReply
  text: string
}

type StoreChatWidgetProps = {
  onLogin?: () => void
  onOpenPriceList?: () => void
  onOpenStore?: () => void
  onCatalogSearch?: (query: string) => void
  onCatalogFilter?: (payload: { brands?: string[]; categories?: string[]; models?: string[] }) => void
}

function ChatLink({
  action,
  index,
  onPrompt,
  onLogin,
  onOpenPriceList,
  onOpenStore,
  onCatalogSearch,
  onCatalogFilter,
}: {
  action: ChatAction
  index?: number
  onPrompt?: (prompt: string) => void
  onLogin?: () => void
  onOpenPriceList?: () => void
  onOpenStore?: () => void
  onCatalogSearch?: (query: string) => void
  onCatalogFilter?: (payload: { brands?: string[]; categories?: string[]; models?: string[] }) => void
}) {
  if (action.kind === 'catalog-search' && action.search) {
    return (
      <button type="button" className="landing-chat__option" onClick={() => onCatalogSearch?.(action.search || '')}>
        {index ? <span className="landing-chat__option-index">{index}</span> : null}
        {action.label}
      </button>
    )
  }

  if (action.kind === 'catalog-filter') {
    return (
      <button
        type="button"
        className="landing-chat__option"
        onClick={() => onCatalogFilter?.({
          brands: action.brands,
          categories: action.categories,
          models: action.models,
        })}
      >
        {index ? <span className="landing-chat__option-index">{index}</span> : null}
        {action.label}
      </button>
    )
  }

  if (action.kind === 'prompt' && action.prompt) {
    return (
      <button type="button" className="landing-chat__option" onClick={() => onPrompt?.(action.prompt || '')}>
        {index ? <span className="landing-chat__option-index">{index}</span> : null}
        {action.label}
      </button>
    )
  }

  if (action.kind === 'catalog-download') {
    return (
      <button type="button" className="landing-chat__action" onClick={() => onOpenPriceList?.()}>
        {action.label}
      </button>
    )
  }

  if (action.kind === 'login') {
    return (
      <button type="button" className="landing-chat__action" onClick={() => onLogin?.()}>
        {action.label}
      </button>
    )
  }

  const href = action.href || '/'
  if (action.external || href.startsWith('http') || href.startsWith('mailto:')) {
    return (
      <a className="landing-chat__action" href={href} target="_blank" rel="noreferrer">
        {action.label}
      </a>
    )
  }

  if (href === '/' || href.startsWith('/#')) {
    return (
      <button type="button" className="landing-chat__action" onClick={() => onOpenStore?.()}>
        {action.label}
      </button>
    )
  }

  return (
    <a className="landing-chat__action" href={href}>
      {action.label}
    </a>
  )
}

function TypingDots() {
  return (
    <span className="landing-chat__dots" aria-label="BotIP está respondiendo">
      <span />
      <span />
      <span />
    </span>
  )
}

export function StoreChatWidget({
  onLogin,
  onOpenPriceList,
  onOpenStore,
  onCatalogSearch,
  onCatalogFilter,
}: StoreChatWidgetProps) {
  const panelId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const replyTimer = useRef<number | null>(null)
  const limits = getBotSettings()
  const welcome = welcomeReply()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const [notice, setNotice] = useState('')
  const [blockedMessage, setBlockedMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'bot', text: welcome.text, reply: welcome },
  ])

  useEffect(() => {
    startChatSession()
    return () => {
      if (replyTimer.current) window.clearTimeout(replyTimer.current)
      endChatSession()
    }
  }, [])

  const refreshBlock = () => {
    const guard = readChatGuard()
    setBlockedMessage(guard.blocked ? guard.message : '')
    return guard.blocked
  }

  useEffect(() => {
    refreshBlock()
    const timer = window.setInterval(refreshBlock, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const lastBot = [...messages].reverse().find((message) => message.role === 'bot')
  const lastOptions = lastBot?.reply?.options ?? []
  const awaitingChoice = lastOptions.some((item) => (
    item.kind === 'prompt' || item.kind === 'catalog-search' || item.kind === 'catalog-filter'
  ))
  const minChars = awaitingChoice ? 1 : limits.minChars

  const dispatchCatalogCommand = (command?: ChatReply['catalogCommand']) => {
    if (!command) return
    if (command.kind === 'search' && command.query) {
      onCatalogSearch?.(command.query)
      return
    }
    if (command.kind === 'filter') {
      onCatalogFilter?.({
        brands: command.brands,
        categories: command.categories,
        models: command.models,
      })
    }
  }

  const applyListedOption = (action: ChatAction) => {
    if (action.kind === 'catalog-search' && action.search) {
      onCatalogSearch?.(action.search)
      return true
    }
    if (action.kind === 'catalog-filter') {
      onCatalogFilter?.({
        brands: action.brands,
        categories: action.categories,
        models: action.models,
      })
      return true
    }
    return false
  }

  const pickListedOption = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || !lastOptions.length) return null
    const asIndex = Number(trimmed)
    if (Number.isInteger(asIndex) && asIndex >= 1 && asIndex <= lastOptions.length) {
      return lastOptions[asIndex - 1]
    }
    const folded = trimmed.toLowerCase()
    return lastOptions.find((item) => (
      (item.label || '').toLowerCase() === folded
      || (item.prompt || '') === trimmed
      || (item.search || '') === trimmed
    )) || null
  }

  const pushQuery = (query: string) => {
    const text = query.trim()
    if (typing) return
    if (refreshBlock()) return

    const listed = pickListedOption(text)
    if (listed && applyListedOption(listed)) {
      setDraft('')
      setNotice('')
      return
    }

    const matchesOption = lastOptions.some((item) => (item.prompt || item.label) === text)
    const error = chatDraftError(text, { allowShort: awaitingChoice || matchesOption })
    if (error) {
      setNotice(error)
      return
    }

    const guard = registerChatSend(text)
    if (guard.blocked) {
      setBlockedMessage(guard.message)
      setNotice('')
      setMessages((current) => [
        ...current,
        { id: `block-${current.length}`, role: 'bot', text: guard.message },
      ])
      return
    }

    setNotice('')
    setDraft('')
    setMessages((current) => [...current, { id: `user-${current.length}`, role: 'user', text }])
    setTyping(true)

    const delay = Math.max(0, getBotSettings().replyDelayMs ?? 3000)

    void (async () => {
      let reply: ChatReply
      try {
        reply = await answerLandingChat(text)
      } catch {
        reply = {
          text: 'Tuve un inconveniente al preparar la respuesta y no quiero dejarte sin una respuesta. Escríbeme de nuevo o te contacto con un asesor por WhatsApp.',
          actions: [],
        }
      }

      replyTimer.current = window.setTimeout(() => {
        setMessages((current) => [
          ...current,
          { id: `bot-${current.length}`, role: 'bot', text: reply.text, reply },
        ])
        setTyping(false)
        dispatchCatalogCommand(reply.catalogCommand)
        replyTimer.current = null
      }, delay)
    })()
  }

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    pushQuery(draft)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    pushQuery(draft)
  }

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    body.scrollTop = body.scrollHeight
  }, [messages, open, typing])

  const toggle = () => {
    setOpen((current) => {
      const next = !current
      if (next) window.setTimeout(() => inputRef.current?.focus(), 0)
      return next
    })
  }

  return (
    <div className={open ? 'landing-chat landing-chat--open' : 'landing-chat'}>
      {open ? (
        <section className="landing-chat__panel" id={panelId} aria-label="Hola soy BotIP">
          <header className="landing-chat__head">
            <p className="landing-chat__title">Hola soy BotIP</p>
            <button type="button" className="landing-chat__close" onClick={() => setOpen(false)} aria-label="Cerrar chat">
              ×
            </button>
          </header>

          <div className="landing-chat__body" ref={bodyRef}>
            {messages.map((message) => (
              <article key={message.id} className={`landing-chat__bubble landing-chat__bubble--${message.role}`}>
                <p>{message.text}</p>
                {message.reply?.options?.length ? (
                  <div className="landing-chat__options">
                    {message.reply.options.map((action, index) => (
                      <ChatLink
                        key={action.label}
                        action={action}
                        index={index + 1}
                        onPrompt={pushQuery}
                        onLogin={onLogin}
                        onOpenPriceList={onOpenPriceList}
                        onOpenStore={onOpenStore}
                        onCatalogSearch={onCatalogSearch}
                        onCatalogFilter={onCatalogFilter}
                      />
                    ))}
                  </div>
                ) : null}
                {message.reply?.actions.length ? (
                  <div className="landing-chat__actions">
                    {message.reply.actions.map((action) => (
                      <ChatLink
                        key={action.label}
                        action={action}
                        onPrompt={pushQuery}
                        onLogin={onLogin}
                        onOpenPriceList={onOpenPriceList}
                        onOpenStore={onOpenStore}
                        onCatalogSearch={onCatalogSearch}
                        onCatalogFilter={onCatalogFilter}
                      />
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
            {typing ? (
              <article className="landing-chat__bubble landing-chat__bubble--bot" aria-live="polite">
                <TypingDots />
              </article>
            ) : null}
          </div>

          {blockedMessage ? <p className="landing-chat__block">{blockedMessage}</p> : null}
          {notice ? <p className="landing-chat__notice">{notice}</p> : null}

          <form className="landing-chat__form" onSubmit={submit}>
            <input
              ref={inputRef}
              className="landing-chat__input"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value.slice(0, limits.maxChars))
                if (notice) setNotice('')
              }}
              onKeyDown={onKeyDown}
              placeholder={awaitingChoice ? 'Elige 1, 2 o el nombre' : 'Escribe tu consulta'}
              aria-label="Mensaje"
              autoComplete="off"
              minLength={minChars}
              maxLength={limits.maxChars}
              disabled={typing || Boolean(blockedMessage)}
            />
            <button
              type="submit"
              className="landing-chat__send"
              disabled={typing || Boolean(blockedMessage) || draft.trim().length < minChars}
            >
              Enviar
            </button>
          </form>
          <p className="landing-chat__count">
            {draft.trim().length}/{limits.maxChars}
          </p>
        </section>
      ) : (
        <button
          type="button"
          className="landing-chat__launcher"
          aria-label="Chat"
          aria-expanded={false}
          aria-controls={panelId}
          onClick={toggle}
        >
          <span className="landing-chat__launcher-mark">
            <img className="landing-chat__launcher-icon" src={BOT_ICON} alt="" />
            <span className="landing-chat__launcher-disc" aria-hidden />
          </span>
        </button>
      )}
    </div>
  )
}
