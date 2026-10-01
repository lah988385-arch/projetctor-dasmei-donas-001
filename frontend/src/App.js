import { BrowserRouter, Routes, Route } from "react-router-dom";
import PGMEIHome from "@/components/PGMEIHome";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PGMEIHome />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
