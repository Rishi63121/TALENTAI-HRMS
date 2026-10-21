import { Component } from 'react';
import { CrashPage } from './ErrorState';

/** Catches render-time crashes anywhere below it and shows a friendly page instead of a white screen. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI crashed:', error, info?.componentStack);
  }

  // Navigating to another route should give the app a fresh chance to render.
  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return <CrashPage error={this.state.error} onReset={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}
