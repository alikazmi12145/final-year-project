import "regenerator-runtime/runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";
import { MessageProvider } from "./context/MessageContext";
import { ChatNotificationProvider } from "./context/ChatNotificationContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <ChatNotificationProvider>
              <MessageProvider>
                <App />
                <Toaster
                  position="top-center"
                  gutter={10}
                  toastOptions={{
                    duration: 4000,
                    style: {
                      direction: "rtl",
                      background: "#ffffff",
                      color: "#1f2937",
                      padding: "12px 16px",
                      borderRadius: "12px",
                      boxShadow:
                        "0 10px 25px -5px rgba(0,0,0,0.10), 0 8px 10px -6px rgba(0,0,0,0.06)",
                      border: "1px solid rgba(0,0,0,0.05)",
                      fontSize: "14px",
                      fontWeight: 500,
                      maxWidth: "26rem",
                    },
                    success: {
                      iconTheme: { primary: "#059669", secondary: "#ffffff" },
                      style: { borderRight: "4px solid #10b981" },
                    },
                    error: {
                      iconTheme: { primary: "#e11d48", secondary: "#ffffff" },
                      style: { borderRight: "4px solid #f43f5e" },
                    },
                    loading: {
                      iconTheme: { primary: "#b45309", secondary: "#ffffff" },
                      style: { borderRight: "4px solid #d97706" },
                    },
                  }}
                />
              </MessageProvider>
            </ChatNotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

