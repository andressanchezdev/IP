import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from 'react'
import { answerLandingChat, type ChatReply } from './answerChat'
import { endChatSession, loadSession, saveSession, startChatSession } from './sessionContext'
import { processChatExcelFile } from './createOrderFlow'
import { chatDraftError, readChatGuard, registerChatSend } from './chatGuard'
import { getBotSettings } from './botSettings'
import { welcomeReply, type ChatAction } from './intents'
import './StoreChatWidget.css'

const BOT_ICON = '/static/landing/IconBot/botIP.png'

const SEARCH_READY_TEXT = [
  '🔍 Barra de búsqueda lista',
  '',
  'Escribe modelo, marca o categoría.',
  'Cuando encuentres el producto, copia el CÓDIGO.',
  '',
  '> Pégalo aquí y lo agrego al carrito por ti.',
].join('\n')

const CATALOG_OPENED_TEXT = [
  '🛒 Catálogo abierto',
  '',
  'Explora, filtra o busca.',
  'Cuando tengas el producto, copia su CÓDIGO y pégalo aquí.',
].join('\n')

const CATALOG_HERE_TEXT = [
  '🛒 Ya estás en el catálogo',
  '',
  'Filtra o busca lo que necesitas.',
].join('\n')

type ChatMessage = {
  id: string
  role: 'bot' | 'user'
  reply?: ChatReply
  text: string
}

type StoreChatWidgetProps = {
  onLogin?: () => void
  onOpenPriceList?: () => void
  onOpenStore?: () => boolean | void
  onFocusSearch?: () => void
  onCatalogSearch?: (query: string) => void
  onCatalogFilter?: (payload: { brands?: string[]; categories?: string[]; models?: string[] }) => void
  onOpenBulkUpload?: () => void
  onOpenCart?: () => void
  onDownloadTemplate?: () => void
  onChatAddToCart?: (row: { id: string; codigo?: string; cantidad: number; stock?: number; precio?: number; estado?: string }) => void
  onChatBulkCommit?: () => void
  onRefreshCart?: () => void
}

function foldChoice(value = '') {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function isConfirmChoice(action: ChatAction) {
  const label = foldChoice(action.label)
  return label === 'si' || label === 'no'
}

function ChatLink({
  action,
  index,
  onPrompt,
  onLogin,
  onOpenPriceList,
  onOpenStore,
  onFocusSearch,
  onCatalogSearch,
  onCatalogFilter,
  onOpenBulkUpload,
  onOpenCart,
  onDownloadTemplate,
}: {
  action: ChatAction
  index?: number
  onPrompt?: (prompt: string) => void
  onLogin?: () => void
  onOpenPriceList?: () => void
  onOpenStore?: () => boolean | void
  onFocusSearch?: () => void
  onCatalogSearch?: (query: string) => void
  onCatalogFilter?: (payload: { brands?: string[]; categories?: string[]; models?: string[] }) => void
  onOpenBulkUpload?: () => void
  onOpenCart?: () => void
  onDownloadTemplate?: () => void
}) {
  if (action.kind === 'catalog-search' && action.search) {
    return (
      <button
        type="button"
        className="landing-chat__option"
        onClick={() => {
          onCatalogSearch?.(action.search || '')
          if (action.prompt) onPrompt?.(action.prompt)
        }}
      >
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

  if (action.kind === 'open-bulk-upload') {
    return (
      <button type="button" className="landing-chat__action" onClick={() => onOpenBulkUpload?.()}>
        {action.label}
      </button>
    )
  }

  if (action.kind === 'open-cart') {
    return (
      <button type="button" className="landing-chat__action" onClick={() => onOpenCart?.()}>
        {action.label}
      </button>
    )
  }

  if (action.kind === 'download-template') {
    return (
      <button type="button" className="landing-chat__action" onClick={() => onDownloadTemplate?.()}>
        {action.label}
      </button>
    )
  }

  if (action.kind === 'focus-search' || /barra de b[uú]squeda/i.test(action.label)) {
    return (
      <button type="button" className="landing-chat__action" onClick={() => onFocusSearch?.()}>
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

function BubbleText({ text }: { text: string }) {
  const paragraphs = text.replace(/\r\n/g, '\n').split(/\n{2,}/).filter((block) => block.trim())
  return (
    <div className="landing-chat__text">
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
      ))}
    </div>
  )
}

export function StoreChatWidget({
  onLogin,
  onOpenPriceList,
  onOpenStore,
  onFocusSearch,
  onCatalogSearch,
  onCatalogFilter,
  onOpenBulkUpload,
  onOpenCart,
  onDownloadTemplate,
  onChatAddToCart,
  onChatBulkCommit,
  onRefreshCart,
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
  const [fileDrop, setFileDrop] = useState({ active: false })
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

  const appendBotMessage = (text: string) => {
    setMessages((current) => [
      ...current,
      { id: `bot-${current.length}`, role: 'bot', text, reply: { text, actions: [] } },
    ])
  }

  const handleFocusSearchAction = () => {
    onFocusSearch?.()
    appendBotMessage(SEARCH_READY_TEXT)
  }

  const handleOpenStoreAction = () => {
    const already = Boolean(onOpenStore?.())
    appendBotMessage(already ? CATALOG_HERE_TEXT : CATALOG_OPENED_TEXT)
  }

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
      return
    }
    if (command.kind === 'add-cart' && command.row) {
      onChatAddToCart?.(command.row)
      return
    }
    if (command.kind === 'bulk-commit') {
      onChatBulkCommit?.()
      return
    }
    if (command.kind === 'refresh-cart') {
      onRefreshCart?.()
      return
    }
    if (command.kind === 'open-cart') {
      onOpenCart?.()
      return
    }
    if (command.kind === 'open-bulk-upload') {
      onOpenBulkUpload?.()
      return
    }
    if (command.kind === 'download-template') {
      onDownloadTemplate?.()
    }
  }

  const applyListedOption = (action: ChatAction) => {
    if (action.kind === 'catalog-search' && action.search) {
      onCatalogSearch?.(action.search)
      return !action.prompt
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

  const pushOption = (query: string) => {
    pushQuery(query, { fromOption: true })
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

  const pushQuery = (query: string, opts?: { fromOption?: boolean }) => {
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

    const showUser = !opts?.fromOption || Boolean(listed && isConfirmChoice(listed))
    setNotice('')
    setDraft('')
    if (showUser) {
      setMessages((current) => [...current, { id: `user-${current.length}`, role: 'user', text }])
    }
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

  const ingestExcelFile = (file: File | undefined) => {
    if (!file || typing) return
    const name = file.name.toLowerCase()
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setNotice('El archivo debe ser Excel (.xlsx o .xls).')
      return
    }
    setNotice('')
    setMessages((current) => [...current, { id: `user-${current.length}`, role: 'user', text: `Archivo: ${file.name}` }])
    setTyping(true)
    void (async () => {
      let reply: ChatReply
      try {
        const ctx = loadSession()
        reply = await processChatExcelFile(ctx, file)
        saveSession(ctx)
      } catch {
        reply = { text: 'No pude leer el Excel. Intenta de nuevo o súbelo desde el drawer.', actions: [] }
      }
      setMessages((current) => [...current, { id: `bot-${current.length}`, role: 'bot', text: reply.text, reply }])
      setTyping(false)
      dispatchCatalogCommand(reply.catalogCommand)
    })()
  }

  const onFormDragOver = (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFileDrop({ active: true })
  }

  const onFormDragLeave = (event: DragEvent<HTMLFormElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return
    setFileDrop({ active: false })
  }

  const onFormDrop = (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFileDrop({ active: false })
    ingestExcelFile(event.dataTransfer.files?.[0])
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
                <BubbleText text={message.text} />
                {message.reply?.options?.length ? (
                  <div className="landing-chat__options">
                    {message.reply.options.map((action, index) => (
                      <ChatLink
                        key={action.label}
                        action={action}
                        index={index + 1}
                        onPrompt={pushOption}
                        onLogin={onLogin}
                        onOpenPriceList={onOpenPriceList}
                        onOpenStore={handleOpenStoreAction}
                        onFocusSearch={handleFocusSearchAction}
                        onCatalogSearch={onCatalogSearch}
                        onCatalogFilter={onCatalogFilter}
                        onOpenBulkUpload={onOpenBulkUpload}
                        onOpenCart={onOpenCart}
                        onDownloadTemplate={onDownloadTemplate}
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
                        onOpenStore={handleOpenStoreAction}
                        onFocusSearch={handleFocusSearchAction}
                        onCatalogSearch={onCatalogSearch}
                        onCatalogFilter={onCatalogFilter}
                        onOpenBulkUpload={onOpenBulkUpload}
                        onOpenCart={onOpenCart}
                        onDownloadTemplate={onDownloadTemplate}
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

          <form
            className={`landing-chat__form${fileDrop.active ? ' landing-chat__form--drop' : ''}`}
            onSubmit={submit}
            onDragEnter={onFormDragOver}
            onDragOver={onFormDragOver}
            onDragLeave={onFormDragLeave}
            onDrop={onFormDrop}
          >
            <input
              ref={inputRef}
              className="landing-chat__input"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value.slice(0, limits.maxChars))
                if (notice) setNotice('')
              }}
              onKeyDown={onKeyDown}
              placeholder={fileDrop.active ? 'Suelta el Excel aquí' : awaitingChoice ? 'Elige 1, 2 o el nombre' : 'Escribe tu consulta o suelta un Excel'}
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
