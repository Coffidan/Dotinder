import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;  // Добавляем error в state
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return <div>Произошла ошибка: {this.state.error?.message}</div>;
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
