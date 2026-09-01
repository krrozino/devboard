# Local development setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/krrozino/devboard.git
cd devboard
npm install
```

Create the local environment file:

```bash
cp .env.example .env.local
```

Configure `DATABASE_URL`, then start the application:

```bash
npm run dev
```

For the next milestone, create a development branch:

```bash
git checkout -b feat/github-identity
```

After the first local `npm install`, commit the generated `package-lock.json` and switch CI back from `npm install` to `npm ci`.
