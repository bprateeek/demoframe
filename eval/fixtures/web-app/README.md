# pulseboard

A tiny self-hosted status dashboard for your services. One file, no database, no agents to install.

## What it does

pulseboard polls your services and shows a live board of status and latency: green when healthy, amber when degraded, red when down. A 30-day uptime number sits at the top so the on-call person sees the trend at a glance.

## Quick start

```sh
git clone https://github.com/example/pulseboard
cd pulseboard
npm start
```

Open http://localhost:4180. The board refreshes every 5 seconds.

## Configuration

Edit the `services` array in `server.js`:

```js
const services = [
  { name: 'api', url: 'https://api.example.com/health' },
  { name: 'postgres', url: 'tcp://db.internal:5432' },
];
```

## Features

- Live status cards with latency per service
- 30-day uptime rollup
- Dark UI designed for a wall-mounted display
- Single process, zero dependencies

## License

MIT
