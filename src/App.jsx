import creatures from "../data/creatures.json";
import spells from "../data/spells.json";
import FeatureNavButton from "./components/FeatureNavButton";
import DemonFarming from "./pages/DemonFarming";
import SpellDamage from "./pages/SpellDamage";
import { Link, useRoute } from "./router.jsx";

const pitLord = creatures.find((creature) => creature.name === "Pit Lord");
const demon = creatures.find((creature) => creature.name === "Demon");
const armageddonSpell = spells.find((spell) => spell.name === "Armageddon");
const chainLightningSpell = spells.find((spell) => spell.name === "Chain Lightning");

export default function App() {
  const route = useRoute();

  return (
    <main className="app">
      {(route === "/spell-damage" || route === "/armageddon") && <SpellDamage />}
      {route === "/demon-farming" && <DemonFarming />}
      {route === "/" && <Home />}
      {!["/", "/spell-damage", "/armageddon", "/demon-farming"].includes(route) && <NotFound />}
    </main>
  );
}

function Home() {
  return (
    <section className="page">
      <h1>HOMM3 HOTA</h1>
      <nav className="nav">
        <FeatureNavButton
          label="Spell Damage"
          leftIconUrl={armageddonSpell?.iconUrl}
          rightIconUrl={chainLightningSpell?.iconUrl}
          to="/spell-damage"
        />
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
