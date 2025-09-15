


import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { OverlayPanel } from "primereact/overlaypanel";
import { InputText } from "primereact/inputtext";

interface Artwork {
  id: number;
  title: string;
  place_of_origin: string;
  artist_display: string;
  inscriptions: string;
  date_start: number;
  date_end: number;
}

const API_URL = "https://api.artic.edu/api/v1/artworks";
const PAGE_LIMIT = 12;

const Table: React.FC = () => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [selectedRows, setSelectedRows] = useState<{ [key: number]: boolean }>({});
  const [page, setPage] = useState<number>(1);
  const [rowsToSelect, setRowsToSelect] = useState<string>("");

  const op = useRef<OverlayPanel>(null);

  // fetch the data
  const fetchData = async (pageNum: number = 1) => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL, {
        params: { page: pageNum, limit: PAGE_LIMIT },
      });
      setArtworks(res.data.data);
      setTotalRecords(res.data.pagination.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page);
  }, [page]);

  const onPageChange = (event: any) => {
    setPage(event.page + 1);
  };

  // select N rows across pages
  const selectNRowsAcrossPages = async (select: boolean) => {
    let totalNeeded = parseInt(rowsToSelect, 10);
    if (isNaN(totalNeeded) || totalNeeded <= 0) return;

    let collected: Artwork[] = [];

    const takeFromCurrent = Math.min(totalNeeded, artworks.length);
    collected = [...artworks.slice(0, takeFromCurrent)];
    totalNeeded -= takeFromCurrent;

    let nextPage = page + 1;
    while (totalNeeded > 0) {
      try {
        const res = await axios.get(API_URL, {
          params: { page: nextPage, limit: PAGE_LIMIT },
        });
        const rows: Artwork[] = res.data.data;

        if (rows.length === 0) break;

        const take = Math.min(totalNeeded, rows.length);
        collected = [...collected, ...rows.slice(0, take)];
        totalNeeded -= take;
        nextPage++;
      } catch (err) {
        console.error("Failed fetching page", nextPage, err);
        break;
      }
    }

    // update selection state
    setSelectedRows((prev) => {
      const next = { ...prev };
      for (const r of collected) {
        next[r.id] = select;
      }
      return next;
    });

    setRowsToSelect("");
    op.current?.hide();
  };

  return (
    <div>
      <DataTable
        value={artworks}
        paginator
        rows={PAGE_LIMIT}
        totalRecords={totalRecords}
        lazy
        first={(page - 1) * PAGE_LIMIT}
        onPage={onPageChange}
        loading={loading}
        dataKey="id"
        selection={artworks.filter((a) => selectedRows[a.id])}
        onSelectionChange={(e) => {
          const updated: { [key: number]: boolean } = {};
          for (const row of e.value as Artwork[]) {
            updated[row.id] = true;
          }
          setSelectedRows(updated);
        }}
        selectionMode="multiple" 
      >
        <Column
          selectionMode="multiple"
          header={
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <OverlayPanel ref={op}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    padding: "6px",
                  }}
                >
                  <InputText
                    placeholder="Enter number..."
                    value={rowsToSelect}
                    onChange={(e) => setRowsToSelect(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <Button
                      label="Select"
                      onClick={() => selectNRowsAcrossPages(true)}
                    />
                    <Button
                      label="Deselect"
                      severity="danger"
                      onClick={() => selectNRowsAcrossPages(false)}
                    />
                  </div>
                </div>
              </OverlayPanel>
            </div>
          }
        />
        <Column
          header={
            <Button
              icon="pi pi-chevron-down"
              className="p-button-text p-button-sm"
              onClick={(e) => op.current?.toggle(e)}
            />
          }
        />
        <Column field="title" header="Title" />
        <Column field="place_of_origin" header="Origin" />
        <Column field="artist_display" header="Artist" />
        <Column field="inscriptions" header="Inscriptions" />
        <Column field="date_start" header="Start Date" />
        <Column field="date_end" header="End Date" />
      </DataTable>
    </div>
  );
};

export default Table;
