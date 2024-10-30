"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowRightLeft,
  TrendingUp,
  RefreshCw,
  Star,
  History,
  Info,
  Github,
  Search,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  NGN: "₦",
  INR: "₹",
  CNY: "¥",
  AUD: "A$",
  CAD: "C$",
};

const formatNumber = (number) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number);
};

const CurrencySelector = ({
  value,
  onValueChange,
  currencies,
  disabled,
  label,
  getSymbol,
  disabledCurrency,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);
  const popoverRef = useRef(null);

  // Filter out the disabled currency from the available options
  const filteredCurrencies = useMemo(() => {
    if (!searchQuery) {
      return Object.entries(currencies).filter(
        ([code]) => code !== disabledCurrency
      );
    }
    return Object.entries(currencies).filter(([code, name]) => {
      const term = searchQuery.toLowerCase();
      return (
        code !== disabledCurrency &&
        (code.toLowerCase().includes(term) || name.toLowerCase().includes(term))
      );
    });
  }, [currencies, searchQuery, disabledCurrency]);

  const handleSelect = (newValue) => {
    onValueChange(newValue);
    setSearchQuery("");
    setIsOpen(false);
  };

  // Focus search input when select opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  return (
    <div className="flex-1 min-w-0">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <Select
        open={isOpen}
        onOpenChange={setIsOpen}
        value={value}
        onValueChange={handleSelect}
        disabled={disabled}
      >
        <SelectTrigger className="w-full h-[42px] bg-white border border-gray-200 hover:border-blue-200 transition-colors truncate">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg font-medium flex-shrink-0">
              {getSymbol(value)}
            </span>
            <SelectValue asChild>
              <span className="truncate">
                {value} - {currencies[value]}
              </span>
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent
          ref={popoverRef}
          className="max-h-[80vh] overflow-hidden w-[calc(100vw-2rem)] sm:w-[320px]"
          position="popper"
          sideOffset={5}
        >
          <div
            className="sticky top-0 z-50 bg-white border-b p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="Search currencies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[50vh] sm:max-h-[320px]">
            {filteredCurrencies.map(([code, name]) => (
              <SelectItem
                key={code}
                value={code}
                className="cursor-pointer hover:bg-blue-50 py-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base font-medium flex-shrink-0 min-w-[24px]">
                    {getSymbol(code)}
                  </span>
                  <span className="truncate">
                    {code} - {name}
                  </span>
                </div>
              </SelectItem>
            ))}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
};

const CurrencyExchange = () => {
  const [amount, setAmount] = useState("");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("EUR");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currencies, setCurrencies] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [conversionHistory, setConversionHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [rates, setRates] = useState({});
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [fromSearchQuery, setFromSearchQuery] = useState("");
  const [toSearchQuery, setToSearchQuery] = useState("");
  const [isOffline, setIsOffline] = useState(false);

  const API_KEY = "b8fa735ff340a69eb35dbe0a";
  const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}`;

  // Handle online/offline status
  // Check online status after component mounts
  useEffect(() => {
    setIsOffline(!window.navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Initialize lastUpdated with null instead of undefined
  useEffect(() => {
    if (typeof window !== "undefined") {
      fetchAllRates();
      fetchCurrencies();
      loadStoredData();
    }
  }, []);

  // Format amount input with thousands separator
  const formatInput = (value) => {
    // Remove existing commas and non-numeric characters except decimal point
    const cleanValue = value.replace(/[^\d.]/g, "");
    const parts = cleanValue.split(".");

    // Format the whole number part with commas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    // Reconstruct with decimal part if it exists
    return parts.length > 1 ? `${parts[0]}.${parts[1].slice(0, 2)}` : parts[0];
  };

  // Handle amount input change
  const handleAmountChange = (e) => {
    const value = e.target.value;
    const numericValue = value.replace(/[^\d.]/g, "");
    setAmount(numericValue);
  };

  useEffect(() => {
    fetchAllRates();
    fetchCurrencies();
    loadStoredData();
  }, []);

  // Stop loading spinner after initial data fetch
  useEffect(() => {
    if (isInitialLoad && Object.keys(rates).length > 0) {
      setTimeout(() => {
        setIsInitialLoad(false);
      }, 1500);
    }
  }, [rates, isInitialLoad]);

  const loadStoredData = () => {
    if (typeof window !== "undefined") {
      const savedFavorites = localStorage.getItem("favoriteConversions");
      const savedHistory = localStorage.getItem("conversionHistory");
      if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
      if (savedHistory) setConversionHistory(JSON.parse(savedHistory));
    }
  };

  const fetchAllRates = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/latest/USD`);
      const data = await response.json();
      if (data.result === "success") {
        setRates(data.conversion_rates);
        setLastUpdated(new Date(data.time_last_update_utc).toLocaleString());
      }
    } catch (err) {
      setError("Failed to fetch rates. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const response = await fetch(`${BASE_URL}/codes`);
      const data = await response.json();
      if (data.result === "success") {
        const currencyObj = {};
        data.supported_codes.forEach(([code, name]) => {
          currencyObj[code] = name;
        });
        setCurrencies(currencyObj);
      }
    } catch (err) {
      setError("Failed to load currencies. Please check your connection.");
    }
  };

  // Filter currencies based on search
  // Create two separate filtered currency lists
  const filteredFromCurrencies = useMemo(() => {
    return Object.entries(currencies).filter(([code, name]) => {
      const searchTerm = fromSearchQuery.toLowerCase();
      return (
        code.toLowerCase().includes(searchTerm) ||
        name.toLowerCase().includes(searchTerm)
      );
    });
  }, [currencies, fromSearchQuery]);

  const filteredToCurrencies = useMemo(() => {
    return Object.entries(currencies).filter(([code, name]) => {
      const searchTerm = toSearchQuery.toLowerCase();
      return (
        code.toLowerCase().includes(searchTerm) ||
        name.toLowerCase().includes(searchTerm)
      );
    });
  }, [currencies, toSearchQuery]);

  const calculateExchange = () => {
    if (!amount || !fromCurrency || !toCurrency || !rates[fromCurrency]) return;

    try {
      const baseRate = rates[fromCurrency];
      const targetRate = rates[toCurrency];
      const conversion = (amount / baseRate) * targetRate;

      const resultData = {
        amount: conversion.toFixed(2),
        rate: (targetRate / baseRate).toFixed(4),
        lastUpdated: lastUpdated,
      };

      setResult(resultData);

      const historyEntry = {
        timestamp: new Date().toISOString(),
        from: fromCurrency,
        to: toCurrency,
        amount: amount,
        result: resultData.amount,
        rate: resultData.rate,
      };

      const updatedHistory = [historyEntry, ...conversionHistory.slice(0, 9)];
      setConversionHistory(updatedHistory);
      localStorage.setItem("conversionHistory", JSON.stringify(updatedHistory));
    } catch (err) {
      setError("Failed to perform conversion. Please try again.");
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (amount) calculateExchange();
    }, 500);
    return () => clearTimeout(timer);
  }, [amount, fromCurrency, toCurrency]);

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const toggleFavorite = () => {
    const pair = `${fromCurrency}/${toCurrency}`;
    const newFavorites = favorites.includes(pair)
      ? favorites.filter((f) => f !== pair)
      : [...favorites, pair];
    setFavorites(newFavorites);
    localStorage.setItem("favoriteConversions", JSON.stringify(newFavorites));
  };

  const isFavorite = () => {
    return favorites.includes(`${fromCurrency}/${toCurrency}`);
  };

  const getSymbol = (currency) => CURRENCY_SYMBOLS[currency] || currency;

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-2 sm:p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {isOffline && (
          <Alert className="bg-yellow-50 border-yellow-200 mb-4">
            <AlertDescription className="text-yellow-800">
              You are currently offline. Some features may be limited.
            </AlertDescription>
          </Alert>
        )}

        <Card className="w-full border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg p-4 sm:p-6">
            <div className="flex flex-col space-y-3 sm:space-y-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <CardTitle className="text-2xl sm:text-3xl font-bold">
                      Currency Exchange
                    </CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-white/80 hover:text-white transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Real-time exchange rates</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <CardDescription className="mt-1 text-blue-100">
                    Fast and reliable currency conversion
                  </CardDescription>
                </div>
                {lastUpdated && (
                  <Badge
                    variant="secondary"
                    className="bg-white/10 text-white text-xs sm:text-sm whitespace-normal sm:whitespace-nowrap"
                  >
                    {isInitialLoad && (
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    )}
                    Last Updated: {lastUpdated}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              {/* Amount Input Section */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <div className="relative group">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-blue-500 transition-colors">
                    {getSymbol(fromCurrency)}
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formatInput(amount.toString())}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className="pl-8 h-[42px] w-full transition-all border-gray-200 group-hover:border-blue-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Currency Selection */}
              <div className="w-full">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
                  <CurrencySelector
                    label="From"
                    value={fromCurrency}
                    onValueChange={setFromCurrency}
                    currencies={currencies}
                    disabled={loading || Object.keys(currencies).length === 0}
                    getSymbol={getSymbol}
                    disabledCurrency={toCurrency}
                  />

                  <div className="flex justify-center sm:pb-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={swapCurrencies}
                      className="h-[42px] w-[42px] rounded-full border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                    </Button>
                  </div>

                  <CurrencySelector
                    label="To"
                    value={toCurrency}
                    onValueChange={setToCurrency}
                    currencies={currencies}
                    disabled={loading || Object.keys(currencies).length === 0}
                    getSymbol={getSymbol}
                    disabledCurrency={fromCurrency}
                  />
                </div>
              </div>
              {/* Favorite Currency Pairs */}
              {favorites.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {favorites.map((pair) => {
                    const [from, to] = pair.split("/");
                    return (
                      <Button
                        key={pair}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFromCurrency(from);
                          setToCurrency(to);
                        }}
                        className="text-xs bg-white hover:bg-blue-50 border-gray-200"
                      >
                        <Star className="h-3 w-3 mr-1 text-yellow-500" />
                        {from}/{to}
                      </Button>
                    );
                  })}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleFavorite}
                  className={`
                    h-10 w-10 rounded-full border-2 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105
                    ${
                      isFavorite()
                        ? "text-yellow-500 border-yellow-500 hover:bg-yellow-50"
                        : "text-gray-500 border-gray-200 hover:border-yellow-500 hover:text-yellow-500 hover:bg-yellow-50"
                    }
                  `}
                >
                  <Star className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowHistory(!showHistory)}
                  className={`
                    h-10 w-10 rounded-full border-2 transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105
                    ${
                      showHistory
                        ? "bg-blue-50 text-blue-700 border-blue-500"
                        : "text-gray-500 border-gray-200 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50"
                    }
                  `}
                >
                  <History className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Result Card */}
            {result && (
              <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-r from-blue-500 to-purple-500 transform hover:scale-[1.02] transition-transform duration-300">
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <span className="text-sm font-medium text-blue-100">
                        Converted Amount
                      </span>
                      <span className="text-2xl sm:text-3xl font-bold text-white break-all">
                        {getSymbol(toCurrency)} {formatNumber(result.amount)}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <span className="text-sm font-medium text-blue-100">
                        Exchange Rate
                      </span>
                      <div className="flex items-center gap-2 text-white">
                        <TrendingUp className="h-4 w-4 text-blue-200" />
                        <span className="font-medium break-all">
                          {getSymbol(fromCurrency)}1 = {getSymbol(toCurrency)}
                          {formatNumber(result.rate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* History Table */}
            {showHistory && conversionHistory.length > 0 && (
              <div className="rounded-lg border border-gray-100 shadow-xl bg-white/90 backdrop-blur-sm overflow-hidden">
                <div className="border-b p-4 bg-gray-50/50">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Recent Conversions
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-full">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                            From
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                            To
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                            Result
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {conversionHistory.map((entry, index) => (
                          <tr
                            key={index}
                            className="hover:bg-blue-50/50 transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {new Date(entry.timestamp).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {getSymbol(entry.from)} {entry.from}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              {getSymbol(entry.to)} {entry.to}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap text-sm">
                              {getSymbol(entry.from)}{" "}
                              {formatNumber(entry.amount)}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap text-sm font-medium text-blue-600">
                              {getSymbol(entry.to)} {formatNumber(entry.result)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="border-t p-4 bg-gray-50/50">
            <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-gray-600">
              <span>Built by Khaleel Alhaji</span>
              <a
                href="https://github.com/yourusername"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-blue-600 transition-colors"
              >
                <Github className="h-4 w-4" />
                <span>View on GitHub</span>
              </a>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default CurrencyExchange;
