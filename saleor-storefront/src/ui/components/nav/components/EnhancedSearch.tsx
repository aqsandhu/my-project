"use client";

import { useState } from "react";
import { Search } from "lucide-react";

export const EnhancedSearch = ({ channel }: { channel: string }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      window.location.href = `/${channel}/search?q=${encodeURIComponent(searchTerm)}`;
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-60">
      <div className="flex items-center border border-amber-500/60 bg-[#35200a] rounded-md">
        <input
          type="text"
          placeholder="Search for blades..."
          className="w-full px-3 py-1.5 bg-transparent focus:outline-none text-white placeholder-gray-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          type="submit"
          className="p-1.5 rounded-r-md hover:text-amber-400"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}; 