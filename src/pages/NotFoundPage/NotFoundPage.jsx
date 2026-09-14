import './NotFoundPage.css'

const ERROR_404_SRC = '/static/landing/error/404_notFound.jpg.jpeg'

export function NotFoundPage() {
  return (
    <section className="not-found-page" aria-label="Error 404: la página no existe">
      <img className="not-found-page__image" src={ERROR_404_SRC} alt="Error 404: la página no existe" />
      <a href="/" className="not-found-page__back">
        Volver al inicio
      </a>
    </section>
  )
}
