import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";

import App from "./App";
import store from "./redux/store";

// Existing project styles.
import "./index.css";

// Global font rules.
import "./styles/global-font.css";

// Super Admin base white, red and dark-blue workspace palette.
import "./styles/admin-theme.css";

// Requested Super Admin sidebar, Dashboard, Search Demand and Profile refinements.
import "./styles/admin-fine-tune.css";

ReactDOM.createRoot(
  document.getElementById(
    "root"
  )
).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);