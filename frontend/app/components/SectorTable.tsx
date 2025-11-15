"use client"
import { useReactTable, flexRender, getCoreRowModel, ColumnDef } from "@tanstack/react-table";
import { Sector, Stock } from "../types/portfolio";

const SectorTable = ({ sector, columns }: { sector: Sector, columns: ColumnDef<Stock>[] }) => {
    const table = useReactTable({
        data: sector.stocks || [],
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="mb-6 bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-blue-50 px-6 py-4 border-b">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">{sector.sector}</h2>
                    <div className="flex gap-6 text-sm">
                        <div>
                            <span className="text-gray-600">Investment: </span>
                            <span className="font-semibold text-black">
                                ₹{sector.totalInvestment.toLocaleString('en-IN', {maximumFractionDigits: 2})}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-600">Value: </span>
                            <span className="font-semibold text-black">
                                ₹{sector.presentValue.toLocaleString('en-IN', {maximumFractionDigits: 2})}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-600">Gain/Loss: </span>
                            <span className={`font-semibold ${sector.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₹{sector.gainLoss.toLocaleString('en-IN', {maximumFractionDigits: 2})} ({sector.gainLossPercent.toFixed(2)}%)
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-gray-100">
                        {table.getHeaderGroups().map((hg) => (
                            <tr key={hg.id}>
                                {hg.headers.map((header) => (
                                    <th key={header.id} className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map((row) => (
                            <tr key={row.id} className="border-t hover:bg-gray-50">
                                {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id} className="px-4 py-3 text-sm text-gray-700">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default SectorTable;
