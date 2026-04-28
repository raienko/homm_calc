import creatures from "../data/creatures.json";
import FeatureNavButton from "./components/FeatureNavButton";
import Armageddon from "./pages/Armageddon";
import DemonFarming from "./pages/DemonFarming";
import { Link, useRoute } from "./router.jsx";

const pitLord = creatures.find((creature) => creature.name === "Pit Lord");
const demon = creatures.find((creature) => creature.name === "Demon");

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
        <FeatureNavButton
          label="Demon Farming"
          leftIconUrl={pitLord?.portraitUrl}
          rightIconUrl={demon?.portraitUrl}
          to="/demon-farming"
        />
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
