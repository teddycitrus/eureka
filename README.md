<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h3 align="center">Eureka</h3>
![](eurekaDemo.gif)
  <p align="center">
    Supply-chain risk intelligence with interactive voice agents
    <br />
    <a href="https://github.com/teddycitrus/eureka-iris"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/teddycitrus/eureka-iris/issues/new?labels=bug">Report Bug</a>
    &middot;
    <a href="https://github.com/teddycitrus/eureka-iris/issues/new?labels=enhancement">Request Feature</a>
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

Eureka is a supply-chain risk intelligence platform that surfaces vendor and supplier exposure through an interactive 3D globe and lets analysts drill into risk signals via AI-powered voice agents. Instead of sitting idle on a dashboard, Eureka actively scans for incidents and proactively briefs you + suggests next steps.

Key capabilities:
* **Interactive globe**: visualise supplier locations and risk concentrations across the world in real time using a WebGL-powered 3D map
* **Voice intelligence**: Twilio-backed voice agents let you query the risk database hands-free; Eureka calls you and walks you through findings conversationally
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
   git clone https://github.com/teddycitrus/eureka-iris.git
   cd eureka-iris
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
   DATABASE_URL="postgresql://user:password@localhost:5432/iris"
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

The home screen renders a live 3D globe. Supplier nodes are plotted by geography; colour intensity reflects aggregated risk score. Click any node to open a detail panel with event history and current exposure metrics.

**Voice query**

When critical incidents are detected, Eureka triggers a Twilio outbound call and reads back a synthesized briefing followed by recommended actions.

**Ingest pipeline**

`npm run ingest` fetches new supply-chain events from configured data sources, validates them with Zod, and writes them to the database. Schedule this with a cron job or a CI workflow for continuous updates.

**Database studio**

Run `npm run db:studio` to open Prisma Studio and browse or edit records directly.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

- [x] Interactive 3D globe with supplier node visualisation powered by `react-globe.gl` and Three.js
- [x] Twilio voice agent integration for hands-free, conversational risk queries
- [ ] User authentication and role-based access control so teams can collaborate with scoped permissions
- [ ] Alerting and notification system that proactively pages analysts when a supplier's risk score crosses a configurable threshold

See the [open issues](https://github.com/teddycitrus/eureka-iris/issues) for a full list of proposed features and known bugs.

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

Project Link: [https://github.com/teddycitrus/eureka-iris](https://github.com/teddycitrus/eureka-iris)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & BADGES -->
[contributors-shield]: https://img.shields.io/github/contributors/teddycitrus/eureka-iris.svg?style=for-the-badge
[contributors-url]: https://github.com/teddycitrus/eureka-iris/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/teddycitrus/eureka-iris.svg?style=for-the-badge
[forks-url]: https://github.com/teddycitrus/eureka-iris/network/members
[stars-shield]: https://img.shields.io/github/stars/teddycitrus/eureka-iris.svg?style=for-the-badge
[stars-url]: https://github.com/teddycitrus/eureka-iris/stargazers
[issues-shield]: https://img.shields.io/github/issues/teddycitrus/eureka-iris.svg?style=for-the-badge
[issues-url]: https://github.com/teddycitrus/eureka-iris/issues
[license-shield]: https://img.shields.io/github/license/teddycitrus/eureka-iris.svg?style=for-the-badge
[license-url]: https://github.com/teddycitrus/eureka-iris/blob/main/LICENSE

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
