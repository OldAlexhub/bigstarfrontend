# BigStar Operations Client

The React web client for Big Star Transit's operations platform. It provides the authenticated Dashboard, Master Run Cuts, Deployment, Network Success Excel Submissions and Performance analysis, ELT Reporting, Leaderboard, Settings, and User Administration interfaces.

For the current operational specification, see [BigStar-Operations-Guide.md](../BigStar-Operations-Guide.md).

## Local development

Install dependencies and start the development server:

```powershell
npm ci
npm start
```

The client opens at `http://localhost:3000` and proxies development API requests to `http://localhost:3001`.

For a deployed build, set `REACT_APP_API_URL` to the backend origin. Development intentionally uses the local proxy even when that variable is present.

## Validation and production build

```powershell
$env:CI = "true"
npm test -- --watchAll=false
npm run build
```

The production bundle is generated in the ignored `build` directory.

## Technology

- React 19
- React Router 7
- Create React App / React Scripts 5
- Tailwind CSS 3

---

Developed by **Mohamed Gad** for **Big Star Transit LLC**.
