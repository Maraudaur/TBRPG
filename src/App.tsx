import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { CharacterBuilder } from './screens/CharacterBuilder';
import { EnemyBuilder } from './screens/EnemyBuilder';
import { GearBuilder } from './screens/GearBuilder';
import { AbilityBuilder } from './screens/AbilityBuilder';
import { PassiveBuilder } from './screens/PassiveBuilder';
import { StatusBuilder } from './screens/StatusBuilder';
import { PartyBuilder } from './screens/PartyBuilder';
import { EnemyPartyBuilder } from './screens/EnemyPartyBuilder';
import { CombatTestScreen } from './screens/CombatTestScreen';
import { ReferenceScreen } from './screens/ReferenceScreen';

const NAV_ITEMS = [
  { to: '/characters', label: 'Characters' },
  { to: '/enemies', label: 'Enemies' },
  { to: '/gear', label: 'Gear' },
  { to: '/abilities', label: 'Abilities' },
  { to: '/passives', label: 'Passives' },
  { to: '/statuses', label: 'Statuses' },
  { to: '/parties', label: 'Parties' },
  { to: '/enemy-parties', label: 'Enemy Parties' },
  { to: '/combat', label: 'Test Combat' },
  { to: '/reference', label: 'Reference' },
];

function App() {
  return (
    <HashRouter>
      <div className="app-shell">
        <header className="app-header">
          <h1>Battle Sim</h1>
          <nav>
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/combat" replace />} />
            <Route path="/characters" element={<CharacterBuilder />} />
            <Route path="/enemies" element={<EnemyBuilder />} />
            <Route path="/gear" element={<GearBuilder />} />
            <Route path="/abilities" element={<AbilityBuilder />} />
            <Route path="/passives" element={<PassiveBuilder />} />
            <Route path="/statuses" element={<StatusBuilder />} />
            <Route path="/parties" element={<PartyBuilder />} />
            <Route path="/enemy-parties" element={<EnemyPartyBuilder />} />
            <Route path="/combat" element={<CombatTestScreen />} />
            <Route path="/reference" element={<ReferenceScreen />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;
