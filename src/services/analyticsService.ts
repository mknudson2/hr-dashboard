const API_BASE = "http://127.0.0.1:8000";

export async function getAnalytics() {
  const res = await fetch(`${API_BASE}/analytics`);
  return res.json();
}

export type AvgTenureResponse = {
  overall_avg_tenure: number;
  by_cost_center: Record<string, number>;
  by_department: Record<string, number>;
  by_team: Record<string, number>;
  as_of: string;
};

export async function fetchAverageTenure(): Promise<AvgTenureResponse> {
  const res = await fetch(`${API_BASE}/analytics/average-tenure`);
  return res.json();
}

export async function downloadAverageTenureExcel() {
  try {
    const res = await fetch(
      `${API_BASE}/analytics/average-tenure/export/excel`
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Average_Tenure_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    console.error("Excel download failed:", err);
    alert("Failed to download Excel. Check console for details.");
  }
}

export async function downloadAverageTenurePDF() {
  try {
    const res = await fetch(`${API_BASE}/analytics/average-tenure/export/pdf`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Average_Tenure_${
      new Date().toISOString().split("T")[0]
    }.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    console.error("PDF download failed:", err);
    alert("Failed to download PDF. Check console for details.");
  }
}

export type PtoUtilResponse = {
  by_department: Record<string, number>;
  by_cost_center: Record<string, number>;
  by_team: Record<string, number>;
  as_of: string;
};

export async function fetchPtoUtilization(): Promise<PtoUtilResponse> {
  const res = await fetch(`${API_BASE}/analytics/pto-utilization`);
  return res.json();
}
