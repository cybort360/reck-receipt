'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  section: string;
}

interface State {
  hasError: boolean;
}

export default class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[SectionErrorBoundary] ${this.props.section}:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="border border-[#1f2937] rounded-lg bg-[#111111] px-4 py-3 text-xs font-mono text-[#6b7280]">
          Failed to load {this.props.section}. Other sections are unaffected.
        </div>
      );
    }
    return this.props.children;
  }
}
