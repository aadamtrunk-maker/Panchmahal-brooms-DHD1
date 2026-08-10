import React, { useState, useEffect, useMemo } from "react";
import { DEFAULT_SKUS } from "./data/skus";
import { SkuCard } from "./components/SkuCard";
import { ReportModal } from "./components/ReportModal";
import { CloudSyncModal } from "./components/CloudSyncModal";
import { SKU, DailyLedger } from "./types";
import {
  Search,
  ShoppingCart,
  IndianRupee,
  TrendingUp,
  RotateCcw,
  Calendar,
  History,
  Calculator,
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckCircle2,
  Tag,
  Sparkles,
  BarChart3,
  Edit3,
  LineChart as LucideLineChart,
  Download,
  Plus,
  AlertCircle,
  X,
  Package,
  Cloud,
  RefreshCw, Sun, Moon, Printer,
} from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { auth, db } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  // Quantities for current customer sales: key is SKU ID, value is quantity
  const [quantities, setQuantities] = useState<Record<number, number>>(() => {
    const saved = localStorage.getItem("panchmahal_current_sales");
    return saved ? JSON.parse(saved) : {};
  });

  // Temporary price overrides for the current cart/shift
  const [priceOverrides, setPriceOverrides] = useState<Record<number, number>>(() => {
    const saved = localStorage.getItem("panchmahal_current_overrides");
    return saved ? JSON.parse(saved) : {};
  });

  // History of saved shifts/days
  const [ledgerHistory, setLedgerHistory] = useState<DailyLedger[]>(() => {
    const saved = localStorage.getItem("panchmahal_sales_history");
    return saved ? JSON.parse(saved) : [];
  });

  // List of SKUs with editable retail prices (persisted locally)
  const [skus, setSkus] = useState<SKU[]>(() => {
    const saved = localStorage.getItem("panchmahal_skus_list");
    return saved ? JSON.parse(saved) : DEFAULT_SKUS;
  });

  // Automatically save skus list on change
  useEffect(() => {
    localStorage.setItem("panchmahal_skus_list", JSON.stringify(skus));
  }, [skus]);

  // Price Modal UI States
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("panchmahal_theme") === "dark");

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("panchmahal_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("panchmahal_theme", "light");
    }
  }, [isDarkMode]);
  const [priceSearchQuery, setPriceSearchQuery] = useState("");
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCapacity, setNewProductCapacity] = useState("1 LTR");
  const [newProductPrice, setNewProductPrice] = useState<number | "">("");

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "1ltr" | "3ltr" | "5ltr" | "others">("all");
  const [activeType, setActiveType] = useState<"all" | "acids" | "floor" | "dishwash" | "soaps" | "specialities">("all");
  const [sortBy, setSortBy] = useState<"srNo_asc" | "srNo_desc" | "name_asc" | "name_desc" | "price_asc" | "price_desc" | "most_sold">("srNo_asc");

  // UI state
  const [mainView, setMainView] = useState<"sales" | "stocks">("sales");
  const [stockCounts, setStockCounts] = useState<Record<number, number>>(() => {
    const saved = localStorage.getItem("panchmahal_stocks");
    return saved ? JSON.parse(saved) : {};
  });
  const [dismissedLowStock, setDismissedLowStock] = useState<number[]>([]);
  
  useEffect(() => {
    localStorage.setItem("panchmahal_stocks", JSON.stringify(stockCounts));
  }, [stockCounts]);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<"list" | "graph">("list");
  const [expandedLedgerId, setExpandedLedgerId] = useState<string | null>(null);
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);

  // Firebase Auth and Auto-Restore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, "stores", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const restoredSkus = data.skus ? JSON.parse(data.skus) : [];
            const restoredHistory = data.ledgerHistory ? JSON.parse(data.ledgerHistory) : [];
            const restoredStocks = data.stockCounts ? JSON.parse(data.stockCounts) : null;
            const restoredQuantities = data.quantities ? JSON.parse(data.quantities) : null;
            const restoredOverrides = data.priceOverrides ? JSON.parse(data.priceOverrides) : null;

            if (restoredSkus.length > 0) setSkus(restoredSkus);
            if (restoredHistory.length > 0) setLedgerHistory(restoredHistory);
            if (restoredStocks) setStockCounts(restoredStocks);
            if (restoredQuantities) setQuantities(restoredQuantities);
            if (restoredOverrides) setPriceOverrides(restoredOverrides);

            showToast("Cloud data synced automatically!");
          }
        } catch (err) {
          console.error("Auto restore failed", err);
        } finally {
          setIsCloudLoaded(true);
        }
      } else {
        setIsCloudLoaded(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Firebase Auto-Backup
  useEffect(() => {
    if (user && isCloudLoaded) {
      const backupData = async () => {
        try {
          const docRef = doc(db, "stores", user.uid);
          await setDoc(docRef, {
            ownerId: user.uid,
            skus: JSON.stringify(skus),
            ledgerHistory: JSON.stringify(ledgerHistory),
            stockCounts: JSON.stringify(stockCounts),
            quantities: JSON.stringify(quantities),
            priceOverrides: JSON.stringify(priceOverrides),
            updatedAt: Date.now()
          });
        } catch (err) {
          console.error("Auto backup failed", err);
        }
      };
      const timeout = setTimeout(backupData, 2000);
      return () => clearTimeout(timeout);
    }
  }, [user, isCloudLoaded, skus, ledgerHistory, stockCounts, quantities, priceOverrides]);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; message: string; onConfirm: () => void }>({
    isOpen: false,
    message: "",
    onConfirm: () => {},
  });

  const requestConfirm = (message: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, message, onConfirm });
  };

  // Format data for the historical graph (chronological order)
  const historicalTrendData = useMemo(() => {
    return [...ledgerHistory].reverse().map((ledger) => {
      const datePart = ledger.date.split("@")[0].trim();
      return {
        date: datePart,
        revenue: Math.round(ledger.totalRevenue),
        quantity: ledger.totalQuantity,
      };
    });
  }, [ledgerHistory]);

  // Aggregate stats for cumulative summary
  const cumulativeStats = useMemo(() => {
    let totalRevenue = 0;
    let totalQuantity = 0;
    ledgerHistory.forEach((ledger) => {
      totalRevenue += ledger.totalRevenue;
      totalQuantity += ledger.totalQuantity;
    });
    return {
      totalRevenue,
      totalQuantity,
    };
  }, [ledgerHistory]);

  // Helper function to seed sample history
  const handleSeedSampleHistory = () => {
    const doSeed = () => {
      const mockLedgers: DailyLedger[] = [];
      const baseTime = Date.now();
      const daysToSeed = 7;

      for (let i = daysToSeed - 1; i >= 0; i--) {
        const date = new Date(baseTime - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        const timeStr = "05:30 PM";

        const totalQuantity = 180 + Math.floor(Math.random() * 120);
        const totalRevenue = totalQuantity * 95;
        const totalCost = 0;
        const totalProfit = 0;

        mockLedgers.push({
          id: `sample-ledger-${baseTime - i * 86400000}`,
          date: `${dateStr} @ ${timeStr}`,
          sales: [
            {
              skuId: 1,
              skuName: "ACID ULTRA POWER SHIELD",
              packing: "1 LTR",
              quantity: Math.floor(totalQuantity * 0.4),
              revenue: Math.floor(totalQuantity * 0.4) * 95,
              cost: 0,
              profit: 0,
            },
            {
              skuId: 12,
              skuName: "WHITE FLOOR CONCENTRATE",
              packing: "5 LTR",
              quantity: Math.floor(totalQuantity * 0.6),
              revenue: Math.floor(totalQuantity * 0.6) * 140,
              cost: 0,
              profit: 0,
            },
          ],
          totalQuantity,
          totalRevenue,
          totalCost,
          totalProfit,
          notes: "Demo historical entry for trend visualization.",
        });
      }

      setLedgerHistory(mockLedgers);
      setHistoryTab("graph");
      showToast("7 Days of Demo Shift Data Loaded Successfully!");
    };

    if (ledgerHistory.length > 0) {
      requestConfirm("Seeding will replace your current history list with mock values to test graphs. Proceed?", doSeed);
    } else {
      doSeed();
    }
  };

  const handleExportStock = () => {
    const inStockItems = stockSkus.filter(sku => (stockCounts[sku.id] || 0) > 0);
    if (inStockItems.length === 0) {
      showToast("No products are currently in stock.");
      return;
    }
    const headers = [
      "S.R NO",
      "PRODUCT NAME",
      "PACKING",
      "CURRENT STOCK",
    ];
    const rows = inStockItems.map((sku) => [
      sku.srNo,
      `"${sku.name}"`,
      sku.packing,
      stockCounts[sku.id] || 0,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `panchmahal_stock_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Stock Exported to CSV");
  };

  const handleExportHistory = () => {
    if (ledgerHistory.length === 0) return;

    const headers = [
      "DATE",
      "TOTAL QUANTITY",
      "TOTAL REVENUE",
      "NOTES"
    ];

    const rows = ledgerHistory.map((ledger) => [
      `"${ledger.date}"`,
      ledger.totalQuantity,
      ledger.totalRevenue.toFixed(2),
      `"${ledger.notes || ""}"`
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `panchmahal_ledger_history_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("History Exported to CSV");
  };

  // Auto-persist quantities
  useEffect(() => {
    localStorage.setItem("panchmahal_current_sales", JSON.stringify(quantities));
  }, [quantities]);

  // Auto-persist price overrides
  useEffect(() => {
    localStorage.setItem("panchmahal_current_overrides", JSON.stringify(priceOverrides));
  }, [priceOverrides]);

  // Auto-persist history
  useEffect(() => {
    localStorage.setItem("panchmahal_sales_history", JSON.stringify(ledgerHistory));
  }, [ledgerHistory]);

  // Trigger quick success toast
  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Handle quantity changes
  const handleQuantityChange = (skuId: number, value: number) => {
    setQuantities((prev) => {
      const updated = { ...prev };
      if (value <= 0) {
        delete updated[skuId];
      } else {
        updated[skuId] = value;
      }
      return updated;
    });
  };

  // Handle temporary price overrides
  const handleOverrideChange = (skuId: number, value: number | null) => {
    setPriceOverrides((prev) => {
      const updated = { ...prev };
      if (value === null) {
        delete updated[skuId];
      } else {
        updated[skuId] = value;
      }
      return updated;
    });
  };

  // Helper function to check category of a SKU
  const getSkuCategory = (packing: string): "1ltr" | "3ltr" | "5ltr" | "others" => {
    const norm = packing.toUpperCase().replace(/\s+/g, "");
    if (norm.includes("1LTR")) return "1ltr";
    if (norm.includes("3LTR")) return "3ltr";
    if (norm.includes("5LTR") || norm.includes("4.5LTR")) return "5ltr";
    return "others";
  };

  // Helper function to check type of a SKU
  const getSkuType = (name: string): "acids" | "floor" | "dishwash" | "soaps" | "specialities" => {
    const n = name.toUpperCase();
    if (n.includes("ACID") || n.includes("TOILET") || n.includes("BATHROOM") || n.includes("TILES")) {
      return "acids";
    }
    if (n.includes("FLOOR") || n.includes("STRONG") || n.includes("CONCENTRATE") || n.includes("SILVER GREEN") || n.includes("GLOW FLOOR")) {
      return "floor";
    }
    if (n.includes("DISH") || n.includes("D W") || n.includes("DETER") || n.includes("POWDER") || n.includes("CHAMKILA")) {
      return "dishwash";
    }
    if (n.includes("SOAP") || n.includes("HAND") || n.includes("AND WASH")) {
      return "soaps";
    }
    return "specialities";
  };

  const skuSalesCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    ledgerHistory.forEach(ledger => {
      ledger.sales.forEach(sale => {
        counts[sale.skuId] = (counts[sale.skuId] || 0) + sale.quantity;
      });
    });
    return counts;
  }, [ledgerHistory]);

  // Filtered SKUs based on search query, category (capacity) tab, and type tab
  const filteredSkus = useMemo(() => {
    const filtered = skus.filter((sku) => {
      const q = searchQuery.toLowerCase().trim();
      const tokens = q.split(/\s+/);
      
      const matchesSearch = q === "" ? true : tokens.every((token) => 
        sku.name.toLowerCase().includes(token) ||
        sku.packing.toLowerCase().includes(token) ||
        sku.srNo.toString().includes(token)
      );

      const skuCat = getSkuCategory(sku.packing);
      const matchesCategory = activeCategory === "all" || skuCat === activeCategory;

      const skuType = getSkuType(sku.name);
      const matchesType = activeType === "all" || skuType === activeType;

      if (q !== "") {
        return matchesSearch;
      }

      return matchesSearch && matchesCategory && matchesType;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "most_sold":
          return (skuSalesCounts[b.id] || 0) - (skuSalesCounts[a.id] || 0);
        case "srNo_desc":
          return b.srNo - a.srNo;
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "price_asc":
          return a.retailPrice - b.retailPrice;
        case "price_desc":
          return b.retailPrice - a.retailPrice;
        case "srNo_asc":
        default:
          return a.srNo - b.srNo;
      }
    });
  }, [skus, searchQuery, activeCategory, activeType, sortBy, skuSalesCounts]);

  const stockSkus = useMemo(() => {
    return skus.filter(sku => {
      const nameLower = sku.name.toLowerCase();
      if (nameLower.includes("broom") || nameLower.includes("kharata")) return false;
      return true;
    });
  }, [skus]);

  const lowStockAlerts = useMemo(() => {
    return stockSkus.filter(sku => {
      const stock = stockCounts[sku.id];
      return stock !== undefined && stock <= 2 && !dismissedLowStock.includes(sku.id);
    });
  }, [stockCounts, stockSkus, dismissedLowStock]);

  // Real-time calculations of active entries
  const activeCartStats = useMemo(() => {
    let totalItems = 0;
    let totalRevenue = 0;

    Object.entries(quantities).forEach(([idStr, qtyVal]) => {
      const id = parseInt(idStr, 10);
      const sku = skus.find((s) => s.id === id);
      const qty = qtyVal as number;
      if (sku && qty > 0) {
        totalItems += qty;
        const price = priceOverrides[id] !== undefined ? priceOverrides[id] : sku.retailPrice;
        totalRevenue += qty * price;
      }
    });

    return {
      totalItems,
      totalRevenue,
      totalCost: 0,
      totalProfit: 0,
    };
  }, [skus, quantities, priceOverrides]);

  // Save active entries as a new Daily Ledger log
  const handleSaveLedger = (notes?: string) => {
    const soldItems = skus.map((sku) => {
      const price = priceOverrides[sku.id] !== undefined ? priceOverrides[sku.id] : sku.retailPrice;
      return {
        sku: { ...sku, retailPrice: price },
        quantity: quantities[sku.id] || 0,
      };
    }).filter((item) => item.quantity > 0);

    if (soldItems.length === 0) return;

    const dateStr = new Date().toLocaleDateString("en-IN", {
      dateStyle: "medium",
    });
    const timeStr = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newLedger: DailyLedger = {
      id: `ledger-${Date.now()}`,
      date: `${dateStr} @ ${timeStr}`,
      sales: soldItems.map((item) => ({
        skuId: item.sku.id,
        skuName: item.sku.name,
        packing: item.sku.packing,
        quantity: item.quantity,
        revenue: item.quantity * item.sku.retailPrice,
        cost: 0,
        profit: 0,
      })),
      totalQuantity: activeCartStats.totalItems,
      totalRevenue: activeCartStats.totalRevenue,
      totalCost: 0,
      totalProfit: 0,
      notes,
    };

    setLedgerHistory((prev) => [newLedger, ...prev]);
    setQuantities({}); // Reset quantities
    setPriceOverrides({}); // Reset overrides
    
    // Subtract from stocks
    setStockCounts(prev => {
      const next = { ...prev };
      soldItems.forEach(item => {
        if (next[item.sku.id] !== undefined) {
           next[item.sku.id] = Math.max(0, next[item.sku.id] - item.quantity);
        }
      });
      return next;
    });

    showToast("Shift Ledger successfully saved to history!");
  };

  // Reset current sales counts
  const handleResetCurrent = () => {
    requestConfirm("Are you sure you want to clear all active quantities for today?", () => {
      setQuantities({});
      setPriceOverrides({});
      showToast("Cleared today's inputs.");
    });
  };

  // Delete ledger entry
  const handleDeleteLedger = (id: string) => {
    requestConfirm("Are you sure you want to delete this historical ledger entry?", () => {
      setLedgerHistory((prev) => prev.filter((item) => item.id !== id));
      showToast("Ledger entry removed.");
    });
  };

  // Adjust a SKU's retail price
  const handlePriceChange = (skuId: number, newPrice: number) => {
    if (isNaN(newPrice) || newPrice < 0) return;
    setSkus((prev) =>
      prev.map((sku) => (sku.id === skuId ? { ...sku, retailPrice: Number(newPrice.toFixed(2)) } : sku))
    );
  };

  // Adjust a SKU's name
  const handleNameChange = (skuId: number, newName: string) => {
    setSkus((prev) =>
      prev.map((sku) => (sku.id === skuId ? { ...sku, name: newName } : sku))
    );
  };

  // Remove a product from the retail list
  const handleRemoveProduct = (skuId: number) => {
    requestConfirm("Are you sure you want to remove this product?", () => {
      setSkus((prev) => prev.filter((s) => s.id !== skuId));
      showToast("Product removed from list.");
    });
  };

  // Restore factory rates for all SKUs
  const handleResetToDefaults = () => {
    requestConfirm("Are you sure you want to reset ALL retail prices to their default rates?", () => {
      setSkus(DEFAULT_SKUS);
      showToast("All retail prices reset to defaults.");
    });
  };

  // Add new manual SKU
  const handleAddProduct = () => {
    if (!newProductName.trim()) {
      showToast("Please enter a product name.");
      return;
    }
    if (newProductPrice === "" || isNaN(newProductPrice) || newProductPrice < 0) {
      showToast("Please enter a valid retail price.");
      return;
    }
    
    setSkus((prev) => {
      const maxId = prev.length > 0 ? Math.max(...prev.map((s) => s.id)) : 0;
      const maxSrNo = prev.length > 0 ? Math.max(...prev.map((s) => s.srNo)) : 0;
      
      const newSku: SKU = {
        id: maxId + 1,
        srNo: maxSrNo + 1,
        name: newProductName.trim(),
        packing: newProductCapacity,
        boxPacking: "-",
        boxPrice: 0,
        perPcCost: 0,
        retailPrice: Number(Number(newProductPrice).toFixed(2)),
      };
      
      return [newSku, ...prev];
    });
    
    setNewProductName("");
    setNewProductCapacity("1 LTR");
    setNewProductPrice("");
    setIsAddingProduct(false);
    showToast(`Added new product: ${newProductName.trim()}`);
  };

  return (
    <div className="min-h-screen bg-bg text-textMain flex flex-col font-serif selection:bg-primary selection:text-white antialiased bg-[radial-gradient(#5a5a400a_1px,transparent_1px)] bg-[size:20px_20px]">
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-surface text-xs font-sans uppercase tracking-widest px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-2.5 border border-primary/20 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-accent-light" />
          {successMessage}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-textMain/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-primary/10 transform transition-all">
            <h3 className="text-textMain font-serif text-xl mb-4">Confirm Action</h3>
            <p className="text-primary font-sans text-sm mb-6 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="px-5 py-2.5 bg-white border border-primary/20 hover:bg-surfaceHover text-primary text-xs font-sans font-bold uppercase tracking-widest rounded-full transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog({ ...confirmDialog, isOpen: false });
                }}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-surface text-xs font-sans font-bold uppercase tracking-widest rounded-full transition-colors cursor-pointer"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Header Banner */}
      <header className="p-6 border-b border-primary/10 flex flex-col md:flex-row justify-between items-center md:items-end bg-surface gap-6">
        <div className="space-y-1.5 text-center md:text-left w-full md:w-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start gap-3 text-xs font-sans uppercase tracking-widest text-muted">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
              <span>Panchmahal Distributor Hub</span>
              <span className="w-1 h-1 bg-muted rounded-full"></span>
              <span>Store #4102</span>
            </div>
            <button
              onClick={() => setIsPriceModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-white hover:bg-primary hover:text-surface text-primary font-bold rounded-full border border-primary/10 transition-all cursor-pointer shadow-2xs text-[10px] uppercase tracking-wider self-center sm:self-auto animate-pulse hover:animate-none"
              title="Edit SKU Retail Prices"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Retail Prices
            </button>
            <button
              onClick={() => setIsCloudSyncModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-white hover:bg-primary hover:text-surface text-primary font-bold rounded-full border border-primary/10 transition-all cursor-pointer shadow-2xs text-[10px] uppercase tracking-wider self-center sm:self-auto"
              title="Cloud Database Sync"
            >
              <Cloud className="w-3.5 h-3.5" />
              Cloud Sync
            </button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="inline-flex items-center justify-center p-1.5 bg-white hover:bg-primary hover:text-surface text-primary font-bold rounded-full border border-primary/10 transition-all cursor-pointer shadow-2xs self-center sm:self-auto" title="Toggle Dark Mode">
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary font-display">
            Panchmahal Brooms DHD
          </h1>
          <p className="text-muted text-xs max-w-xl font-sans uppercase tracking-wider leading-relaxed">
            Real-time daily chemical cleaner sales calculator & revenue tracker.
          </p>
        </div>

        {/* Header Right Content */}
        <div className="w-full md:w-auto md:min-w-[280px] flex flex-col gap-3">
          {/* Actions & Toggles */}
          <div className="flex flex-wrap items-center justify-end gap-3 w-full">
            <button
              onClick={handleResetCurrent}
              title="Reset today's active sales data"
              className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-sans uppercase tracking-widest font-bold rounded-full border border-primary/20 text-primary hover:bg-surface transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Shift
            </button>
            <button
              onClick={() => window.print()}
              title="Print Current Shift Receipt"
              className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-sans uppercase tracking-widest font-bold rounded-full border border-primary/20 text-primary hover:bg-surface transition-colors cursor-pointer"
            >
              <Printer className="w-3 h-3" />
              Print Receipt
            </button>
            <div className="flex bg-surfaceHover/80 p-1 rounded-full border border-primary/5 w-full sm:w-auto">
              <button
                onClick={() => setMainView("sales")}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-sans uppercase tracking-widest font-bold rounded-full transition-all ${
                  mainView === "sales" ? "bg-white text-primary shadow-sm" : "text-muted hover:text-primary"
                }`}
              >
                Sales Entry
              </button>
              <button
                onClick={() => setMainView("stocks")}
                className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-sans uppercase tracking-widest font-bold rounded-full transition-all ${
                  mainView === "stocks" ? "bg-white text-primary shadow-sm" : "text-muted hover:text-primary"
                }`}
              >
                Stocks
              </button>
            </div>
          </div>

          {/* Realtime Live Counter Card */}
          <div className="bg-white/60 backdrop-blur-md rounded-3xl p-5 border border-primary/10 shadow-sm">
            <div className="flex items-center justify-between border-b border-primary/10 pb-2.5 mb-2.5">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                <span className="text-xs font-sans uppercase tracking-widest font-bold text-muted">Active Shift Log</span>
              </div>
              <span className="text-[10px] font-sans bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                LIVE CALC
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-sans uppercase tracking-widest text-muted font-bold">Sold Qty</p>
                <p className="text-xl font-sans font-bold mt-0.5 text-textMain">
                  {activeCartStats.totalItems} <span className="text-[10px] text-muted font-medium uppercase">pcs</span>
                </p>
              </div>
              <div>
                <p className="text-[9px] font-sans uppercase tracking-widest text-muted font-bold">Revenue</p>
                <p className="text-xl font-sans font-bold mt-0.5 text-textMain inline-flex items-center">
                  ₹{activeCartStats.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Printable Receipt Area (Only visible in print mode) */}
      <div className="hidden print:block absolute top-0 left-0 w-full p-8 text-black bg-white" id="printable-receipt">
        <h2 className="text-2xl font-bold text-center mb-2 font-display">Panchmahal Brooms DHD</h2>
        <p className="text-center text-sm mb-6 pb-4 border-b border-gray-300">Daily Sales Receipt - {new Date().toLocaleDateString()}</p>
        <table className="w-full text-left mb-6 text-sm">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="py-2">Item</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {skus.filter(s => (quantities[s.id]?.quantity || quantities[s.id] || 0) > 0).map(sku => {
              const qty = quantities[sku.id]?.quantity || quantities[sku.id] || 0;
              const price = priceOverrides[sku.id] !== undefined ? priceOverrides[sku.id] : sku.retailPrice;
              return (
                <tr key={sku.id} className="border-b border-gray-100">
                  <td className="py-2">{sku.name}</td>
                  <td className="py-2 text-center">{qty}</td>
                  <td className="py-2 text-right">₹{(qty * price).toLocaleString("en-IN")}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold text-lg">
              <td className="py-4">TOTAL</td>
              <td className="py-4 text-center">{activeCartStats.totalItems}</td>
              <td className="py-4 text-right">₹{activeCartStats.totalRevenue.toLocaleString("en-IN")}</td>
            </tr>
          </tfoot>
        </table>
        <p className="text-center text-xs mt-10 text-gray-500">Thank you for your business!</p>
      </div>

      {/* Main Workspace Layout (Hidden in print mode) */}
      <div className="print:hidden flex-1 flex flex-col w-full max-w-7xl mx-auto">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full flex flex-col gap-6">
        
        {/* Low Stock Alerts */}
        {lowStockAlerts.length > 0 && (
          <div className="flex flex-col gap-2">
            {lowStockAlerts.map(sku => (
              <div key={`alert-${sku.id}`} className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                  <div>
                    <p className="text-sm font-bold text-rose-800 font-sans">Low Stock Warning: {sku.name}</p>
                    <p className="text-xs text-rose-600 font-sans uppercase tracking-wider mt-0.5">
                      Only <span className="font-bold">{stockCounts[sku.id]}</span> piece(s) left in stock
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDismissedLowStock(prev => [...prev, sku.id])}
                  className="p-1.5 hover:bg-rose-100 rounded-full text-rose-600 transition-colors"
                  aria-label="Dismiss alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {mainView === "sales" ? (
          <>
            {/* Top filter controls */}
            <div className="bg-white/60 rounded-3xl p-6 shadow-sm border border-primary/10 flex flex-col xl:flex-row gap-6 items-stretch justify-between">
          {/* Left Column: Search & Quick info */}
          <div className="flex flex-col justify-between gap-4 w-full xl:max-w-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-sans font-bold text-muted uppercase tracking-widest pl-1">Search Products</span>
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type name, size, or #No..."
                  className="w-full pl-10 pr-4 py-3 text-xs font-sans uppercase tracking-wider bg-white/80 border border-primary/10 rounded-2xl focus:bg-white focus:border-primary focus:outline-hidden transition-all placeholder-muted font-semibold shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-sans uppercase tracking-widest text-muted hover:text-primary font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] font-sans font-bold text-muted uppercase tracking-widest pl-1">Sort Products</span>
              <div className="relative w-full">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-4 py-3 text-xs font-sans uppercase tracking-wider bg-white/80 border border-primary/10 rounded-2xl focus:bg-white focus:border-primary focus:outline-hidden transition-all text-textMain font-semibold shadow-xs appearance-none cursor-pointer"
                >
                  <option value="most_sold">Most Often Sold</option>
                  <option value="srNo_asc">SR Number (Low to High)</option>
                  <option value="srNo_desc">SR Number (High to Low)</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                  <option value="price_asc">Price (Low to High)</option>
                  <option value="price_desc">Price (High to Low)</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Capacity & Type Filters */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Capacity Volume Tabs */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-sans font-bold text-muted uppercase tracking-widest">Filter by Capacity / Packing</span>
                {activeCategory !== "all" && (
                  <button 
                    onClick={() => setActiveCategory("all")} 
                    className="text-[9px] font-sans font-bold text-accent hover:underline uppercase tracking-wider"
                  >
                    Reset Capacity
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-surface/70 rounded-2xl border border-primary/5 w-full">
                <button
                  onClick={() => setActiveCategory("all")}
                  className={`px-4 py-2.5 text-[10px] font-sans uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer ${
                    activeCategory === "all"
                      ? "bg-primary text-surface shadow-sm border border-primary/10"
                      : "text-muted hover:text-textMain"
                  }`}
                >
                  All Sizes
                </button>
                <button
                  onClick={() => setActiveCategory("1ltr")}
                  className={`px-4 py-2.5 text-[10px] font-sans uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer ${
                    activeCategory === "1ltr"
                      ? "bg-primary text-surface shadow-sm border border-primary/10"
                      : "text-muted hover:text-textMain"
                  }`}
                >
                  1 Litre
                </button>
                <button
                  onClick={() => setActiveCategory("3ltr")}
                  className={`px-4 py-2.5 text-[10px] font-sans uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer ${
                    activeCategory === "3ltr"
                      ? "bg-primary text-surface shadow-sm border border-primary/10"
                      : "text-muted hover:text-textMain"
                  }`}
                >
                  3 Litre
                </button>
                <button
                  onClick={() => setActiveCategory("5ltr")}
                  className={`px-4 py-2.5 text-[10px] font-sans uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer ${
                    activeCategory === "5ltr"
                      ? "bg-primary text-surface shadow-sm border border-primary/10"
                      : "text-muted hover:text-textMain"
                  }`}
                >
                  5 Litre / 4.5L
                </button>
                <button
                  onClick={() => setActiveCategory("others")}
                  className={`px-4 py-2.5 text-[10px] font-sans uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer ${
                    activeCategory === "others"
                      ? "bg-primary text-surface shadow-sm border border-primary/10"
                      : "text-muted hover:text-textMain"
                  }`}
                >
                  Other Packings
                </button>
              </div>
            </div>

            {/* Product Type Tabs */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-sans font-bold text-muted uppercase tracking-widest">Filter by Product Type</span>
                {activeType !== "all" && (
                  <button 
                    onClick={() => setActiveType("all")} 
                    className="text-[9px] font-sans font-bold text-accent hover:underline uppercase tracking-wider"
                  >
                    Reset Type
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-surface/70 rounded-2xl border border-primary/5 w-full">
                <button
                  onClick={() => setActiveType("all")}
                  className={`px-4 py-2.5 text-[10px] font-sans uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer ${
                    activeType === "all"
                      ? "bg-accent text-white shadow-sm border border-accent/10"
                      : "text-muted hover:text-textMain"
                  }`}
                >
                  All Types
                </button>
                <button
                  onClick={() => setActiveType("acids")}
                  className={`px-4 py-2.5 text-[10px] font-sans uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer ${
                    activeType === "acids"
                      ? "bg-accent text-white shadow-sm border border-accent/10"
                      : "text-muted hover:text-textMain"
                  }`}
                >
                  Acids & Toilet
                </button>
                <button
                  onClick={() => setActiveType("floor")}
                  className={`px-4 py-2.5 text-[10px] font-sans uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer ${
                    activeType === "floor"
                      ? "bg-accent text-white shadow-sm border border-accent/10"
                      : "text-muted hover:text-textMain"
                  }`}
                >
                  Floor Cleaners
                </button>
                <button
                  onClick={() => setActiveType("dishwash")}
                  className={`px-4 py-2.5 text-[10px] font-sans uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer ${
                    activeType === "dishwash"
                      ? "bg-accent text-white shadow-sm border border-accent/10"
                      : "text-muted hover:text-textMain"
                  }`}
                >
                  Dishwash & Detergents
                </button>
                <button
                  onClick={() => setActiveType("soaps")}
                  className={`px-4 py-2.5 text-[10px] font-sans uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer ${
                    activeType === "soaps"
                      ? "bg-accent text-white shadow-sm border border-accent/10"
                      : "text-muted hover:text-textMain"
                  }`}
                >
                  Soaps & Handwash
                </button>
                <button
                  onClick={() => setActiveType("specialities")}
                  className={`px-4 py-2.5 text-[10px] font-sans uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer ${
                    activeType === "specialities"
                      ? "bg-accent text-white shadow-sm border border-accent/10"
                      : "text-muted hover:text-textMain"
                  }`}
                >
                  Specialities
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Products Strip (Visible when items are selected) */}
        {Object.keys(quantities).length > 0 && (
          <div className="bg-surface/60 border border-primary/10 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center font-sans font-bold text-sm shadow-xs">
                {Object.keys(quantities).length}
              </div>
              <div>
                <h4 className="font-bold text-primary text-sm font-serif">Selected Products in Today's Sheet</h4>
                <p className="text-xs text-muted font-sans uppercase tracking-wider">
                  You are editing sales quantities. Review before compiling the report.
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={handleResetCurrent}
                className="flex-1 md:flex-none px-5 py-2.5 text-[10px] font-sans uppercase tracking-widest font-bold text-rose-700 border border-rose-200 hover:bg-rose-50/50 rounded-full active:scale-95 transition-all cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsReportOpen(true)}
                className="flex-1 md:flex-none px-6 py-2.5 text-[10px] font-sans uppercase tracking-widest font-bold bg-accent hover:bg-accent-dark text-white rounded-full shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Calculator className="w-3.5 h-3.5" />
                Review & Log Total
              </button>
            </div>
          </div>
        )}

        {/* SKU Display Area */}
        {filteredSkus.length === 0 ? (
          <div className="bg-white/60 rounded-3xl border border-primary/10 p-16 text-center shadow-xs">
            <p className="text-muted font-sans uppercase tracking-widest text-xs font-bold">No products found matching the current filters.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
                setActiveType("all");
              }}
              className="mt-4 text-primary font-bold text-xs uppercase tracking-widest font-sans hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* DESKTOP HIGH-DENSITY LIST TABLE */}
            <div className="hidden md:block bg-white/70 backdrop-blur-md rounded-3xl border border-primary/10 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface text-primary text-[10px] font-sans font-bold uppercase tracking-wider border-b border-primary/10">
                      <th className="py-3 px-6 w-16 text-center">S.R. No</th>
                      <th className="py-3 px-6">Product Description</th>
                      <th className="py-3 px-4 text-center">Packing</th>
                      <th className="py-3 px-4 text-center">Box Packing</th>
                      <th className="py-3 px-6 text-right">Retail Price</th>
                      <th className="py-3 px-6 text-center w-48">Daily Sales Input</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5">
                    {filteredSkus.map((sku) => {
                      const qty = quantities[sku.id] || 0;
                      const isSelected = qty > 0;
                      return (
                        <tr
                          key={sku.id}
                          className={`hover:bg-surface/20 transition-colors duration-150 ${
                            isSelected 
                              ? "bg-primary/5 font-semibold border-l-4 border-l-primary" 
                              : "border-l-4 border-l-transparent"
                          }`}
                        >
                          <td className="py-3 px-6 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                              isSelected ? "bg-primary text-white" : "bg-surface text-primary border border-primary/5"
                            }`}>
                              #{sku.srNo}
                            </span>
                          </td>
                          <td className="py-3 px-6">
                            <span className="font-serif font-bold text-textMain uppercase text-xs tracking-tight">
                              {sku.name}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-sans font-bold bg-surface text-primary border border-primary/10">
                              {sku.packing}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-muted text-[11px] font-sans font-bold uppercase tracking-wider">
                            {sku.boxPacking}
                          </td>
                          <td className="py-3 px-6 text-right font-sans font-bold text-textMain text-xs">
                            <div className="flex items-center justify-end gap-0.5">
                              <span className="text-muted text-[10px] mt-0.5">₹</span>
                              <input
                                type="number"
                                value={priceOverrides[sku.id] !== undefined ? (priceOverrides[sku.id] === null ? "" : priceOverrides[sku.id]) : sku.retailPrice}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? null : parseFloat(e.target.value);
                                  handleOverrideChange(sku.id, val);
                                }}
                                onBlur={(e) => {
                                  if (e.target.value === "" || parseFloat(e.target.value) === sku.retailPrice) {
                                    handleOverrideChange(sku.id, null);
                                  }
                                }}
                                className={`w-12 text-right bg-transparent border-b border-dashed border-transparent hover:border-primary/30 focus:border-primary focus:outline-hidden transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${priceOverrides[sku.id] !== undefined && priceOverrides[sku.id] !== null && priceOverrides[sku.id] !== sku.retailPrice ? "text-accent border-b-accent/50" : ""}`}
                                title="Temporary Price Override for this cart"
                              />
                            </div>
                          </td>
                          <td className="py-3 px-6">
                            <div className="flex items-center justify-between gap-1 bg-surface rounded-full p-1 border border-primary/10 max-w-[140px] mx-auto shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(sku.id, Math.max(0, qty - 1))}
                                className="w-6.5 h-6.5 rounded-full bg-white border border-primary/10 hover:bg-white/80 active:scale-90 flex items-center justify-center text-primary shadow-xs cursor-pointer transition-transform"
                                title="Decrease"
                              >
                                <span className="font-bold text-xs">-</span>
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={qty === 0 ? "" : qty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  handleQuantityChange(sku.id, isNaN(val) ? 0 : Math.max(0, val));
                                }}
                                placeholder="0"
                                className="w-10 text-center font-sans font-bold text-textMain bg-transparent focus:outline-hidden text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleQuantityChange(sku.id, qty + 1)}
                                className="w-6.5 h-6.5 rounded-full bg-primary hover:bg-primary-dark active:scale-90 flex items-center justify-center text-white shadow-xs cursor-pointer transition-transform"
                                title="Increase"
                              >
                                <span className="font-bold text-xs">+</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MOBILE INTERACTIVE HIGH-DENSITY ROWS */}
            <div className="block md:hidden space-y-3">
              {filteredSkus.map((sku) => {
                const qty = quantities[sku.id] || 0;
                const isSelected = qty > 0;
                return (
                  <div
                    key={sku.id}
                    className={`p-3 rounded-2xl border transition-all duration-150 flex flex-col gap-3 bg-white/70 ${
                      isSelected 
                        ? "border-primary bg-bg ring-1 ring-primary/20 shadow-xs" 
                        : "border-primary/10"
                    }`}
                  >
                    {/* Top Row: Index and Name */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                          isSelected ? "bg-primary text-white" : "bg-surface text-primary border border-primary/5"
                        }`}>
                          #{sku.srNo}
                        </span>
                        <h3 className="font-serif font-bold text-textMain uppercase text-xs leading-tight tracking-tight">
                          {sku.name}
                        </h3>
                      </div>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-sans font-bold bg-surface text-primary border border-primary/10">
                        {sku.packing}
                      </span>
                    </div>

                    {/* Bottom Row: Metrics & Stepper */}
                    <div className="flex items-center justify-between border-t border-primary/5 pt-2 mt-1">
                      <div className="flex items-center gap-4 text-[11px] font-sans">
                        <div>
                          <span className="text-muted uppercase text-[9px] font-bold block mb-0.5">Price</span>
                          <div className="flex items-center gap-0.5">
                            <span className="text-muted text-[10px]">₹</span>
                            <input
                              type="number"
                              value={priceOverrides[sku.id] !== undefined ? (priceOverrides[sku.id] === null ? "" : priceOverrides[sku.id]) : sku.retailPrice}
                              onChange={(e) => {
                                const val = e.target.value === "" ? null : parseFloat(e.target.value);
                                handleOverrideChange(sku.id, val);
                              }}
                              onBlur={(e) => {
                                if (e.target.value === "" || parseFloat(e.target.value) === sku.retailPrice) {
                                  handleOverrideChange(sku.id, null);
                                }
                              }}
                              className={`w-12 bg-transparent border-b border-dashed border-transparent hover:border-primary/30 focus:border-primary focus:outline-hidden transition-colors font-bold text-textMain [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${priceOverrides[sku.id] !== undefined && priceOverrides[sku.id] !== null && priceOverrides[sku.id] !== sku.retailPrice ? "text-accent border-b-accent/50" : ""}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Quantity Selector */}
                      <div className="flex items-center justify-between gap-1 bg-surface rounded-full p-1 border border-primary/10 max-w-[120px] w-full shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(sku.id, Math.max(0, qty - 1))}
                          className="w-6 h-6 rounded-full bg-white border border-primary/10 hover:bg-white/80 active:scale-90 flex items-center justify-center text-primary shadow-2xs cursor-pointer"
                        >
                          <span className="font-bold text-xs">-</span>
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={qty === 0 ? "" : qty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            handleQuantityChange(sku.id, isNaN(val) ? 0 : Math.max(0, val));
                          }}
                          placeholder="0"
                          className="w-8 text-center font-sans font-bold text-textMain bg-transparent focus:outline-hidden text-xs [appearance:textfield]"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(sku.id, qty + 1)}
                          className="w-6 h-6 rounded-full bg-primary hover:bg-primary-dark active:scale-90 flex items-center justify-center text-white shadow-2xs cursor-pointer"
                        >
                          <span className="font-bold text-xs">+</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Float/Bottom Floating Actions Widget */}
        <div className="mt-8 flex flex-col md:flex-row gap-4 items-center justify-between border-t border-primary/10 pt-8">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-primary/10 bg-white hover:bg-surface text-primary text-xs font-sans font-bold uppercase tracking-widest rounded-full active:scale-95 shadow-sm transition-all cursor-pointer"
          >
            <History className="w-4 h-4 text-accent" />
            {showHistory ? "Hide Past Shift Ledgers" : `View Saved Ledgers (${ledgerHistory.length})`}
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {activeCartStats.totalItems > 0 && (
              <button
                type="button"
                onClick={() => {
                  requestConfirm("Are you sure you want to clear all currently entered quantities?", () => {
                    setQuantities({});
                    setPriceOverrides({});
                  });
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-sans font-bold uppercase tracking-widest rounded-full active:scale-95 shadow-sm transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsReportOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-primary hover:bg-primary-dark text-surface text-xs font-sans font-bold uppercase tracking-widest rounded-full shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-accent-light" />
              View Today's Total Revenue Summary
            </button>
          </div>
        </div>

        {/* History Drawer / Panel Section */}
        {showHistory && (
          <div className="bg-white/60 border border-primary/10 rounded-3xl p-6 shadow-sm mt-4 space-y-6">
            {/* Drawer Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-primary/10 pb-5 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-surface text-primary rounded-xl border border-primary/5">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-primary font-serif">Historical Shift Ledgers</h3>
                  <p className="text-xs text-muted font-sans uppercase tracking-wider">Review or remove past daily logs saved securely.</p>
                </div>
              </div>

              {/* Action Buttons: Clear & Seed */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSeedSampleHistory}
                  className="text-[10px] font-sans font-bold uppercase tracking-widest text-accent border border-accent/20 hover:bg-accent/5 px-3 py-1.5 rounded-full cursor-pointer transition-colors"
                >
                  Seed Demo Data
                </button>
                {ledgerHistory.length > 0 && (
                  <>
                    <button
                      onClick={handleExportHistory}
                      className="text-[10px] font-bold font-sans uppercase tracking-widest text-primary border border-primary/20 hover:bg-surface px-3 py-1.5 rounded-full flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Export CSV
                    </button>
                    <button
                      onClick={() => {
                        requestConfirm("Danger: This will permanently delete ALL historical records. Proceed?", () => {
                          setLedgerHistory([]);
                          showToast("All historical ledgers deleted.");
                        });
                      }}
                      className="text-[10px] font-bold font-sans uppercase tracking-widest text-rose-600 border border-rose-100 hover:bg-rose-50 hover:text-rose-800 px-3 py-1.5 rounded-full flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear History
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Sub Tabs: Entries List vs Analytics Graph */}
            {ledgerHistory.length > 0 && (
              <div className="flex items-center gap-1.5 p-1 bg-surface rounded-2xl border border-primary/5 max-w-sm">
                <button
                  onClick={() => setHistoryTab("list")}
                  className={`flex-1 text-center py-2 text-[10px] font-sans uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer ${
                    historyTab === "list"
                      ? "bg-white text-textMain shadow-xs border border-primary/10"
                      : "text-muted hover:text-textMain"
                  }`}
                >
                  Ledger List ({ledgerHistory.length})
                </button>
                <button
                  onClick={() => setHistoryTab("graph")}
                  className={`flex-1 text-center py-2 text-[10px] font-sans uppercase tracking-widest font-bold rounded-xl transition-all cursor-pointer ${
                    historyTab === "graph"
                      ? "bg-primary text-white shadow-xs"
                      : "text-muted hover:text-textMain"
                  }`}
                >
                  Growth Graph
                </button>
              </div>
            )}

            {ledgerHistory.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-primary/10 rounded-3xl bg-white/30 space-y-4">
                <div className="max-w-md mx-auto space-y-1">
                  <p className="text-muted font-sans uppercase tracking-widest text-xs font-bold">No shift ledgers saved yet.</p>
                  <p className="text-xs text-muted font-sans">When you click <strong className="text-primary">Save Shift Ledger</strong>, your sales entries will automatically log and form a growth trend graph here.</p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleSeedSampleHistory}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-sans font-bold uppercase tracking-widest rounded-full shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-accent-light" />
                    Load 7-Day Demo Records
                  </button>
                </div>
              </div>
            ) : historyTab === "list" ? (
              /* LEDGER ENTRIES LIST TAB */
              <div className="space-y-4">
                {ledgerHistory.map((ledger) => {
                  const isExpanded = expandedLedgerId === ledger.id;
                  return (
                    <div
                      key={ledger.id}
                      className="border border-primary/10 rounded-2xl overflow-hidden shadow-xs hover:border-primary/25 bg-white transition-all"
                    >
                      {/* Accordion Trigger */}
                      <div
                        onClick={() => setExpandedLedgerId(isExpanded ? null : ledger.id)}
                        className="p-4 bg-surface/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface/50"
                      >
                        <div>
                          <p className="text-sm font-bold text-primary font-mono">
                            {ledger.date}
                          </p>
                          <div className="flex flex-wrap items-center gap-3.5 mt-1.5 font-sans uppercase tracking-wider text-[11px] font-semibold text-muted">
                            <span>
                              Qty: <strong className="text-textMain">{ledger.totalQuantity} pcs</strong>
                            </span>
                            <span>
                              Revenue: <strong className="text-textMain">₹{ledger.totalRevenue.toFixed(0)}</strong>
                            </span>
                          </div>
                          {ledger.notes && (
                            <p className="text-xs text-primary italic mt-2 bg-white/80 border border-primary/5 px-3 py-1.5 rounded-xl">
                              Memo: {ledger.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLedger(ledger.id);
                            }}
                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="p-1.5 text-primary">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="p-4 bg-white border-t border-primary/10">
                          <h4 className="text-[10px] font-sans font-bold text-muted uppercase tracking-widest mb-3">
                            Items Sold Breakdown
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-surface text-primary font-sans font-bold uppercase tracking-wider text-[10px] border-b border-primary/5">
                                  <th className="py-2.5 px-3">Item Name</th>
                                  <th className="py-2.5 px-3 text-center">Packing</th>
                                  <th className="py-2.5 px-3 text-center">Qty</th>
                                  <th className="py-2.5 px-3 text-right">Revenue</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-primary/5 font-sans">
                                {ledger.sales.map((sale, idx) => (
                                  <tr key={idx} className="hover:bg-surface/10 text-textMain">
                                    <td className="py-2.5 px-3 font-semibold uppercase font-serif text-[13px] text-textMain">
                                      {sale.skuName}
                                    </td>
                                    <td className="py-2.5 px-3 text-center text-muted font-medium font-mono text-[11px]">
                                      {sale.packing}
                                    </td>
                                    <td className="py-2.5 px-3 text-center font-bold text-primary font-mono text-[13px]">
                                      {sale.quantity}
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-textMain font-mono">
                                      ₹{sale.revenue.toFixed(0)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* GROWTH ANALYTICS GRAPH TAB */
              <div className="space-y-6">
                {/* Cumulative Statistics Bento Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-primary/10 p-4 rounded-2xl shadow-2xs">
                    <span className="text-[9px] font-sans font-bold text-muted uppercase tracking-widest block">Total Days Logged</span>
                    <p className="text-xl font-bold text-primary mt-1 font-mono">{ledgerHistory.length} Days</p>
                  </div>
                  <div className="bg-white border border-primary/10 p-4 rounded-2xl shadow-2xs">
                    <span className="text-[9px] font-sans font-bold text-muted uppercase tracking-widest block">Cumulative Revenue</span>
                    <p className="text-xl font-bold text-textMain mt-1 inline-flex items-center">
                      <IndianRupee className="w-4 h-4 self-center text-accent animate-pulse" />
                      {cumulativeStats.totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="bg-white border border-primary/10 p-4 rounded-2xl shadow-2xs">
                    <span className="text-[9px] font-sans font-bold text-muted uppercase tracking-widest block">Cumulative Items Sold</span>
                    <p className="text-xl font-bold text-primary mt-1 font-mono">
                      {cumulativeStats.totalQuantity.toLocaleString("en-IN")} pcs
                    </p>
                  </div>
                </div>

                {/* Primary Chart Canvas */}
                <div className="bg-white border border-primary/10 rounded-3xl p-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-primary/5 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-primary font-serif flex items-center gap-1.5">
                        <LucideLineChart className="w-4 h-4 text-accent" />
                        Overall Sales Revenue Trend
                      </h4>
                      <p className="text-[10px] text-muted font-sans uppercase tracking-wider mt-0.5">
                        Showing sales revenue chronological timeline starting from the day you launched.
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-sans font-bold uppercase tracking-wider">
                      <span className="inline-flex items-center gap-1 text-primary">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                        Sales Revenue
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={historicalTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#5A5A40" opacity={0.05} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 9, fill: '#8E8E7E', fontFamily: 'Inter' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 9, fill: '#8E8E7E', fontFamily: 'Inter' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            background: "#2D2D2A",
                            color: "#F5F5F0",
                            borderRadius: "16px",
                            border: "none",
                            fontSize: "11px",
                            fontFamily: "Inter"
                          }}
                          formatter={(value: number) => [
                            `₹${value.toLocaleString("en-IN")}`,
                            "Sales Revenue"
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          name="revenue"
                          stroke="#5A5A40"
                          strokeWidth={3}
                          dot={{ r: 4, strokeWidth: 2, fill: "#FDFCF8" }}
                          activeDot={{ r: 6 }}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
          </>
        ) : (
          <div className="bg-white/60 rounded-3xl p-6 shadow-sm border border-primary/10 flex flex-col gap-6 w-full animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary/10 pb-4">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-xl font-bold text-primary font-serif tracking-tight">Stock Inventory</h3>
                  <p className="text-xs text-muted font-sans uppercase tracking-wider mt-1">
                    Manage available piece counts for cleaning chemical products, scrubs, and mops.
                  </p>
                </div>
              </div>
              <button
                onClick={handleExportStock}
                className="text-[10px] font-bold font-sans uppercase tracking-widest text-primary border border-primary/20 hover:bg-surface px-3 py-1.5 rounded-full flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface text-primary text-[10px] font-sans font-bold uppercase tracking-wider border-b border-primary/10">
                    <th className="py-3 px-6 w-16 text-center">S.R. No</th>
                    <th className="py-3 px-6">Product Description</th>
                    <th className="py-3 px-4 text-center">Packing</th>
                    <th className="py-3 px-6 text-center w-48">Current Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {stockSkus.map(sku => (
                    <tr key={sku.id} className="hover:bg-surface/20 transition-colors duration-150">
                      <td className="py-3 px-6 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold bg-surface text-primary border border-primary/5">
                          #{sku.srNo}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <span className="font-serif font-bold text-textMain uppercase text-xs tracking-tight">
                          {sku.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-sans font-bold bg-surface text-primary border border-primary/10">
                          {sku.packing}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <input
                          type="number"
                          value={stockCounts[sku.id] === undefined ? "" : stockCounts[sku.id]}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStockCounts(prev => ({
                              ...prev,
                              [sku.id]: val === "" ? 0 : parseInt(val, 10)
                            }));
                          }}
                          placeholder="0"
                          min="0"
                          className="w-24 px-3 py-2 text-center text-sm font-sans font-bold bg-white border border-primary/20 rounded-xl focus:border-accent focus:outline-hidden transition-all text-textMain"
                        />
                      </td>
                    </tr>
                  ))}
                  {stockSkus.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-muted text-xs font-sans uppercase tracking-widest font-bold">
                        No applicable products found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        skus={skus.map((s) => ({ ...s, retailPrice: priceOverrides[s.id] !== undefined ? priceOverrides[s.id] : s.retailPrice }))}
        quantities={quantities}
        onSaveLedger={handleSaveLedger}
        onReset={() => {
          setQuantities({});
          setPriceOverrides({});
          setIsReportOpen(false);
          showToast("Quantities cleared.");
        }}
      />

      {/* Price Editor Modal */}
      {isPriceModalOpen && (
        <div className="fixed inset-0 bg-textMain/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-bg border border-primary/10 rounded-[32px] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-6 bg-surface border-b border-primary/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-primary font-serif flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-accent" />
                  Edit Retail Prices
                </h3>
                <p className="text-[10px] text-muted font-sans uppercase tracking-wider mt-1">
                  Adjust product selling prices to match current market trends.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPriceModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/80 hover:bg-primary hover:text-white flex items-center justify-center text-xs text-primary border border-primary/10 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Search and Action bar */}
            <div className="p-5 border-b border-primary/5 bg-bg flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-3.5 h-3.5" />
                <input
                  type="text"
                  value={priceSearchQuery}
                  onChange={(e) => setPriceSearchQuery(e.target.value)}
                  placeholder="Search products to edit..."
                  className="w-full pl-9 pr-4 py-2 text-xs font-sans uppercase tracking-wider bg-surface/50 border border-primary/10 rounded-xl focus:bg-white focus:border-primary focus:outline-hidden transition-all placeholder-muted font-semibold"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingProduct(!isAddingProduct)}
                  className={`px-4 py-2 text-[9px] font-sans uppercase tracking-widest font-bold border rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 ${isAddingProduct ? 'bg-primary text-white border-primary' : 'text-primary border-primary/20 hover:bg-surface'}`}
                >
                  <Plus className="w-3 h-3" />
                  {isAddingProduct ? 'Cancel Add' : 'Add Product'}
                </button>
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="px-4 py-2 text-[9px] font-sans uppercase tracking-widest font-bold text-amber-800 border border-amber-200 bg-amber-50/20 hover:bg-amber-50 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset Defaults
                </button>
              </div>
            </div>

            {/* Add Product Inline Form */}
            {isAddingProduct && (
              <div className="bg-surface/50 border-b border-primary/10 p-5 px-6 animate-fade-in">
                <h4 className="text-[10px] font-bold text-primary font-sans uppercase tracking-widest mb-3">Create New SKU</h4>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-sans uppercase tracking-wider text-muted mb-1">Product Name</label>
                    <input
                      type="text"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      placeholder="e.g. Toilet Cleaner Pro"
                      className="w-full px-3 py-2 text-xs font-sans uppercase tracking-wider bg-white border border-primary/20 rounded-lg focus:border-primary focus:outline-hidden"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-sans uppercase tracking-wider text-muted mb-1">Capacity</label>
                    <select
                      value={newProductCapacity}
                      onChange={(e) => setNewProductCapacity(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-sans uppercase tracking-wider bg-white border border-primary/20 rounded-lg focus:border-primary focus:outline-hidden appearance-none"
                    >
                      <option value="1 LTR">1 LTR</option>
                      <option value="3 LTR">3 LTR</option>
                      <option value="5 LTR">5 LTR</option>
                      <option value="500 ML">500 ML</option>
                      <option value="250 ML">250 ML</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-sans uppercase tracking-wider text-muted mb-1">Retail Price</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-xs font-sans font-bold">₹</span>
                      <input
                        type="number"
                        value={newProductPrice}
                        onChange={(e) => setNewProductPrice(e.target.value === "" ? "" : parseFloat(e.target.value))}
                        placeholder="0"
                        className="w-full pl-6 pr-2 py-2 text-xs font-sans font-bold bg-white border border-primary/20 rounded-lg focus:border-primary focus:outline-hidden"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddProduct}
                      className="w-full px-4 py-2 bg-primary hover:bg-primary-dark text-white text-[10px] font-sans font-bold uppercase tracking-widest rounded-lg transition-all"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Body - SKU list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3.5 divide-y divide-primary/5">
              {skus
                .filter((s) => {
                  const q = priceSearchQuery.toLowerCase().trim();
                  if (!q) return true;
                  const tokens = q.split(/\s+/);
                  return tokens.every((token) => 
                    s.name.toLowerCase().includes(token) ||
                    s.packing.toLowerCase().includes(token) ||
                    s.srNo.toString().includes(token)
                  );
                })
                .map((sku) => (
                  <div key={sku.id} className="pt-3.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm font-bold">
                          #{sku.srNo}
                        </span>
                        <input
                          type="text"
                          value={sku.name}
                          onChange={(e) => handleNameChange(sku.id, e.target.value)}
                          className="text-xs font-bold text-textMain uppercase tracking-wider bg-transparent border-b border-transparent hover:border-primary/30 focus:border-primary focus:outline-hidden w-full max-w-[200px] px-1 py-0.5"
                        />
                      </div>
                      <p className="text-[10px] text-muted font-sans uppercase tracking-wider mt-0.5">
                        Packing: {sku.packing} | Box: {sku.boxPacking}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="text-[10px] text-muted font-sans uppercase tracking-widest font-semibold">Retail Price:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handlePriceChange(sku.id, sku.retailPrice - 5)}
                          className="w-7 h-7 bg-surface hover:bg-primary hover:text-bg rounded-lg text-xs font-sans font-bold flex items-center justify-center transition-all cursor-pointer border border-primary/10"
                        >
                          -5
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePriceChange(sku.id, sku.retailPrice - 1)}
                          className="w-7 h-7 bg-surface hover:bg-primary hover:text-bg rounded-lg text-xs font-sans font-bold flex items-center justify-center transition-all cursor-pointer border border-primary/10"
                        >
                          -1
                        </button>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-xs font-sans font-bold">₹</span>
                          <input
                            type="number"
                            value={sku.retailPrice === 0 ? "" : sku.retailPrice}
                            onChange={(e) => handlePriceChange(sku.id, parseFloat(e.target.value) || 0)}
                            className="w-20 pl-6 pr-2 py-1 bg-white border border-primary/10 focus:border-primary focus:outline-hidden text-xs font-sans font-bold rounded-lg text-right"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePriceChange(sku.id, sku.retailPrice + 1)}
                          className="w-7 h-7 bg-surface hover:bg-primary hover:text-bg rounded-lg text-xs font-sans font-bold flex items-center justify-center transition-all cursor-pointer border border-primary/10"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePriceChange(sku.id, sku.retailPrice + 5)}
                          className="w-7 h-7 bg-surface hover:bg-primary hover:text-bg rounded-lg text-xs font-sans font-bold flex items-center justify-center transition-all cursor-pointer border border-primary/10"
                        >
                          +5
                        </button>
                        <div className="w-px h-6 bg-primary/10 mx-1"></div>
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(sku.id)}
                          title="Remove Product"
                          className="w-7 h-7 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-500 rounded-lg text-xs font-sans flex items-center justify-center transition-all cursor-pointer border border-rose-100 hover:border-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              {skus.filter((s) => {
                  const q = priceSearchQuery.toLowerCase().trim();
                  if (!q) return true;
                  const tokens = q.split(/\s+/);
                  return tokens.every((token) => 
                    s.name.toLowerCase().includes(token) ||
                    s.packing.toLowerCase().includes(token) ||
                    s.srNo.toString().includes(token)
                  );
                }).length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-xs text-muted uppercase tracking-wider">No matching products found.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-surface border-t border-primary/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPriceModalOpen(false)}
                className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-surface text-[10px] font-sans uppercase tracking-widest font-bold rounded-full transition-all cursor-pointer shadow-md"
              >
                Close & Apply Prices
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Sync Modal */}
      <CloudSyncModal
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
        skus={skus}
        ledgerHistory={ledgerHistory}
        stockCounts={stockCounts}
        quantities={quantities}
        priceOverrides={priceOverrides}
        onRestore={(restoredSkus, restoredHistory, restoredStocks, restoredQuantities, restoredOverrides) => {
          if (restoredSkus && restoredSkus.length > 0) setSkus(restoredSkus);
          if (restoredHistory && restoredHistory.length > 0) setLedgerHistory(restoredHistory);
          if (restoredStocks) setStockCounts(restoredStocks);
          if (restoredQuantities) setQuantities(restoredQuantities);
          if (restoredOverrides) setPriceOverrides(restoredOverrides);
        }}
        showToast={showToast}
        onExport={handleExportHistory}
      />

      {/* Simple Professional Footer */}
      <footer className="mt-auto bg-primary text-surface py-10 rounded-t-[40px] shadow-2xl relative text-center flex flex-col items-center justify-center gap-1.5 overflow-hidden">
        {/* Organic texture overlay */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[url('https://www.transparenttextures.com/patterns/canvas-orange.png')] opacity-5 pointer-events-none" />
        
        <p className="font-sans uppercase tracking-[0.25em] text-accent-light text-xs font-bold">
          Panchmahal Brooms DHD • Inventory Control
        </p>
        <p className="text-[10px] uppercase tracking-widest text-white/50 font-sans max-w-lg px-4 leading-relaxed">
          Made with premium natural design layout, tracking sales metrics and chemical margins in real-time.
        </p>
      </footer>
    </div>
    </div>
  );
}