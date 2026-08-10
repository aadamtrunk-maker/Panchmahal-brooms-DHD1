import React from "react";
import { SKU } from "../types";
import { Plus, Minus, IndianRupee } from "lucide-react";

interface SkuCardProps {
  sku: SKU;
  quantity: number;
  onQuantityChange: (skuId: number, value: number) => void;
}

export const SkuCard: React.FC<SkuCardProps> = ({
  sku,
  quantity,
  onQuantityChange,
}) => {
  const isSelected = quantity > 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      onQuantityChange(sku.id, 0);
    } else {
      onQuantityChange(sku.id, Math.max(0, val));
    }
  };

  return (
    <div
      id={`sku-card-${sku.id}`}
      className={`relative p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between h-full bg-white/70 shadow-sm ${
        isSelected
          ? "border-primary bg-bg ring-1 ring-primary/20 shadow-md"
          : "border-primary/10 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      {/* Index Badge */}
      <div className="absolute top-3 left-3 bg-surface text-primary text-[11px] font-bold px-2.5 py-0.5 rounded-full font-mono border border-primary/5">
        #{sku.srNo}
      </div>

      <div className="pt-4 flex-1">
        {/* SKU Name */}
        <h3 className="font-serif font-bold text-textMain text-base leading-snug uppercase tracking-tight">
          {sku.name}
        </h3>

        {/* Packing details */}
        <div className="mt-2.5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-sans font-semibold bg-surface text-primary border border-primary/10">
            {sku.packing}
          </span>
          <span className="text-[11px] text-muted font-sans font-medium uppercase tracking-wider">
            {sku.boxPacking}
          </span>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="mt-5 pt-3 border-t border-primary/10 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-muted text-xs font-sans uppercase tracking-wider py-2">
          <span>Retail Price</span>
          <span className="font-bold text-textMain inline-flex items-center text-sm">
            <IndianRupee className="w-3.5 h-3.5" />
            {sku.retailPrice}
          </span>
        </div>
      </div>

      {/* Quantity Adjuster */}
      <div className="mt-4 flex items-center justify-between gap-2 bg-surface rounded-full p-1.5 border border-primary/5">
        <button
          type="button"
          onClick={() => onQuantityChange(sku.id, Math.max(0, quantity - 1))}
          className="w-7 h-7 rounded-full bg-white border border-primary/10 hover:bg-white/80 active:scale-90 flex items-center justify-center text-primary shadow-xs transition-transform cursor-pointer"
          title="Decrease"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <input
          type="number"
          min="0"
          value={quantity === 0 ? "" : quantity}
          onChange={handleInputChange}
          placeholder="0"
          className="w-12 text-center font-sans font-bold text-textMain bg-transparent focus:outline-hidden text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />

        <button
          type="button"
          onClick={() => onQuantityChange(sku.id, quantity + 1)}
          className="w-7 h-7 rounded-full bg-primary hover:bg-primary-dark active:scale-90 flex items-center justify-center text-white shadow-xs transition-transform cursor-pointer"
          title="Increase"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
