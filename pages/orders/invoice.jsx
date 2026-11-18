import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useAdmin } from "@/components/AdminContext";
import { useAuthGuard } from "@/components/useAuthGuard";
import { FiArrowLeft, FiPrinter } from "react-icons/fi";

const num = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

function fmt(val) {
  return num(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getStatusLabel(o) {
  if (!o) return "Pending";
  if (o.order_status && typeof o.order_status === "object") return o.order_status.status_description || "Pending";
  if (typeof o.order_status === "string") return o.order_status;
  return "Pending";
}

// Addresses are typed by customers, so a state can arrive as "west bengal".
const titleCase = (s) =>
  String(s ?? "").toLowerCase().replace(/(^|\s)[a-z]/g, (c) => c.toUpperCase());

// "West Bengal" and "west bengal" are the same place of supply.
const sameState = (a, b) => {
  const flat = (s) => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return !!flat(a) && flat(a) === flat(b);
};

export default function OrderInvoice() {
  const { ready } = useAuthGuard();
  const { api }   = useAdmin();
  const router    = useRouter();
  const { id }    = router.query;

  const [order, setOrder]     = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!ready || !id) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api("get", `/get_order_details/${id}`);
        if (res.data?.order_data) setOrder(res.data.order_data);
        else setError("Order not found or you don't have permission to view it.");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load order details.");
      }
      try {
        const cres = await api("get", "/get_our_company");
        if (cres.data?.data) setCompany(cres.data.data);
      } catch { /* company header is optional */ }
      setLoading(false);
    })();
  }, [ready, id, api]);

  if (!ready) return null;

  const items = order?.order_items || [];
  const customerName = order?.customer ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim() : "—";
  const ship = order?.shipping_info;
  const invoiceDate = order?.created_at
    ? new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  // Money. The total is the rounded figure actually charged, so the rounding
  // adjustment is derived rather than read from r_off, which is stored without
  // a sign — otherwise the column does not add up on the page.
  const subtotal   = num(order?.bill_amt);
  const discount   = num(order?.discount_amt);
  const shipping   = num(order?.shipping_total);
  const total      = num(order?.pay_amt);
  const paidAmt    = num(order?.paid_amt);
  const taxTotal   = num(order?.tax_total);
  const netAmt     = num(order?.net_amt);
  const roundOff   = Number((total - (subtotal - discount + shipping)).toFixed(2));
  const balance    = Number((total - paidAmt).toFixed(2));
  const paid       = paidAmt >= total && total > 0;
  const taxable    = Number((netAmt - taxTotal).toFixed(2));
  const gstRate    = num(company?.gst_rate) || 0;

  // Within our own state the tax splits into CGST and SGST; outside it, the
  // same amount is a single IGST figure.
  const intraState = sameState(ship?.state, company?.state);

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <Head><title>Invoice — Order #{id} — C&W Admin</title></Head>

      <div className="max-w-3xl mx-auto px-4 print:px-0 print:max-w-none">
        {/* Toolbar — hidden when printing */}
        <div className="flex items-center justify-between mb-5 print:hidden">
          <button onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors">
            <FiArrowLeft size={16} /> Back to Order
          </button>
          {order && (
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#1B1406] bg-[#D5AD4D] hover:bg-[#C1913C] transition-colors shadow-sm">
              <FiPrinter size={15} /> Print / Save as PDF
            </button>
          )}
        </div>

        {loading ? (
          <div className="h-96 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        ) : error || !order ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center text-slate-400 text-sm">
            {error || "Order not found"}
          </div>
        ) : (
          <div className="invoice-sheet bg-white rounded-2xl print:rounded-none border border-slate-200 print:border-0 shadow-sm print:shadow-none overflow-hidden">

            {/* Accent band keeps the document feeling current without costing ink on the body */}
            <div className="h-1.5 bg-[#D5AD4D] print:h-1" />

            <div className="px-9 py-8 print:px-0 print:py-4">

              {/* Header */}
              <div className="flex items-start justify-between gap-6">
                <div>
                  <img src="/logo.png" alt={company?.company_name || "Dorjee Fashion Factory"} className="h-16 w-auto" />
                  <p className="mt-3 font-semibold text-slate-900 text-[15px] leading-tight">
                    {company?.company_name || "Dorjee Fashion Factory"}
                  </p>
                  <div className="mt-1 text-[11.5px] leading-relaxed text-slate-500 max-w-[16rem]">
                    {company?.address && <p>{company.address}</p>}
                    <p>{[company?.city, company?.state, company?.post_code].filter(Boolean).join(", ")}</p>
                    {(company?.phone || company?.mobile) && <p>{company.phone || company.mobile}</p>}
                    {company?.email && <p>{company.email}</p>}
                  </div>
                  {company?.gst_tin && (
                    <p className="mt-2 text-[11.5px] font-semibold text-slate-700">
                      GSTIN <span className="font-mono tracking-tight">{company.gst_tin}</span>
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">Tax Invoice</h1>
                  <dl className="mt-4 space-y-1 text-[11.5px]">
                    <div className="flex justify-end gap-3">
                      <dt className="text-slate-400">Invoice No.</dt>
                      <dd className="font-semibold text-slate-900 tabular-nums">{order.bill_no || order.id}</dd>
                    </div>
                    <div className="flex justify-end gap-3">
                      <dt className="text-slate-400">Date</dt>
                      <dd className="font-semibold text-slate-900 tabular-nums">{invoiceDate}</dd>
                    </div>
                    {String(order.bill_no || order.id) !== String(order.id) && (
                      <div className="flex justify-end gap-3">
                        <dt className="text-slate-400">Order</dt>
                        <dd className="font-semibold text-slate-900 tabular-nums">#{order.id}</dd>
                      </div>
                    )}
                  </dl>
                  <span className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-wide ring-1 ring-inset ${
                    paid
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-amber-50 text-amber-700 ring-amber-200"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${paid ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {paid ? "Paid" : "Payment Pending"}
                  </span>
                </div>
              </div>

              {/* Parties */}
              <div className="mt-8 grid grid-cols-2 gap-5">
                <section className="rounded-xl bg-slate-50 ring-1 ring-slate-100 p-4 print:bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">Billed to</p>
                  <p className="mt-1.5 font-semibold text-slate-900 text-sm">{customerName || "—"}</p>
                  <div className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">
                    {order.customer?.email && <p>{order.customer.email}</p>}
                    {order.customer?.mobile_number && <p className="tabular-nums">{order.customer.mobile_number}</p>}
                  </div>
                </section>

                <section className="rounded-xl bg-slate-50 ring-1 ring-slate-100 p-4 print:bg-slate-50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">Shipped to</p>
                  {ship ? (
                    <>
                      <p className="mt-1.5 font-semibold text-slate-900 text-sm">{ship.full_name}</p>
                      <div className="mt-0.5 text-[11.5px] leading-relaxed text-slate-500">
                        <p>{[ship.address_line_1, ship.address_line_2].filter(Boolean).join(", ")}</p>
                        <p>{[ship.city, ship.state, ship.zip_code].filter(Boolean).join(", ")}</p>
                        {ship.mobile_number && <p className="tabular-nums">{ship.mobile_number}</p>}
                      </div>
                    </>
                  ) : (
                    <p className="mt-1.5 text-[11.5px] text-slate-400">No shipping address on file.</p>
                  )}
                </section>
              </div>

              {/* Order meta */}
              <div className="mt-5 flex flex-wrap gap-x-10 gap-y-2 border-y border-slate-100 py-3 text-[11.5px]">
                <div>
                  <span className="text-slate-400">Payment method</span>{" "}
                  <span className="font-semibold text-slate-800">{order.payment_method?.method_name || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400">Order status</span>{" "}
                  <span className="font-semibold text-slate-800">{getStatusLabel(order)}</span>
                </div>
                {ship?.state && (
                  <div>
                    <span className="text-slate-400">Place of supply</span>{" "}
                    <span className="font-semibold text-slate-800">{titleCase(ship.state)}</span>
                  </div>
                )}
              </div>

              {/* Items */}
              <table className="w-full mt-6 text-sm border-collapse">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    <th className="pb-2.5 pr-3 font-semibold w-6">#</th>
                    <th className="pb-2.5 pr-3 font-semibold">Item</th>
                    <th className="pb-2.5 px-3 font-semibold">HSN</th>
                    <th className="pb-2.5 px-3 font-semibold text-center">Qty</th>
                    <th className="pb-2.5 px-3 font-semibold text-right">Rate</th>
                    <th className="pb-2.5 pl-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="border-t-2 border-slate-800">
                  {items.map((item, i) => (
                    <tr key={i} className="border-b border-slate-100 align-top">
                      <td className="py-3 pr-3 text-slate-300 tabular-nums">{String(i + 1).padStart(2, "0")}</td>
                      <td className="py-3 pr-3">
                        <p className="font-medium text-slate-900 leading-snug">{item.product_name || "—"}</p>
                        {item.sku && <p className="text-[10.5px] text-slate-400 mt-0.5">SKU {item.sku}</p>}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[12px] tabular-nums">{item.product_details?.hsn_code || "—"}</td>
                      <td className="py-3 px-3 text-center text-slate-700 tabular-nums">{item.quantity}</td>
                      <td className="py-3 px-3 text-right text-slate-700 tabular-nums">₹{fmt(item.price)}</td>
                      <td className="py-3 pl-3 text-right font-semibold text-slate-900 tabular-nums">₹{fmt(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="mt-6 flex justify-end">
                <div className="w-full max-w-[17rem]">
                  <dl className="space-y-1.5 text-[12.5px]">
                    <div className="flex justify-between text-slate-500">
                      <dt>Subtotal</dt>
                      <dd className="tabular-nums text-slate-700">₹{fmt(subtotal)}</dd>
                    </div>

                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <dt>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</dt>
                        <dd className="tabular-nums">−₹{fmt(discount)}</dd>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-500">
                      <dt>Delivery</dt>
                      <dd className="tabular-nums text-slate-700">{shipping > 0 ? `₹${fmt(shipping)}` : "Free"}</dd>
                    </div>

                    {Math.abs(roundOff) >= 0.01 && (
                      <div className="flex justify-between text-slate-500">
                        <dt>Rounding</dt>
                        <dd className="tabular-nums text-slate-700">
                          {roundOff < 0 ? "−" : "+"}₹{fmt(Math.abs(roundOff))}
                        </dd>
                      </div>
                    )}
                  </dl>

                  <div className="mt-3 flex items-baseline justify-between border-t-2 border-slate-800 pt-3">
                    <span className="text-[13px] font-bold text-slate-900">Total</span>
                    <span className="text-[19px] font-bold text-slate-900 tabular-nums">₹{fmt(total)}</span>
                  </div>

                  {/* Tax is inside the price, so it is shown as a breakdown rather than added on */}
                  {taxTotal > 0 && (
                    <dl className="mt-3 rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3.5 py-3 space-y-1 text-[11px] text-slate-500 print:bg-slate-50">
                      <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-slate-400">GST included above</p>
                      <div className="flex justify-between pt-0.5">
                        <dt>Taxable value</dt>
                        <dd className="tabular-nums">₹{fmt(taxable)}</dd>
                      </div>
                      {intraState ? (
                        <>
                          <div className="flex justify-between">
                            <dt>CGST{gstRate ? ` @ ${gstRate / 2}%` : ""}</dt>
                            <dd className="tabular-nums">₹{fmt(order.cgst ?? taxTotal / 2)}</dd>
                          </div>
                          <div className="flex justify-between">
                            <dt>SGST{gstRate ? ` @ ${gstRate / 2}%` : ""}</dt>
                            <dd className="tabular-nums">₹{fmt(order.sgst ?? taxTotal / 2)}</dd>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between">
                          <dt>IGST{gstRate ? ` @ ${gstRate}%` : ""}</dt>
                          <dd className="tabular-nums">₹{fmt(taxTotal)}</dd>
                        </div>
                      )}
                    </dl>
                  )}

                  <dl className="mt-3 space-y-1 text-[11.5px]">
                    <div className="flex justify-between text-slate-500">
                      <dt>Amount paid</dt>
                      <dd className="tabular-nums">₹{fmt(paidAmt)}</dd>
                    </div>
                    {balance >= 0.01 && (
                      <div className="flex justify-between font-semibold text-amber-700">
                        <dt>Balance due</dt>
                        <dd className="tabular-nums">₹{fmt(balance)}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-10 border-t border-slate-100 pt-5">
                <p className="text-[12.5px] font-semibold text-slate-800">Thank you for your order.</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-slate-400">
                  All prices are inclusive of GST. This is a computer-generated invoice and does not require a signature.
                  {company?.email ? ` For any query about this invoice, write to ${company.email}.` : ""}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          nav, aside, header { display: none !important; }
          /* Keep the tints and the accent band — without this most browsers
             drop every background and the invoice prints as bare text. */
          .invoice-sheet, .invoice-sheet * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* A line must not be split across two pages. */
          tr, section, dl { break-inside: avoid; page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>
    </div>
  );
}
