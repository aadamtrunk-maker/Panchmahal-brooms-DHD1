import React, { useState, useEffect } from "react";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { Cloud, CheckCircle2, AlertCircle, RefreshCw, LogIn, LogOut, Download, Upload, X } from "lucide-react";
import { SKU, DailyLedger } from "../types";

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  skus: SKU[];
  ledgerHistory: DailyLedger[];
  stockCounts?: Record<number, number>;
  quantities?: Record<number, number>;
  priceOverrides?: Record<number, number>;
  onRestore: (
    skus: SKU[],
    ledgerHistory: DailyLedger[],
    stockCounts?: Record<number, number>,
    quantities?: Record<number, number>,
    priceOverrides?: Record<number, number>
  ) => void;
  showToast: (msg: string) => void;
  onExport: () => void;
}

export function CloudSyncModal({
  isOpen,
  onClose,
  skus,
  ledgerHistory,
  stockCounts = {},
  quantities = {},
  priceOverrides = {},
  onRestore,
  showToast,
  onExport
}: CloudSyncModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      showToast("Logged in successfully");
    } catch (err: any) {
      console.error(err);
      showToast(`Login failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await signOut(auth);
      showToast("Logged out successfully");
      setLastSyncTime(null);
    } catch (err: any) {
      console.error(err);
      showToast(`Logout failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackup = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const docRef = doc(db, "stores", user.uid);
      const data = {
        ownerId: user.uid,
        skus: JSON.stringify(skus),
        ledgerHistory: JSON.stringify(ledgerHistory),
        stockCounts: JSON.stringify(stockCounts),
        quantities: JSON.stringify(quantities),
        priceOverrides: JSON.stringify(priceOverrides),
        updatedAt: Date.now()
      };
      await setDoc(docRef, data);
      setLastSyncTime(Date.now());
      showToast("Backed up successfully to Cloud!");
    } catch (err: any) {
      console.error(err);
      showToast(`Backup failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const docRef = doc(db, "stores", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const restoredSkus = data.skus ? JSON.parse(data.skus) : [];
        const restoredHistory = data.ledgerHistory ? JSON.parse(data.ledgerHistory) : [];
        const restoredStocks = data.stockCounts ? JSON.parse(data.stockCounts) : {};
        const restoredQuantities = data.quantities ? JSON.parse(data.quantities) : {};
        const restoredOverrides = data.priceOverrides ? JSON.parse(data.priceOverrides) : {};
        if (restoredSkus.length > 0 || restoredHistory.length > 0) {
          onRestore(restoredSkus, restoredHistory, restoredStocks, restoredQuantities, restoredOverrides);
          setLastSyncTime(data.updatedAt);
          showToast("Restored from Cloud successfully!");
        } else {
          showToast("No valid data found in Cloud.");
        }
      } else {
        showToast("No backup found in Cloud.");
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Restore failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-textMain/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-bg border border-primary/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in relative">
        <div className="p-6 border-b border-primary/10 flex items-center justify-between bg-surface">
          <h3 className="text-xl font-bold text-primary font-serif flex items-center gap-2">
            <Cloud className="w-5 h-5 text-accent" />
            Cloud Database Sync
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-primary/10 rounded-full transition-colors text-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          {!user ? (
            <div className="text-center space-y-4">
              <p className="text-muted text-xs font-sans uppercase tracking-wider">
                Sign in to securely backup your products and ledger history to the cloud. You can restore them anytime, even if you clear your browser data.
              </p>
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-white border border-primary/20 hover:border-primary rounded-xl text-sm font-bold text-textMain flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                Sign in with Google
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-surface rounded-xl p-4 flex items-center justify-between border border-primary/10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-sans font-bold text-muted uppercase tracking-widest">
                    Signed in as
                  </span>
                  <span className="text-sm font-bold text-textMain mt-0.5">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {lastSyncTime && (
                <p className="text-center text-[10px] text-muted font-sans uppercase tracking-widest font-bold">
                  Last Sync: {new Date(lastSyncTime).toLocaleString()}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={handleBackup}
                  disabled={isLoading}
                  className="flex flex-col items-center justify-center gap-2 p-4 bg-primary hover:bg-primary-dark text-white rounded-2xl transition-all disabled:opacity-50 group"
                >
                  <Upload className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
                  <span className="text-xs font-bold font-sans uppercase tracking-wider text-center">
                    Backup Data
                  </span>
                </button>
                <button
                  onClick={handleRestore}
                  disabled={isLoading}
                  className="flex flex-col items-center justify-center gap-2 p-4 bg-white hover:bg-surface border border-primary/20 text-primary rounded-2xl transition-all disabled:opacity-50 group"
                >
                  <Download className="w-6 h-6 group-hover:translate-y-1 transition-transform" />
                  <span className="text-xs font-bold font-sans uppercase tracking-wider text-center">
                    Restore Data
                  </span>
                </button>
                <button
                  onClick={onExport}
                  disabled={isLoading}
                  className="flex flex-col items-center justify-center gap-2 p-4 bg-white hover:bg-surface border border-primary/20 text-primary rounded-2xl transition-all disabled:opacity-50 group"
                >
                  <Download className="w-6 h-6 group-hover:translate-y-1 transition-transform" />
                  <span className="text-xs font-bold font-sans uppercase tracking-wider text-center">
                    Export CSV
                  </span>
                </button>
              </div>

              <div className="flex gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-800 font-sans uppercase tracking-wider leading-relaxed font-semibold">
                  Restoring will overwrite your current local data. Make sure you've backed up any recent changes!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
