import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Download, Crown, ArrowRight } from "lucide-react";
import subscriptionAPI from "../services/subscriptionAPI";
import "../components/membership/membership.css";

export default function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = params.get("paymentId");
  const [invoice, setInvoice] = useState(null);
  const [confirming, setConfirming] = useState(true);

  useEffect(() => {
    (async () => {
      if (!paymentId) return setConfirming(false);
      try {
        // For Stripe redirect — try confirm (idempotent server-side)
        await subscriptionAPI.confirm({ paymentId }).catch(() => null);
        const res = await subscriptionAPI.getInvoice(paymentId);
        setInvoice(res?.data || null);
      } finally {
        setConfirming(false);
      }
    })();
  }, [paymentId]);

  const handleDownload = () => {
    if (!invoice) return;
    const html = invoiceHtml(invoice);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoice.invoiceNumber || "invoice"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bes-bg-night bes-geo-pattern min-h-screen text-amber-50 flex items-center">
      <div className="max-w-2xl w-full mx-auto px-4 py-16">
        <div className="bes-glass rounded-3xl p-10 text-center bes-fade-up">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-5 bes-ring-gold">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h1
            dir="rtl"
            className="font-nastaliq text-4xl bes-gold-text leading-snug"
          >
            مبارک ہو — رکنیت کامیاب
          </h1>
          <p className="text-amber-100/80 mt-3">
            Welcome to Bazm-e-Sukhan {invoice?.item?.name || "Premium"}.
          </p>

          {confirming ? (
            <p className="text-amber-200/70 mt-6">Confirming payment…</p>
          ) : invoice ? (
            <div className="text-left bes-glass rounded-2xl p-5 mt-7">
              <div className="flex justify-between text-amber-100/80 text-sm">
                <span>Invoice</span>
                <span className="font-mono">{invoice.invoiceNumber || "—"}</span>
              </div>
              <div className="flex justify-between text-amber-100/80 text-sm mt-2">
                <span>Plan</span>
                <span>{invoice.item?.name}</span>
              </div>
              <div className="flex justify-between text-amber-100/80 text-sm mt-2">
                <span>Amount</span>
                <span>
                  {invoice.currency} {invoice.amount}
                </span>
              </div>
              <div className="flex justify-between text-amber-100/80 text-sm mt-2">
                <span>Provider</span>
                <span className="capitalize">{invoice.provider}</span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 justify-center mt-8">
            <button
              onClick={handleDownload}
              disabled={!invoice}
              className="bes-btn-ghost inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Invoice
            </button>
            <button
              onClick={() => navigate("/membership/manage")}
              className="bes-btn-gold inline-flex items-center gap-2"
            >
              <Crown className="w-4 h-4" /> Manage Membership{" "}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function invoiceHtml(inv) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${
    inv.invoiceNumber
  }</title>
<style>body{font-family:Georgia,serif;color:#222;padding:40px;max-width:720px;margin:auto}
h1{color:#b8860b;border-bottom:2px solid #d4af37;padding-bottom:10px}
table{width:100%;border-collapse:collapse;margin-top:20px}td,th{padding:10px;border-bottom:1px solid #eee;text-align:left}
.total{font-size:1.4em;color:#b8860b;font-weight:bold}</style></head>
<body><h1>Bazm-e-Sukhan — Invoice</h1>
<p><strong>Invoice #:</strong> ${inv.invoiceNumber || "—"}</p>
<p><strong>Date:</strong> ${new Date(inv.issuedAt).toLocaleString()}</p>
<p><strong>Billed to:</strong> ${inv.billingDetails?.name || ""} (${
    inv.billingDetails?.email || ""
  })</p>
<table><tr><th>Description</th><th>Amount</th></tr>
<tr><td>${inv.item?.name} — ${inv.item?.description || ""}</td><td>${
    inv.currency
  } ${inv.amount}</td></tr></table>
<p class="total" style="text-align:right;margin-top:20px">Total: ${
    inv.currency
  } ${inv.amount}</p>
<p style="margin-top:30px;color:#888">Payment provider: ${
    inv.provider
  } — Status: ${inv.status}</p>
<p style="margin-top:40px;color:#b8860b">شکریہ — بزمِ سخن</p></body></html>`;
}
