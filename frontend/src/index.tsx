import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <div className="brand-bar">
            <div className="brand">
                <div className="brand-logo">D</div>
                <span>Dotinder</span>
            </div>
        </div>
        <Router>
            <ErrorBoundary>
                <App />
            </ErrorBoundary>
        </Router>
    </React.StrictMode>
);
