import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.jsx"; // must match the file name in src/ exactly

// Shows the real error on screen instead of a black page
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <pre style={{ padding: 24, color: "#ffb4b4", whiteSpace: "pre-wrap" }}>
          {String(this.state.error?.stack || this.state.error)}
        </pre>
      );
    }
    return this.props.children;
  }
}

window.addEventListener("error", (e) => {
  const root = document.getElementById("root");
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `<pre style="padding:24px;color:#ffb4b4;white-space:pre-wrap">${e.message}</pre>`;
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
