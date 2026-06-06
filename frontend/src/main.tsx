import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { ProductExplorer } from "./pages/ProductExplorer";
import { ProductDetail } from "./pages/ProductDetail";
import { Compare } from "./pages/Compare";
import { CrawlMonitor } from "./pages/CrawlMonitor";
import "./styles.css";

const client = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <div className="appShell">
          <aside className="sidebar">
            <div className="brand">Rubick Catalog</div>
            <nav>
              <NavLink to="/products">Products</NavLink>
              <NavLink to="/compare">Compare</NavLink>
              <NavLink to="/crawl-monitor">Crawl Monitor</NavLink>
            </nav>
          </aside>
          <main className="main">
            <Routes>
              <Route path="/" element={<ProductExplorer />} />
              <Route path="/products" element={<ProductExplorer />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/crawl-monitor" element={<CrawlMonitor />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
