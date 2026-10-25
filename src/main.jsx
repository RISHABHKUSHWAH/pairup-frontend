import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { TourProvider } from './context/TourContext';
import PlatformTour from './components/PlatformTour';
import GlobalTooltip from './components/GlobalTooltip';
import './styles/main.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <TourProvider>
                <App />
                <PlatformTour />
                <GlobalTooltip />
              </TourProvider>
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

