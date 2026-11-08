<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
<div align="center">

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

</div>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h3 align="center">Eureka</h3>
  <p align="center">
    Supply-chain risk intelligence with interactive voice agents
    <br />
    <a href="https://eureka-049.vercel.app"><strong>🌐 Live Demo »</strong></a> — try the <em>ring my phone</em> button: Eureka will call you with a real briefing, then text a summary.
    <br />
    <a href="https://github.com/teddycitrus/eureka"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/teddycitrus/eureka/issues/new?labels=bug">Report Bug</a>
    &middot;
    <a href="https://github.com/teddycitrus/eureka/issues/new?labels=enhancement">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li><a href="#architecture">Architecture</a></li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project
<img width="800" height="450" alt="VideoProject10-ezgif com-optimize (2)" src="https://github.com/user-attachments/assets/58faa872-43bf-4980-9e53-598647b25670" />
Eureka is a supply-chain risk intelligence platform that surfaces vendor and supplier exposure through an interactive 3D globe and lets analysts drill into risk signals via AI-powered voice agents. Instead of sitting idle on a dashboard, Eureka actively scans for incidents and proactively briefs you + suggests next steps.

<br>
<br>

Eureka is built to layer on top of [FourKites Movement](https://www.fourkites.com/) the leading real-time supply-chain visibility platform used by Fortune 500 logistics and procurement teams to track shipments, ETAs and lane telemetry. FourKites tells you *where* every shipment is; Eureka tells you *which of them are about to be in trouble* and gets the right on-call manager on the phone before the disruption hits.

<br>
<br>

Key capabilities:
* **Interactive globe**: visualise supplier locations and risk concentrations across the world in real time using a WebGL-powered 3D map
* **Voice intelligence**: Twilio-backed voice agents let you query the risk database hands-free; Eureka calls you and walks you through findings conversationally, then drops a 2–3 sentence SMS recap with the captured decision into the recipient's inbox for record-keeping
* **Structured risk data**: a Prisma-managed database stores ingested supply-chain events, vendor profiles, and risk scores, queryable via a typed API layer
* **Type-safe throughout**: end-to-end TypeScript with Zod schema validation ensures data integrity from ingest scripts to the UI

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

* [![Next.js][Next.js-badge]][Next-url]
* [![React][React-badge]][React-url]
* [![TypeScript][TypeScript-badge]][TypeScript-url]
* [![Tailwind CSS][Tailwind-badge]][Tailwind-url]
* [![Prisma][Prisma-badge]][Prisma-url]
* [![Three.js][Three-badge]][Three-url]
* [![Twilio][Twilio-badge]][Twilio-url]
* [![Zod][Zod-badge]][Zod-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ARCHITECTURE -->
## Architecture

Eureka is one Next.js app. The browser shows a single working screen, the globe with four windows over it, and keeps it current through a server-sent event stream. API routes read and write a Prisma database, score news against the supplier list, and hand briefings to Vapi, whose webhook reports decisions back.

```mermaid
flowchart LR
  subgraph Browser
    UI["Global lanes screen<br/><sub>globe + Disruptions, Operations, Network, Hear a briefing</sub>"]
  end
  subgraph App["Next.js app"]
    API["API routes<br/><sub>globe, alerts, calls, contacts, shipments</sub>"]
    Ingest["/api/news/ingest<br/><sub>scores headlines against suppliers</sub>"]
    Dispatch["dispatch<br/><sub>calls every callable contact</sub>"]
    Hook["/api/calls/vapi-webhook<br/><sub>decisions, reroutes, recap</sub>"]
    Bus["Event bus<br/><sub>in-memory pub/sub</sub>"]
    SSE["/api/stream<br/><sub>server-sent events</sub>"]
  end
  DB[("SQLite or Turso<br/><sub>via Prisma</sub>")]
  News([NewsAPI])
  Vapi([Vapi voice agent])
  Twilio([Twilio SMS])
  Turnstile([Cloudflare Turnstile])
  Phone([On-call manager])

  UI -- "snapshot, actions" --> API
  UI -. "demo call-me" .-> Turnstile
  API --> DB
  News -. "headlines, stub list without a key" .-> Ingest
  Ingest -- "alerts" --> DB
  Ingest --> Dispatch
  API -- "Call on a risk" --> Vapi
  Dispatch --> Vapi
  Vapi -- "rings" --> Phone
  Vapi -- "function calls, end of call" --> Hook
  Hook -- "decision, reroute" --> DB
  Hook -- "recap" --> Twilio
  Twilio --> Phone
  Ingest --> Bus
  Hook --> Bus
  API --> Bus
  Bus --> SSE
  SSE -- "alert, shipment, call events" --> UI
```

```mermaid
sequenceDiagram
  participant N as NewsAPI
  participant I as /api/news/ingest
  participant D as Database
  participant V as Vapi
  participant M as On-call manager
  participant W as vapi-webhook
  participant T as Twilio
  participant S as /api/stream
  participant U as Global lanes screen

  I->>N: fetch recent supply-chain headlines
  I->>D: store news, create alert when score is 0.4 or more
  I->>S: alert.created
  S-->>U: Disruptions and Risks update, globe tags the supplier
  I->>V: dispatch briefing to each callable contact
  V->>M: phone call with briefing and linked shipments
  M->>V: decides, for example reroute PO-9821-TW
  V->>W: reroute_shipment, then record_decision
  W->>D: shipment rerouted, alert status from the decision
  W->>S: shipment.updated, call.outcome
  S-->>U: lane turns blue on the globe, Log records the decision
  V->>W: end-of-call report
  W->>T: SMS recap to the manager
  Note over U,M: The decision is on the screen and on the manager's phone
```

The pipeline always runs in this order:

1. A headline is scored against the supplier list; only a score of 0.4 or more on a mapped supplier becomes an alert, and its severity comes from the score.
2. Low-severity alerts are never dialled. Every other alert calls, at once, each contact on the supplier's call tree who allows calls, and a failed dial is still logged as a call.
3. Every change (alert, shipment, call) is emitted on the event bus, and the screen refetches its snapshot when one arrives.

Limits that matter:

- The event bus lives in one Node process, so live updates reach only clients connected to the same instance.
- Every API route is rate limited (for example the globe snapshot at 120 a minute). Placing a call from a risk is limited to 10 a minute and is admin-only in demo mode.
- The public demo call is gated by Turnstile and limited to one per IP an hour and one per number a day, with a global daily cap.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

* Node.js 18+
* A PostgreSQL (or compatible) database
* A Twilio account with a voice-capable phone number

```sh
npm install npm@latest -g
```

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/teddycitrus/eureka.git
   cd eureka
   ```

2. Install dependencies
   ```sh
   npm install
   ```

3. Copy the example environment file and fill in your values
   ```sh
   cp .env.example .env
   ```

   Required variables:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/eureka"
   TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   TWILIO_AUTH_TOKEN="your_auth_token"
   TWILIO_PHONE_NUMBER="+1xxxxxxxxxx"
   ```

4. Push the database schema and seed initial data
   ```sh
   npm run db:push
   npm run db:seed
   ```

5. Run the ingest script to populate supply-chain events
   ```sh
   npm run ingest
   ```

6. Start the development server
   ```sh
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the app.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE -->
## Usage

**Globe view**

The home screen renders a live 3D globe of the Earth at night, in greyscale, so the only colour on it is data: suppliers are coloured by risk, lanes by status, and a lane Eureka rerouted turns blue. Suppliers with an open alert carry a name tag. Click a tag, a supplier or a disruption to fly the globe to it and select the matching risk in the Operations window, where the on-call manager is one click away. Four windows (Disruptions, Operations, Network, Hear a briefing) can be dragged, resized, minimized and maximized; on narrow screens they stack under the globe. Add `?sample` to the URL to skip the FourKites connect dialog.

**Voice query**

When critical incidents are detected, Eureka triggers a Twilio outbound call and reads back a synthesized briefing followed by recommended actions. After the call ends, VAPI's end-of-call summary is forwarded to Twilio as an SMS so the contact has a written record of the decision on their phone.

**Try it live**

The deployed instance at [eureka-049.vercel.app](https://eureka-049.vercel.app) exposes a public *ring my phone* button. Enter a US/UK/AU number, solve a one-tap Cloudflare Turnstile check, and Eureka will dial you with a real briefing pulled from the seeded supplier graph — then text you a short summary once the call wraps. Rate-limited to one call per number per day and a configurable global cap, so cost stays predictable.

**Ingest pipeline**

`npm run ingest` fetches new supply-chain events from configured data sources, validates them with Zod, and writes them to the database. Schedule this with a cron job or a CI workflow for continuous updates.

**Database studio**

Run `npm run db:studio` to open Prisma Studio and browse or edit records directly.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

- [x] Interactive 3D globe with supplier node visualisation powered by `react-globe.gl` and Three.js
- [x] Twilio voice agent integration for hands-free, conversational risk queries
- [x] Public *ring my phone* demo live at [eureka-049.vercel.app](https://eureka-049.vercel.app), gated by Cloudflare Turnstile and per-IP / per-phone / global daily caps
- [x] Post-call SMS recap so the captured decision and supplier context live on the contact's phone, not just in the dashboard
- [ ] User authentication and role-based access control so teams can collaborate with scoped permissions
- [ ] Alerting and notification system that proactively pages analysts when a supplier's risk score crosses a configurable threshold

See the [open issues](https://github.com/teddycitrus/eureka/issues) for a full list of proposed features and known bugs.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

Contributions are welcome. If you have a suggestion, please fork the repo and open a pull request, or file an issue with the `enhancement` label.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a pull request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

Project Link: [https://github.com/teddycitrus/eureka](https://github.com/teddycitrus/eureka)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & BADGES -->
[contributors-shield]: https://img.shields.io/github/contributors/teddycitrus/eureka.svg?style=for-the-badge&cacheSeconds=60
[contributors-url]: https://github.com/teddycitrus/eureka/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/teddycitrus/eureka.svg?style=for-the-badge&cacheSeconds=60
[forks-url]: https://github.com/teddycitrus/eureka/network/members
[stars-shield]: https://img.shields.io/github/stars/teddycitrus/eureka.svg?style=for-the-badge&cacheSeconds=60
[stars-url]: https://github.com/teddycitrus/eureka/stargazers
[issues-shield]: https://img.shields.io/github/issues/teddycitrus/eureka.svg?style=for-the-badge&cacheSeconds=60
[issues-url]: https://github.com/teddycitrus/eureka/issues
[license-shield]: https://img.shields.io/github/license/teddycitrus/eureka.svg?style=for-the-badge&cacheSeconds=60
[license-url]: https://github.com/teddycitrus/eureka/blob/main/LICENSE

[Next.js-badge]: https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[React-badge]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[TypeScript-badge]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[Tailwind-badge]: https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
[Prisma-badge]: https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white
[Prisma-url]: https://www.prisma.io/
[Three-badge]: https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white
[Three-url]: https://threejs.org/
[Twilio-badge]: https://img.shields.io/badge/Twilio-F22F46?style=for-the-badge&logo=twilio&logoColor=white
[Twilio-url]: https://www.twilio.com/
[Zod-badge]: https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white
[Zod-url]: https://zod.dev/
