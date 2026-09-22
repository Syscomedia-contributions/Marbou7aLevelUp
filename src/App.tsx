import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "./components/landing/Layout.tsx";
import RequireAuth from "./components/RequireAuth.tsx";
import RequireAdmin from "./components/RequireAdmin.tsx";
import AdminLayout from "./components/admin/AdminLayout.tsx";

const Index = lazy(() => import("./pages/Index.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const PortalPage = lazy(() => import("./pages/PortalPage.tsx"));
const GameplayPage = lazy(() => import("./pages/GameplayPage.tsx"));
const PrizesPage = lazy(() => import("./pages/PrizesPage.tsx"));
const FAQPage = lazy(() => import("./pages/FAQPage.tsx"));
const QuizPlay = lazy(() => import("./pages/QuizPlay.tsx"));

const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const AdminPlayers = lazy(() => import("./pages/admin/AdminPlayers.tsx"));
const AdminGames = lazy(() => import("./pages/admin/AdminGames.tsx"));
const AdminQuestions = lazy(() => import("./pages/admin/AdminQuestions.tsx"));
const AdminLeaderboard = lazy(() => import("./pages/admin/AdminLeaderboard.tsx"));
const AdminEarnings = lazy(() => import("./pages/admin/AdminEarnings.tsx"));
const AdminAntiCheat = lazy(() => import("./pages/admin/AdminAntiCheat.tsx"));
const AdminStats = lazy(() => import("./pages/admin/AdminStats.tsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />

              <Route path="/gameplay" element={<GameplayPage />} />
              <Route path="/prizes" element={<PrizesPage />} />
              <Route path="/faq" element={<FAQPage />} />
              <Route path="/portal" element={<PortalPage />} />

              <Route element={<RequireAuth />}>
                <Route path="/quiz/:category" element={<QuizPlay />} />
              </Route>
            </Route>

            <Route path="/admin/login" element={<AdminLogin />} />
            <Route element={<RequireAdmin />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/players" element={<AdminPlayers />} />
                <Route path="/admin/games" element={<AdminGames />} />
                <Route path="/admin/questions" element={<AdminQuestions />} />
                <Route path="/admin/leaderboard" element={<AdminLeaderboard />} />
                <Route path="/admin/earnings" element={<AdminEarnings />} />
                <Route path="/admin/anticheat" element={<AdminAntiCheat />} />
                <Route path="/admin/stats" element={<AdminStats />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
              </Route>
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
