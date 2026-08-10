const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('isDarkMode')) {
  content = content.replace(
    'const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);',
    'const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);\n  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("panchmahal_theme") === "dark");\n\n  useEffect(() => {\n    if (isDarkMode) {\n      document.documentElement.classList.add("dark");\n      localStorage.setItem("panchmahal_theme", "dark");\n    } else {\n      document.documentElement.classList.remove("dark");\n      localStorage.setItem("panchmahal_theme", "light");\n    }\n  }, [isDarkMode]);'
  );
  
  content = content.replace(
    /import {\s*ShoppingCart,\s*Search,/g,
    'import { Moon, Sun, ShoppingCart, Search,'
  );

  content = content.replace(
    '<Cloud className="w-3.5 h-3.5" />\n              Cloud Sync\n            </button>\n          </div>',
    '<Cloud className="w-3.5 h-3.5" />\n              Cloud Sync\n            </button>\n            <button onClick={() => setIsDarkMode(!isDarkMode)} className="inline-flex items-center justify-center p-1.5 bg-white hover:bg-primary hover:text-surface text-primary font-bold rounded-full border border-primary/10 transition-all cursor-pointer shadow-2xs self-center sm:self-auto" title="Toggle Dark Mode">\n              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}\n            </button>\n          </div>'
  );
  fs.writeFileSync('src/App.tsx', content);
}
