import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";

export async function analyzeSystemData() {
  try {
    const suratRef = collection(db, "suratMasuk");
    const suratSnap = await getDocs(query(suratRef, orderBy("tglSurat", "desc"), limit(10)));
    const suratData = suratSnap.docs.map(d => d.data());

    const response = await fetch('/api/gemini/analyze-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suratData })
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    let summary = "Gagal melakukan analisis otomatis.";
    if (error?.message?.includes("429") || error?.message?.includes("quota") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
      summary = "Kuota API Gemini telah habis. Silakan periksa paket dan detail penagihan Anda di Google AI Studio.";
      console.warn("AI Analysis Quota Exceeded");
    } else {
      console.error("AI Analysis Error:", error);
    }
    return { 
      status: "Yellow", 
      summary: summary, 
      alerts: ["Gagal terhubung ke layanan AI."], 
      recommendations: ["Periksa kuota API key Anda.", "Coba lagi nanti."] 
    };
  }
}
