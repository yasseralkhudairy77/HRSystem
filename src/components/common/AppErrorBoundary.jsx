import { Component } from "react";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Terjadi error saat membuka halaman.",
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("AppErrorBoundary", error, errorInfo);
  }

  handleBackToDashboard = () => {
    this.setState({ hasError: false, errorMessage: "" });
    window.history.replaceState({}, "", "/dashboard");
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center px-6">
          <div className="w-full max-w-xl rounded-3xl border border-[var(--border-soft)] bg-white p-8 text-center shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Halaman Bermasalah</div>
            <div className="mt-3 text-2xl font-semibold text-[var(--text-main)]">Halaman gagal dimuat</div>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              Sistem menangkap error runtime agar layar tidak blank putih. Anda bisa kembali ke dashboard lalu buka halaman ini lagi.
            </p>
            <div className="mt-4 rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-left text-xs text-[var(--text-muted)]">
              {this.state.errorMessage}
            </div>
            <button
              type="button"
              onClick={this.handleBackToDashboard}
              className="mt-6 rounded-xl bg-[var(--brand-900)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Kembali ke Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
