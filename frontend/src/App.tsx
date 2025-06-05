import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./pages/Header.tsx";
import AddVacation from "./pages/AddVacation.tsx";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/home" element={<Header />} />
        <Route path="/add-vacation" element={<AddVacation />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
