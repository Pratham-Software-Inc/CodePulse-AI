import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ConfigForm from './components/ConfigForm';
import MainApp from './MainApp'; // We'll move your existing app content into MainApp
import ConfigTab from './components/ConfigTab'; 

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/config" element={<ConfigForm />} />
      </Routes>
      <ConfigTab />
    </Router>
  );
}

export default App;