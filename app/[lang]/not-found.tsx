export default function NotFound() {
  return (
    <section className="wrap nf">
      <p className="kicker">404</p>
      <h1 className="h2">No encontramos esa página.</h1>
      <p className="lead" style={{ margin: '0 auto' }}>
        We couldn’t find that page.
      </p>
      <p>
        <a className="btn btn-primary" href="/">
          Ir al inicio
        </a>{' '}
        <a className="btn btn-ghost" href="/en">
          Go to the English site
        </a>
      </p>
    </section>
  );
}
