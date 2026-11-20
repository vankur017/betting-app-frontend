import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAuth } from './auth/RequireAuth';
import { AppShell } from './components/layout/AppShell';
import { ToastProvider } from './components/ui/Toast';
import { env } from './config/env';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { CrashPage } from './features/crash/CrashPage';
import { DicePage } from './features/dice/DicePage';
import { GamePlaceholderPage } from './features/games/GamePlaceholderPage';
import { HelpPage } from './features/help/HelpPage';
import { HistoryPage } from './features/history/HistoryPage';
import { LobbyPage } from './features/lobby/LobbyPage';
import { MinesPage } from './features/mines/MinesPage';
import { NotFoundPage } from './features/NotFoundPage';
import { PlinkoPage } from './features/plinko/PlinkoPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { WalletPage } from './features/wallet/WalletPage';
import { WalletProvider } from './wallet/WalletProvider';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WalletProvider>
          <ToastProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<LobbyPage />} />
              {/* Sign-in pages stay in the code but are bypassed while auth is disabled. */}
              <Route
                path="login"
                element={env.authEnabled ? <LoginPage /> : <Navigate to="/" replace />}
              />
              <Route
                path="register"
                element={env.authEnabled ? <RegisterPage /> : <Navigate to="/" replace />}
              />
              <Route path="help" element={<HelpPage />} />
              <Route element={<RequireAuth />}>
                <Route path="wallet" element={<WalletPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="games/crash" element={<CrashPage />} />
                <Route path="games/plinko" element={<PlinkoPage />} />
                <Route path="games/mines" element={<MinesPage />} />
                <Route path="games/dice" element={<DicePage />} />
                <Route path="games/:slug" element={<GamePlaceholderPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
          </ToastProvider>
        </WalletProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
