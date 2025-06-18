import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./pages/Header.tsx";
import Home from "./pages/Home.tsx";
import AddVacation from "./pages/AddVacation.tsx";
import "./styles/App.css";

function App() {
  return (
    <BrowserRouter>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/add-vacation" element={<AddVacation />} />
          <add the login routes here
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
