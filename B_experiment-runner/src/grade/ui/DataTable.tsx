import React, { useMemo, useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table.tsx";

interface Props {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground/50 italic select-none">null</span>;
  }
  if (typeof value === "number") {
    return <span className="tabular-nums">{value}</span>;
  }
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return (
    <span className="max-w-[280px] truncate block" title={text}>
      {text}
    </span>
  );
}

export function DataTable({ columns: columnNames, rows, rowCount, truncated }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      columnNames.map((name) => ({
        accessorKey: name,
        header: ({ column }) => {
          const sorted = column.getIsSorted();
          return (
            <button
              type="button"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors -ml-1 px-1 py-0.5 rounded"
              onClick={() => column.toggleSorting(sorted === "asc")}
            >
              {name}
              <span className={`text-[9px] ${sorted ? "text-foreground" : "text-muted-foreground/40"}`}>
                {sorted === "asc" ? "\u25B2" : sorted === "desc" ? "\u25BC" : "\u25B2"}
              </span>
            </button>
          );
        },
        cell: ({ getValue }) => <CellValue value={getValue()} />,
      })),
    [columnNames],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (columnNames.length === 0) {
    return (
      <div className="text-muted-foreground text-xs py-4 text-center">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="rounded-lg border bg-card text-[12px] font-mono">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b-border/70 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-8 text-[11px] font-medium text-muted-foreground">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row, i) => (
                <TableRow
                  key={row.id}
                  className={`border-0 ${i % 2 === 1 ? "bg-muted/30" : ""}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-[5px] px-2 text-[12px]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-14 text-center text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-[11px] text-muted-foreground tabular-nums">
        {truncated
          ? `${rows.length} of ${rowCount} rows shown`
          : `${rowCount} row${rowCount !== 1 ? "s" : ""}`}
      </p>
    </div>
  );
}
