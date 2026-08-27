import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";
import CustomerDetail from "./pages/CustomerDetail";
import RevenueProcesses from "./pages/RevenueProcesses";
import LiveMonitor from "./pages/LiveMonitor";
import RecoveryCenter from "./pages/RecoveryCenter";
import Reports from "./pages/Reports";
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
          {/* Public & Authentication */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Onboarding & Ingestion Wizard */}
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Dashboard & Workspace Routes */}
          <Route path="/app" element={<Dashboard />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route
            path="/customer/:id"
            element={<CustomerDetail onAuditAppend={handleAuditAppend} />}
          />
          <Route path="/data" element={<DataIngestion />} />
          <Route path="/processes" element={<RevenueProcesses />} />
          <Route path="/live" element={<LiveMonitor />} />
          <Route path="/recovery" element={<RecoveryCenter />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/chat" element={<Chat />} />
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
