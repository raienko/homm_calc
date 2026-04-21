import Armageddon from "./pages/Armageddon";
import DemonFarming from "./pages/DemonFarming";
import { Link, useRoute } from "./router.jsx";

export default function App() {
  const route = useRoute();

  return (
    <main className="app">
      {route === "/armageddon" && <Armageddon />}
      {route === "/demon-farming" && <DemonFarming />}
      {route === "/" && <Home />}
      {!["/", "/armageddon", "/demon-farming"].includes(route) && <NotFound />}
    </main>
  );
}

function Home() {
  return (
    <section className="page">
      <h1>HOMM3 Calculators</h1>
      <nav className="nav">
        {/*<Link className="nav-link" to="/armageddon">*/}
        {/*  Armageddon*/}
        {/*</Link>*/}
        <Link className="nav-link" to="/demon-farming">
          Demon Farming
        </Link>
      </nav>
    </section>
  );
}

function NotFound() {
  return (
    <section className="page">
      <h1>Page not found</h1>
      <Link className="nav-link" to="/">
        Back
      </Link>
    </section>
  );
}
