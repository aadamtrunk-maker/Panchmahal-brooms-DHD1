import React from "react";
import { SKU, DailyLedger } from "../types";
import { X, Download, Save, RefreshCw, IndianRupee, TrendingUp, ShoppingBag, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  skus: SKU[];
  quantities: Record<number, number>;
  onSaveLedger: (notes?: string) => void;
  onReset: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  skus,
  quantities,
  onSaveLedger,
  onReset,
}) => {
  const [notes, setNotes] = React.useState("");

  // Filter items that have at least 1 sale
  const soldItems = skus
    .map((sku) => ({
      sku,
      quantity: quantities[sku.id] || 0,
    }))
    .filter((item) => item.quantity > 0);

  // Totals calculations
  const totalQuantity = soldItems.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalRevenue = soldItems.reduce(
    (acc, curr) => acc + curr.quantity * curr.sku.retailPrice,
    0
  );

  // Chart data: Top 5 sold products by revenue
  const chartData = soldItems
    .map((item) => ({
      name: item.sku.name.length > 15 ? `${item.sku.name.substring(0, 15)}...` : item.sku.name,
      fullName: item.sku.name,
      revenue: item.quantity * item.sku.retailPrice,
      quantity: item.quantity,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // CSV Exporter
  const exportToCSV = () => {
    if (soldItems.length === 0) return;

    const headers = [
      "S.R NO",
      "PRODUCT NAME",
      "PACKING",
      "BOX PACKING",
      "QUANTITY SOLD",
      "RETAIL PRICE",
      "TOTAL REVENUE",
    ];

    const rows = soldItems.map((item) => {
      const rev = item.quantity * item.sku.retailPrice;
      return [
        item.sku.srNo,
        `"${item.sku.name}"`,
        item.sku.packing,
        `"${item.sku.boxPacking}"`,
        item.quantity,
        item.sku.retailPrice,
        rev.toFixed(2),
      ];
    });

    const totalsRow = [
      "",
      "\"TOTAL TODAY\"",
      "",
      "",
      totalQuantity,
      "",
      totalRevenue.toFixed(2),
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(",")), totalsRow.join(",")].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `panchmahal_brooms_sales_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = () => {
    exportToCSV(); // Automatically download CSV when saving
    onSaveLedger(notes);
    setNotes("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-textMain/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-4xl bg-bg rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 border border-primary/15"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-primary/10 bg-surface">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 text-primary rounded-2xl border border-primary/5">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-primary font-serif">
                    Today's Detailed Sales Summary
                  </h2>
                  <p className="text-[10px] text-muted font-sans uppercase tracking-widest font-bold mt-0.5">
                    Date: {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-primary hover:text-textMain hover:bg-primary/5 rounded-full cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {soldItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center text-muted mb-4 border border-primary/10">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-primary font-serif">No Sales Logged Yet</h3>
                  <p className="text-xs text-muted mt-1.5 max-w-md font-sans uppercase tracking-wider leading-relaxed">
                    Please increase the sales quantity of some products in the main menu to track revenue.
                  </p>
                </div>
              ) : (
                <>
                  {/* Dashboard Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-surface/60 p-5 rounded-2xl border border-primary/10 shadow-xs">
                      <p className="text-[10px] font-sans font-bold text-muted tracking-widest uppercase">
                        Total Items Sold
                      </p>
                      <p className="text-2xl font-bold font-sans text-textMain mt-1">
                        {totalQuantity} <span className="text-xs font-semibold text-muted uppercase">pcs</span>
                      </p>
                    </div>

                    <div className="bg-surface/60 p-5 rounded-2xl border border-primary/10 shadow-xs">
                      <p className="text-[10px] font-sans font-bold text-muted tracking-widest uppercase">
                        Total Sales Revenue
                      </p>
                      <p className="text-2xl font-bold font-sans text-textMain mt-1 inline-flex items-center">
                        <IndianRupee className="w-5 h-5 self-center" />
                        {totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>

                  {/* Chart and Items Breakdown Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Itemized List Table */}
                    <div className="lg:col-span-7 space-y-3">
                      <h3 className="font-bold text-primary text-xs font-sans tracking-widest uppercase">
                        Itemized Breakdown
                      </h3>
                      <div className="border border-primary/10 rounded-2xl overflow-hidden bg-white/50">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface text-primary text-[10px] font-sans font-bold uppercase tracking-wider border-b border-primary/10">
                              <th className="py-2.5 px-4">Product</th>
                              <th className="py-2.5 px-3 text-center">Qty</th>
                              <th className="py-2.5 px-3 text-right">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm divide-y divide-primary/5 bg-white">
                            {soldItems.map((item) => {
                              const rev = item.quantity * item.sku.retailPrice;
                              return (
                                <tr key={item.sku.id} className="hover:bg-surface/10 transition-colors">
                                  <td className="py-3 px-4">
                                    <p className="font-serif font-bold text-textMain uppercase text-xs">
                                      {item.sku.name}
                                    </p>
                                    <span className="text-[10px] text-muted font-sans font-semibold uppercase tracking-wider">
                                      {item.sku.packing} • {item.sku.boxPacking}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-center font-bold font-sans text-primary">
                                    {item.quantity}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono text-slate-600 text-xs">
                                    ₹{rev.toFixed(0)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Recharts Analytics Visualization */}
                    <div className="lg:col-span-5 flex flex-col space-y-3">
                      <h3 className="font-bold text-primary text-xs font-sans tracking-widest uppercase">
                        Top 5 SKUs by Sales Revenue
                      </h3>
                      <div className="border border-primary/10 rounded-2xl p-4 bg-white flex-1 min-h-[250px] flex flex-col justify-between shadow-xs">
                        <div className="w-full h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#8E8E7E', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 9, fill: '#8E8E7E', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                              <Tooltip
                                contentStyle={{ background: "#5A5A40", color: "#F5F5F0", borderRadius: "16px", border: "none", fontSize: "11px", fontFamily: "Inter" }}
                                formatter={(value: number) => [`₹${value}`, "Sales Revenue"]}
                              />
                              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                                {chartData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={
                                      index === 0 ? "#5A5A40" : // Slate-Olive Core
                                      index === 1 ? "#707052" : 
                                      index === 2 ? "#8A8A6D" : 
                                      index === 3 ? "#A68A64" : // Earth gold
                                      "#BCBCA0"
                                    }
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-[10px] text-center text-muted font-sans uppercase tracking-wider font-semibold">
                          Calculated from Quantity multiplied by Retail Price.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Log Memo Notes */}
                  <div className="mt-4">
                    <label className="block text-[10px] font-sans font-bold text-muted uppercase tracking-widest mb-2">
                      Add Shift Notes / Memo (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Sales during morning shift, credit customer entries..."
                      className="w-full text-xs font-sans uppercase tracking-wider font-semibold p-3.5 bg-white border border-primary/10 rounded-2xl focus:border-primary focus:outline-hidden min-h-[60px]"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-primary/10 bg-surface flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-sans font-bold uppercase tracking-widest rounded-full active:scale-95 transition-all duration-150 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Clear All
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={exportToCSV}
                  disabled={soldItems.length === 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-primary/15 bg-white text-primary hover:bg-surface disabled:opacity-50 disabled:hover:bg-white text-xs font-sans font-bold uppercase tracking-widest rounded-full active:scale-95 transition-all duration-150 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download CSV Excel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={soldItems.length === 0}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-xs font-sans font-bold uppercase tracking-widest rounded-full shadow-md active:scale-95 transition-all duration-150 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Shift Ledger
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
