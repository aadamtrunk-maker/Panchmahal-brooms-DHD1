const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add Print button
content = content.replace(
  '<RefreshCw className="w-3 h-3" />\n              Reset Shift\n            </button>',
  '<RefreshCw className="w-3 h-3" />\n              Reset Shift\n            </button>\n            <button\n              onClick={() => window.print()}\n              title="Print Current Shift Receipt"\n              className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-sans uppercase tracking-widest font-bold rounded-full border border-primary/20 text-primary hover:bg-surface transition-colors cursor-pointer"\n            >\n              <Printer className="w-3 h-3" />\n              Print Receipt\n            </button>'
);

// Add Printer icon
content = content.replace(
  'import { Moon, Sun, ShoppingCart, Search,',
  'import { Moon, Sun, ShoppingCart, Search, Printer,'
);

// Add printable area at the very bottom, inside the main return wrapper
content = content.replace(
  '      {/* Main Workspace Layout */}',
  `      {/* Printable Receipt Area (Only visible in print mode) */}
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
      <div className="print:hidden flex-1 flex flex-col w-full max-w-7xl mx-auto">`
);

// Fix the closing div for the new wrapper
const lastIndex = content.lastIndexOf('    </div>\n  );\n}');
if (lastIndex !== -1) {
  content = content.slice(0, lastIndex) + '    </div>\n    </div>\n  );\n}' + content.slice(lastIndex + 20);
}


fs.writeFileSync('src/App.tsx', content);
