import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home.jsx";
import PresenterView from "./pages/PresenterView.jsx";
import AudienceView from "./pages/AudienceView.jsx";
import DisplayView from "./pages/DisplayView.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/presenter" element={<PresenterView />} />
        <Route path="/join/:code?" element={<AudienceView />} />
        <Route path="/display/:code" element={<DisplayView />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
