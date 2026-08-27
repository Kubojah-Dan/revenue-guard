import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";
import CustomerDetail from "./pages/CustomerDetail";
import Chat from "./pages/Chat";
import Audit from "./pages/Audit";
import DataIngestion from "./pages/DataIngestion";
import type { AuditLogEntry } from "./types/interfaces";
import { getPageVariants } from "./lib/motion";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

function AnimatedRoutes() {
  const location = useLocation();
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const pageVariants = getPageVariants();

  function handleAuditAppend(entry: AuditLogEntry) {
    setAuditEntries((prev) => [entry, ...prev]);
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <Routes location={location}>
          {/* Landing page — no auth, routes directly to /app */}
          <Route path="/" element={<Landing />} />

          {/* App pages — all under /app or their own paths */}
          <Route path="/app" element={<Dashboard />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route
            path="/customer/:id"
            element={<CustomerDetail onAuditAppend={handleAuditAppend} />}
          />
          <Route path="/chat" element={<Chat />} />
          <Route path="/data" element={<DataIngestion />} />
          <Route
            path="/audit"
            element={<Audit extraEntries={auditEntries} />}
          />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
