import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleDollarSign,
  CircleHelp,
  FileCheck2,
  Fingerprint,
  Hexagon,
  QrCode,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { HeroMotion } from './components/motion/hero-motion';
import { HowScrollMotion } from './components/motion/how-scroll-motion';
import { Sep7FlowMotion } from './components/motion/sep7-flow-motion';

const tools = [
  {
    number: '01',
    icon: WalletCards,
    title: 'Generador SEP-7',
    description:
      'Prepara una solicitud con destino, activo, importe y memo. Comparte la URI o su código QR.',
    href: '/app/request',
    action: 'Crear solicitud',
  },
  {
    number: '02',
    icon: Hexagon,
    title: 'Visualizador de trustline',
    description:
      'Comprueba si una cuenta tiene una línea de confianza para un activo emitido y si está autorizada.',
    href: '/app/trustline',
    action: 'Consultar trustline',
  },
  {
    number: '03',
    icon: CircleDollarSign,
    title: 'Calculadora XLM/USD',
    description:
      'Consulta una referencia de mercado para convertir un importe de XLM a dólares.',
    href: '/app/calculator',
    action: 'Calcular referencia',
  },
];

const faqs = [
  {
    question: '¿Esta demo mueve dinero real?',
    answer:
      'No. La aplicación está configurada para Stellar Testnet. Las operaciones usan una red de pruebas y no representan pagos ni saldos reales.',
  },
  {
    question: '¿Qué wallets pueden abrir una solicitud SEP-7?',
    answer:
      'Las wallets compatibles con SEP-7 pueden interpretar una URI de pago, pero el soporte varía entre wallets y sus versiones. Si una wallet no reconoce el enlace, puedes copiar la URI para probarla en una compatible.',
  },
  {
    question: '¿El backend guarda mi clave privada?',
    answer:
      'No. La clave permanece en tu wallet. El servidor prepara una transacción Soroban y transmite el XDR firmado por el usuario; nunca solicita una seed o clave privada.',
  },
  {
    question: '¿Qué registra el contrato Soroban?',
    answer:
      'El contrato registra una huella verificable de la solicitud. No procesa, valida ni garantiza el pago; tampoco guarda el importe, el destino ni los fondos.',
  },
  {
    question: '¿Freighter lee el código QR?',
    answer:
      'No. En esta demo Freighter se utiliza únicamente como extensión para firmar el registro de la huella en Soroban. El QR contiene el enlace SEP-7 para compartir con una wallet compatible.',
  },
];

function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`landing-brand-mark${light ? ' light' : ''}`}
      aria-hidden="true"
    >
      <CircleDollarSign size={21} strokeWidth={2.2} />
    </span>
  );
}

function HeroArtwork() {
  return (
    <svg
      className="hero-art-svg"
      viewBox="0 0 780 390"
      role="img"
      aria-labelledby="hero-art-title"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id="hero-art-title">
        Solicitud de pago conectada a una wallet
      </title>
      <defs>
        <pattern
          id="hero-grid"
          width="28"
          height="28"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M28 0H0V28"
            fill="none"
            stroke="#D9F28C"
            strokeOpacity=".08"
          />
        </pattern>
      </defs>
      <path d="M30 26H750V364H30z" fill="url(#hero-grid)" />
      <path
        d="M161 196h138m180 0h111"
        stroke="#D9F28C"
        strokeWidth="2"
        strokeDasharray="5 8"
      />
      <circle cx="230" cy="196" r="4" fill="#D9F28C" />
      <circle cx="526" cy="196" r="4" fill="#D9F28C" />
      <g className="hero-layer hero-layer-back" data-hero-layer="back">
        <circle cx="587" cy="91" r="43" fill="#D9F28C" fillOpacity=".1" />
        <circle
          cx="587"
          cy="91"
          r="27"
          fill="none"
          stroke="#D9F28C"
          strokeOpacity=".4"
        />
        <path d="M577 91h20m-10-10v20" stroke="#D9F28C" strokeWidth="2" />
        <path
          d="M652 268h40m-20-20v40"
          stroke="#EC8A66"
          strokeWidth="2"
          strokeOpacity=".8"
        />
        <circle cx="97" cy="99" r="4" fill="#EC8A66" />
        <circle cx="695" cy="127" r="3" fill="#D9F28C" />
      </g>
      <g className="hero-layer hero-layer-left" data-hero-layer="left">
        <rect x="45" y="118" width="208" height="156" rx="8" fill="#F7F8EE" />
        <path d="M45 153h208" stroke="#DCE4D8" />
        <circle cx="64" cy="136" r="3" fill="#D77357" />
        <circle cx="76" cy="136" r="3" fill="#D9F28C" />
        <text
          x="66"
          y="180"
          fill="#607267"
          fontSize="10"
          fontFamily="monospace"
        >
          SOLICITUD DE PAGO
        </text>
        <text
          x="66"
          y="214"
          fill="#183A2D"
          fontSize="24"
          fontWeight="700"
          fontFamily="sans-serif"
        >
          12.50 XLM
        </text>
        <path d="M66 232h118" stroke="#CBD6CC" />
        <text x="66" y="253" fill="#607267" fontSize="9" fontFamily="monospace">
          web+stellar:pay
        </text>
      </g>
      <g className="hero-layer hero-layer-center" data-hero-layer="center">
        <circle cx="389" cy="196" r="83" fill="#D9F28C" />
        <circle cx="389" cy="196" r="64" fill="#183A2D" />
        <path
          d="M361 196h56m-28-28v56"
          stroke="#D9F28C"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle
          cx="389"
          cy="196"
          r="38"
          fill="none"
          stroke="#D9F28C"
          strokeOpacity=".4"
        />
        <text
          x="389"
          y="307"
          textAnchor="middle"
          fill="#D9F28C"
          fontSize="9"
          fontFamily="monospace"
          letterSpacing="2"
        >
          STELLAR TESTNET
        </text>
      </g>
      <g className="hero-layer hero-layer-right" data-hero-layer="right">
        <rect x="535" y="140" width="200" height="112" rx="8" fill="#F7F8EE" />
        <rect x="553" y="158" width="35" height="35" rx="4" fill="#D9F28C" />
        <path
          d="M561 176l6 6 13-14"
          fill="none"
          stroke="#183A2D"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="601"
          y="172"
          fill="#183A2D"
          fontSize="11"
          fontWeight="700"
          fontFamily="sans-serif"
        >
          Enlace preparado
        </text>
        <text
          x="601"
          y="189"
          fill="#718078"
          fontSize="9"
          fontFamily="monospace"
        >
          SEP-7 · XLM
        </text>
        <path d="M553 212h160" stroke="#DFE5DD" />
        <text
          x="553"
          y="233"
          fill="#718078"
          fontSize="9"
          fontFamily="monospace"
        >
          Sin custodiar fondos
        </text>
      </g>
    </svg>
  );
}

function HowStepVisual({ kind }: { kind: 'configure' | 'verify' | 'share' }) {
  if (kind === 'configure') {
    return (
      <svg
        viewBox="0 0 300 190"
        role="img"
        aria-label="Vista de configuración de solicitud"
      >
        <rect
          x="17"
          y="17"
          width="266"
          height="156"
          rx="7"
          fill="#F8FAF5"
          stroke="#DCE4D8"
        />
        <text x="35" y="43" fill="#47604F" fontSize="10" fontFamily="monospace">
          NUEVA SOLICITUD
        </text>
        <rect
          x="35"
          y="58"
          width="230"
          height="31"
          rx="4"
          fill="white"
          stroke="#DCE4D8"
        />
        <text x="46" y="78" fill="#7B8A7E" fontSize="9" fontFamily="monospace">
          G... DESTINO
        </text>
        <rect
          x="35"
          y="101"
          width="102"
          height="32"
          rx="4"
          fill="white"
          stroke="#DCE4D8"
        />
        <text
          x="46"
          y="122"
          fill="#193B2D"
          fontSize="11"
          fontWeight="700"
          fontFamily="sans-serif"
        >
          12.50 XLM
        </text>
        <rect x="145" y="101" width="120" height="32" rx="4" fill="#D9F28C" />
        <text
          x="157"
          y="122"
          fill="#193B2D"
          fontSize="10"
          fontWeight="700"
          fontFamily="sans-serif"
        >
          Testnet
        </text>
        <path
          d="M35 148h116"
          stroke="#DCE4D8"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === 'verify') {
    return (
      <svg
        viewBox="0 0 300 190"
        role="img"
        aria-label="Comprobación de trustline"
      >
        <rect
          x="17"
          y="17"
          width="266"
          height="156"
          rx="7"
          fill="#F8FAF5"
          stroke="#DCE4D8"
        />
        <circle cx="150" cy="82" r="37" fill="#E9F2DB" />
        <path
          d="M132 82l12 12 25-27"
          fill="none"
          stroke="#2D6340"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="150"
          y="139"
          textAnchor="middle"
          fill="#193B2D"
          fontSize="12"
          fontWeight="700"
          fontFamily="sans-serif"
        >
          Trustline autorizada
        </text>
        <text
          x="150"
          y="157"
          textAnchor="middle"
          fill="#718078"
          fontSize="9"
          fontFamily="monospace"
        >
          USDC · HORIZON
        </text>
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 300 190"
      role="img"
      aria-label="URI SEP-7 lista para compartir"
    >
      <rect
        x="17"
        y="17"
        width="266"
        height="156"
        rx="7"
        fill="#F8FAF5"
        stroke="#DCE4D8"
      />
      <rect
        x="40"
        y="42"
        width="77"
        height="77"
        rx="3"
        fill="white"
        stroke="#DCE4D8"
      />
      <path
        d="M49 51h21v21H49zm37 0h21v21H86zM49 89h21v21H49zm37-1h8v8h-8zm13 0h8v8h-8zm-13 13h8v8h-8zm13 0h8v8h-8z"
        fill="#193B2D"
      />
      <text x="139" y="65" fill="#47604F" fontSize="9" fontFamily="monospace">
        ENLACE SEP-7
      </text>
      <path
        d="M139 78h115m-115 10h103m-103 10h82"
        stroke="#BDD1BF"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="139" y="111" width="81" height="25" rx="4" fill="#193B2D" />
      <text
        x="179"
        y="127"
        textAnchor="middle"
        fill="white"
        fontSize="9"
        fontWeight="700"
        fontFamily="sans-serif"
      >
        Copiar enlace
      </text>
    </svg>
  );
}

function Sep7Flow() {
  return (
    <div
      className="landing-sep-flow"
      aria-label="Solicitud, URI SEP-7, código QR y wallet compatible"
    >
      <div className="sep-flow-node">
        <FileCheck2 size={24} aria-hidden="true" />
        <span>Solicitud</span>
      </div>
      <ArrowRight className="sep-flow-arrow" size={18} aria-hidden="true" />
      <div className="sep-flow-node uri-node">
        <span className="uri-node-label">URI SEP-7</span>
        <code>web+stellar:pay</code>
      </div>
      <ArrowRight className="sep-flow-arrow" size={18} aria-hidden="true" />
      <div className="sep-flow-node">
        <QrCode size={25} aria-hidden="true" />
        <span>Código QR</span>
      </div>
      <ArrowRight className="sep-flow-arrow" size={18} aria-hidden="true" />
      <div className="sep-flow-node">
        <WalletCards size={25} aria-hidden="true" />
        <span>Wallet compatible</span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="landing-page">
      <div className="testnet-ribbon">
        DEMO EN STELLAR TESTNET <span aria-hidden="true">·</span> NO MUEVE
        DINERO REAL
      </div>

      <nav className="landing-nav" aria-label="Navegación principal">
        <Link
          className="landing-brand"
          href="/"
          aria-label="Stellar Desk, inicio"
        >
          <BrandMark />
          <span>Stellar Desk</span>
        </Link>
        <div className="landing-nav-links">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#herramientas">Herramientas</a>
          <a href="#preguntas">Preguntas</a>
        </div>
        <Link className="landing-nav-cta" href="/app/request">
          Crear solicitud <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </nav>

      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="hero-grid-pattern" aria-hidden="true" />
        <div className="landing-hero-copy">
          <p className="landing-kicker">
            <span /> SOLICITUDES DE PAGO EN STELLAR
          </p>
          <h1 id="hero-title">Generador de solicitud de pago para Stellar</h1>
          <p className="hero-description">
            Prepara un enlace SEP-7 claro para compartir. Verifica trustlines y
            consulta una referencia XLM/USD, todo en una demo no custodial.
          </p>
          <div className="hero-actions">
            <Link className="hero-primary" href="/app/request">
              Crear solicitud <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <a className="hero-secondary" href="#como-funciona">
              Conocer el flujo <ArrowDown size={15} aria-hidden="true" />
            </a>
          </div>
          <p className="hero-safety">
            <ShieldCheck size={15} aria-hidden="true" /> Tus claves permanecen
            en tu wallet. Esta demo no mueve dinero real.
          </p>
        </div>
        <HeroMotion>
          <div
            className="hero-art-wrap"
            aria-label="Ilustración del flujo de una solicitud Stellar"
          >
            <HeroArtwork />
            <span className="hero-art-caption">
              UNA SOLICITUD · UN ENLACE · TU WALLET
            </span>
          </div>
        </HeroMotion>
        <div className="hero-bottom-rule">
          <span>01</span>
          <span>Stellar Testnet</span>
          <span>02</span>
        </div>
      </section>

      <section
        className="problem-section landing-section"
        id="problema"
        aria-labelledby="problem-title"
      >
        <div className="section-overline">EL PUNTO DE PARTIDA</div>
        <div className="problem-layout">
          <h2 id="problem-title">
            Pedir un pago no debería convertirse en una conversación
            interminable.
          </h2>
          <div className="problem-copy">
            <p>
              Una dirección, un activo, un importe y quizá un memo. Cuando esos
              datos viajan por mensajes sueltos, es fácil confundirlos o volver
              a escribirlos.
            </p>
            <p>
              Esta herramienta reúne los datos en una solicitud compartible y te
              deja comprobar lo esencial antes de enviarla.
            </p>
          </div>
        </div>
        <div
          className="problem-signals"
          aria-label="Datos que suelen perderse al solicitar un pago"
        >
          <div>
            <span className="signal-index">A</span>
            <strong>Destino</strong>
            <span>¿A qué cuenta?</span>
          </div>
          <div>
            <span className="signal-index">B</span>
            <strong>Activo e importe</strong>
            <span>¿Qué se solicita?</span>
          </div>
          <div>
            <span className="signal-index">C</span>
            <strong>Memo</strong>
            <span>¿Qué referencia?</span>
          </div>
        </div>
      </section>

      <section
        className="how-section landing-section"
        id="como-funciona"
        aria-labelledby="how-title"
      >
        <div className="section-heading-row">
          <div>
            <div className="section-overline">UN FLUJO SENCILLO</div>
            <h2 id="how-title">Configura. Verifica. Comparte.</h2>
          </div>
          <p>
            Herramientas independientes para preparar una solicitud con más
            contexto.
          </p>
        </div>
        <HowScrollMotion>
          <div className="how-steps">
            <article className="how-step">
              <div className="step-heading">
                <span>01</span>
                <h3>Configura</h3>
              </div>
              <p>
                Indica la cuenta, el activo y el importe. Añade un memo si lo
                necesitas.
              </p>
              <div className="how-visual" data-how-visual="configure">
                <HowStepVisual kind="configure" />
              </div>
            </article>
            <article className="how-step">
              <div className="step-heading">
                <span>02</span>
                <h3>Verifica</h3>
              </div>
              <p>
                Comprueba si existe una trustline autorizada para recibir el
                activo emitido.
              </p>
              <div className="how-visual" data-how-visual="verify">
                <HowStepVisual kind="verify" />
              </div>
            </article>
            <article className="how-step">
              <div className="step-heading">
                <span>03</span>
                <h3>Comparte</h3>
              </div>
              <p>
                Usa el enlace SEP-7 o su QR con wallets compatibles. El pagador
                revisa y decide.
              </p>
              <div className="how-visual" data-how-visual="share">
                <HowStepVisual kind="share" />
              </div>
            </article>
          </div>
        </HowScrollMotion>
      </section>

      <section
        className="tools-section landing-section"
        id="herramientas"
        aria-labelledby="tools-title"
      >
        <div className="tools-intro">
          <div className="section-overline">TRES HERRAMIENTAS</div>
          <h2 id="tools-title">
            Lo necesario para preparar el siguiente paso.
          </h2>
          <p>
            Elige una herramienta. Cada una resuelve una tarea concreta y
            utiliza los servicios reales de la aplicación.
          </p>
        </div>
        <div className="tool-list">
          {tools.map(
            ({ number, icon: Icon, title, description, href, action }) => (
              <article className="tool-item" key={href}>
                <span className="tool-number">{number}</span>
                <span className="tool-icon">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div className="tool-copy">
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <Link
                  className="tool-link"
                  href={href}
                  aria-label={`${action}: ${title}`}
                >
                  <span>{action}</span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
              </article>
            ),
          )}
        </div>
      </section>

      <section
        className="sep-section landing-section"
        id="sep7"
        aria-labelledby="sep-title"
      >
        <div className="sep-section-heading">
          <div className="section-overline">UN FORMATO PARA COMPARTIR</div>
          <h2 id="sep-title">
            SEP-7 lleva la solicitud hasta una wallet compatible.
          </h2>
          <p>
            La URI reúne los datos de pago en un formato que algunas wallets
            Stellar pueden reconocer. La wallet muestra la operación antes de
            que la persona decida continuar.
          </p>
        </div>
        <Sep7FlowMotion>
          <div className="sep-flow-stage">
            <Sep7Flow />
          </div>
        </Sep7FlowMotion>
        <div className="custody-note">
          <div className="custody-icon">
            <ShieldCheck size={23} aria-hidden="true" />
          </div>
          <div>
            <h3>La firma sigue siendo tuya.</h3>
            <p>
              La aplicación no pide ni almacena claves privadas, seeds o frases
              de recuperación. Tú revisas la solicitud y firmas desde una wallet
              compatible cuando corresponda.
            </p>
          </div>
          <span className="custody-tag">
            <Check size={13} aria-hidden="true" /> NO CUSTODIAL
          </span>
        </div>
      </section>

      <section
        className="soroban-section landing-section"
        id="stellar-soroban"
        aria-labelledby="soroban-title"
      >
        <div className="soroban-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
          <Hexagon size={68} strokeWidth={1} />
        </div>
        <div className="soroban-copy">
          <div className="section-overline">STELLAR + SOROBAN</div>
          <h2 id="soroban-title">
            Una huella verificable, no una promesa de pago.
          </h2>
          <p>
            De forma opcional, el contrato registra una huella verificable de la
            solicitud. Es una referencia asociada al contenido de la solicitud,
            no una prueba de que el pago ocurrió.
          </p>
          <p>
            El contrato no procesa, valida ni garantiza el pago. No recibe
            fondos ni conserva los datos privados de la solicitud.
          </p>
          <Link className="inline-action" href="/app/request">
            Preparar una solicitud <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <div
          className="soroban-stamp"
          aria-label="La huella se registra en Stellar Testnet"
        >
          <Fingerprint size={28} aria-hidden="true" />
          <span>HUELLA DE SOLICITUD</span>
          <code>SHA-256</code>
          <span className="stamp-network">STELLAR TESTNET</span>
        </div>
      </section>

      <section
        className="faq-section landing-section"
        id="preguntas"
        aria-labelledby="faq-title"
      >
        <div className="faq-intro">
          <div className="section-overline">ANTES DE EMPEZAR</div>
          <h2 id="faq-title">Preguntas frecuentes</h2>
          <p>Una aclaración rápida sobre redes, wallets y la huella.</p>
        </div>
        <div className="faq-list">
          {faqs.map(({ question, answer }) => (
            <details className="faq-item" key={question}>
              <summary>
                <span>{question}</span>
                <CircleHelp size={17} aria-hidden="true" />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="final-cta" aria-labelledby="final-cta-title">
        <div className="final-cta-pattern" aria-hidden="true" />
        <div className="final-cta-content">
          <div className="section-overline">PRUEBA EL FLUJO</div>
          <h2 id="final-cta-title">Empieza con una solicitud clara.</h2>
          <p>
            Prepara los datos, revisa el resultado y compártelo desde Stellar
            Testnet.
          </p>
          <Link className="hero-primary" href="/app/request">
            Crear solicitud <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="final-cta-mark" aria-hidden="true">
          <BrandMark light />
        </div>
      </section>

      <footer className="landing-footer">
        <Link
          className="landing-brand footer-brand"
          href="/"
          aria-label="Stellar Desk, inicio"
        >
          <BrandMark />
          <span>Stellar Desk</span>
        </Link>
        <p>
          Demo académica en Stellar Testnet. No mueve dinero real ni sustituye
          una wallet.
        </p>
        <a href="#hero-title">
          Volver arriba <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </footer>
    </main>
  );
}
