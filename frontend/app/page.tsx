"use client";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { Stock, Sector } from "./types/portfolio";
import { useEffect, useState } from "react";
import SectorTable from "./components/SectorTable";

export default function Home() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  const fetchPortfolio = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/portfolio");
      const response = await res.json();
      setSectors(response.data); // ✅ Extract .data
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setLoading(false);
    }
  };

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:4000/api/portfolio/stream')

     const loadingTimeout = setTimeout(() => {
    setLoading(false);
    setError("Taking longer than expected. Please wait...");
  }, 5000);

    eventSource.onopen = ()=> {
      setConnectionStatus('connected');
      console.log("SSE connection opened")
    }

    eventSource.onmessage = (event)=> {
      clearTimeout(loadingTimeout)
      try {
        const response = JSON.parse(event.data);
        if(response.success){
          setSectors(response.data);
          setLastUpdate(new Date())
          setLoading(false)
          setError(null)
        }
        else {
          setError(response.error);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
        setError('Error parsing server data');
      }
    }

    eventSource.onerror = (error)=> {
      clearTimeout(loadingTimeout)
      console.error('SSE error:', error);
      setConnectionStatus("disconnected")
      setError("Connection lost. Retrying...")
    }
    // fetchPortfolio();
    return () => {
      clearTimeout(loadingTimeout);
      eventSource.close();
    }
  }, []);

  const columns: ColumnDef<Stock>[] = [
    {
      accessorKey: "name",
      header: "Particulars",
      cell: (info) => (
        <span className="font-medium">{info.getValue() as string}</span>
      ),
    },
    {
      accessorKey: "purchasePrice",
      header: "Purchase Price",
      cell: (info) => `₹${(info.getValue() as number).toFixed(2)}`,
    },
    {
      accessorKey: "qty",
      header: "Qty",
    },
    {
      accessorKey: "investment",
      header: "Investment",
      cell: (info) =>
        `₹${(info.getValue() as number).toLocaleString("en-IN", {
          maximumFractionDigits: 2,
        })}`,
    },
    {
      accessorKey: "portfolioPercentage",
      header: "Portfolio %",
      cell: (info) => `${(info.getValue() as number).toFixed(2)}%`,
    },
    {
      accessorKey: "symbol",
      header: "NSE/BSE",
      cell: (info) => (info.getValue() as string).replace(".NS", ""),
    },
    {
      accessorKey: "cmp",
      header: "CMP",
      cell: (info) => `₹${(info.getValue() as number).toFixed(2)}`,
    },
    {
      accessorKey: "presentValue",
      header: "Present Value",
      cell: (info) =>
        `₹${(info.getValue() as number).toLocaleString("en-IN", {
          maximumFractionDigits: 2,
        })}`,
    },
    {
      accessorKey: "gainLoss",
      header: "Gain/Loss",
      cell: (info) => {
        const value = info.getValue() as number;
        const percent = info.row.original.gainLossPercent;
        return (
          <span
            className={
              value >= 0
                ? "text-green-600 font-semibold"
                : "text-red-600 font-semibold"
            }
          >
            ₹{value.toLocaleString("en-IN", { maximumFractionDigits: 2 })} (
            {percent.toFixed(2)}%)
          </span>
        );
      },
    },
    {
      accessorKey: "pe",
      header: "P/E Ratio",
      cell: (info) => {
        const value = info.getValue();
        return value && value !== "#N/A"
          ? typeof value === "number"
            ? value.toFixed(2)
            : value
          : "N/A";
      },
    },
    {
      accessorKey: "latestEarnings",
      header: "Latest Earnings",
      cell: (info) => {
        const value = info.getValue();
        return value && value !== "#N/A"
          ? typeof value === "number"
            ? `₹${value.toFixed(2)}`
            : value
          : "N/A";
      },
    },
  ];

  const totalInvestment = sectors.reduce(
    (sum, s) => sum + s.totalInvestment,
    0
  );
  const totalPresentValue = sectors.reduce((sum, s) => sum + s.presentValue, 0);
  const totalGainLoss = sectors.reduce((sum, s) => sum + s.gainLoss, 0);

   if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Connecting to live data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Portfolio Dashboard
          </h1>
          <div className="flex justify-between items-center">
            <p className="text-gray-600">Real-time portfolio tracking</p>
             <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 ${connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm">{connectionStatus}</span>
              </div>
              <p className="text-sm text-gray-500">Last updated: {lastUpdate.toLocaleTimeString()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Total Investment</p>
            <p className="text-2xl font-bold text-gray-900">
              ₹
              {totalInvestment.toLocaleString("en-IN", {
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Current Value</p>
            <p className="text-2xl font-bold text-gray-900">
              ₹
              {totalPresentValue.toLocaleString("en-IN", {
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-1">Total Gain/Loss</p>
            <p
              className={`text-2xl font-bold ${
                totalGainLoss >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              ₹
              {totalGainLoss.toLocaleString("en-IN", {
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        {sectors.map((sector, index) => (
          <SectorTable key={index} sector={sector} columns={columns} />
        ))}
      </div>
    </div>
  );
}
