import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface BrandedPDFOptions {
  title: string;
  subtitle?: string;
  date?: string;
}

export async function exportToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#000000',
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

export function addBrandedHeader(doc: jsPDF, options: BrandedPDFOptions) {
  const { title, subtitle, date } = options;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Green banner background
  doc.setFillColor(5, 150, 105); // emerald-600
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // White logo circle
  doc.setFillColor(255, 255, 255);
  doc.circle(25, 20, 15, 'F');
  
  // Logo text placeholder (or image if available)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(5, 150, 105);
  doc.text('IPNU', 25, 22, { align: 'center' });
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('PC IPNU KABUPATEN CIREBON', 45, 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Sekretariat: Gedung PCNU Kab. Cirebon - Jl. Raden Dewi Sartika No.45 Sumber', 45, 28);
  
  // Report Title Section
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 55);
  
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(subtitle, 14, 62);
  }
  
  if (date) {
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(`Dicetak: ${date}`, pageWidth - 14, 55, { align: 'right' });
  }
  
  // Decorative line
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.5);
  doc.line(14, 68, pageWidth - 14, 68);
  
  return 75; // Return Y offset where table should start
}

export const LOGO_IPNU = "https://res.cloudinary.com/dxsbefd16/image/upload/q_auto/f_auto/v1775653459/Logo_IPNU_IPPNU_Terbaru_Format_PNG_5_ipvipj.png";
export const LOGO_IPPNU = "https://res.cloudinary.com/dxsbefd16/image/upload/q_auto/f_auto/v1775653459/LOGO_RESMI_IPPNU_hnyblz.png";

export async function generateMemberCard(member: any) {
  const isIPPNU = member.jenisKelamin === 'Perempuan' || member.organisasi === 'IPPNU';
  const orgName = isIPPNU ? 'IPPNU' : 'IPNU';
  const orgFullName = isIPPNU ? 'IKATAN PELAJAR PUTRI NAHDLATUL ULAMA' : 'IKATAN PELAJAR NAHDLATUL ULAMA';
  const orgLogo = isIPPNU ? LOGO_IPPNU : LOGO_IPNU;
  const primaryColor = isIPPNU ? '#1d4ed8' : '#059669';
  const secondaryColor = isIPPNU ? '#1e3a8a' : '#064e3b';
  const accentColor = '#fbbf24';

  const frontId = 'temp-member-card-front';
  const backId = 'temp-member-card-back';

  const frontContainer = document.createElement('div');
  frontContainer.id = frontId;
  frontContainer.style.position = 'fixed';
  frontContainer.style.left = '-9999px';
  frontContainer.style.top = '0';
  frontContainer.style.width = '500px';
  frontContainer.style.height = '300px';
  frontContainer.style.backgroundColor = secondaryColor;
  frontContainer.style.color = 'white';
  frontContainer.style.fontFamily = 'sans-serif';
  frontContainer.style.padding = '0';
  frontContainer.style.borderRadius = '15px';
  frontContainer.style.overflow = 'hidden';
  frontContainer.style.display = 'flex';
  frontContainer.style.flexDirection = 'column';

  frontContainer.innerHTML = `
    <div style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 70%, ${accentColor} 100%); padding: 20px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
      <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: rgba(251, 191, 36, 0.2); border-radius: 50%; z-index: 0;"></div>
      <div style="position: absolute; bottom: 40px; right: -30px; width: 80px; height: 80px; background: rgba(255, 255, 255, 0.05); border-radius: 50%; z-index: 0;"></div>
      <div style="position: absolute; top: 50%; left: -20px; width: 40px; height: 40px; background: rgba(251, 191, 36, 0.1); border-radius: 50%; z-index: 0;"></div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; z-index: 1;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 45px; height: 45px; background: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; padding: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
             <img src="${orgLogo}" style="width: 100%; height: auto;" crossorigin="anonymous" />
          </div>
          <div>
            <h2 style="margin: 0; font-size: 18px; font-weight: 900; letter-spacing: 1px; color: ${accentColor}; text-shadow: 1px 1px 2px rgba(0,0,0,0.3);">KARTU TANDA ANGGOTA</h2>
            <p style="margin: 0; font-size: 9px; color: white; font-weight: 700; letter-spacing: 1px; opacity: 0.9;">${orgName} KABUPATEN CIREBON</p>
          </div>
        </div>
        <div style="background: white; padding: 4px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=NIA:${member.nomorIndukAnggota}|NAMA:${member.namaLengkap}" style="width: 45px; height: 45px;" />
        </div>
      </div>

      <div style="display: flex; gap: 25px; align-items: center; z-index: 1; margin: 15px 0;">
        <div style="width: 105px; height: 135px; border-radius: 12px; overflow: hidden; border: 4px solid ${accentColor}; background: #f3f4f6; box-shadow: 0 8px 15px rgba(0,0,0,0.2);">
          ${member.fotoUrl ? `<img src="${member.fotoUrl}" style="width: 100%; height: 100%; object-fit: cover;" crossorigin="anonymous" />` : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 45px;"> </div>`}
        </div>
        <div style="flex: 1;">
          <div style="margin-bottom: 10px;">
            <p style="margin: 0; font-size: 8px; color: ${accentColor}; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Nama Lengkap</p>
            <p style="margin: 0; font-size: 18px; font-weight: 900; color: white; text-transform: uppercase; line-height: 1.1;">${member.namaLengkap}</p>
          </div>
          <div style="margin-bottom: 10px;">
            <p style="margin: 0; font-size: 8px; color: ${accentColor}; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Nomor Induk Anggota (NIA)</p>
            <p style="margin: 0; font-size: 15px; font-weight: 800; color: white; font-family: monospace; background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; display: inline-block;">${member.nomorIndukAnggota || '-'}</p>
          </div>
          <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 10px;">
            <div>
              <p style="margin: 0; font-size: 8px; color: ${accentColor}; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Tempat, Tgl Lahir</p>
              <p style="margin: 0; font-size: 10px; font-weight: 700; color: white;">${member.tempatLahir}, ${member.tanggalLahir}</p>
            </div>
            <div>
              <p style="margin: 0; font-size: 8px; color: ${accentColor}; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Domisili</p>
              <p style="margin: 0; font-size: 10px; font-weight: 700; color: white;">${member.domisili}</p>
            </div>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; z-index: 1; border-top: 2px solid ${accentColor}; padding-top: 10px; margin-top: 5px;">
        <div>
          <p style="margin: 0; font-size: 8px; color: ${accentColor}; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Status Pimpinan</p>
          <p style="margin: 0; font-size: 11px; font-weight: 900; color: white;">${member.statusPimpinan}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 9px; font-style: italic; color: ${accentColor}; font-weight: 700;">BELAJAR, BERJUANG, BERTAQWA</p>
        </div>
      </div>
    </div>
  `;

  const backContainer = document.createElement('div');
  backContainer.id = backId;
  backContainer.style.position = 'fixed';
  backContainer.style.left = '-9999px';
  backContainer.style.top = '0';
  backContainer.style.width = '500px';
  backContainer.style.height = '300px';
  backContainer.style.backgroundColor = 'white';
  backContainer.style.color = secondaryColor;
  backContainer.style.fontFamily = 'sans-serif';
  backContainer.style.padding = '0';
  backContainer.style.borderRadius = '15px';
  backContainer.style.border = '1px solid #e5e7eb';
  backContainer.style.display = 'flex';
  backContainer.style.flexDirection = 'column';
  backContainer.style.overflow = 'hidden';

  backContainer.innerHTML = `
    <div style="height: 100%; display: flex; flex-direction: column; position: relative;">
      <div style="height: 15px; background: linear-gradient(to right, ${primaryColor}, ${accentColor});"></div>
      
      <div style="padding: 25px; flex: 1; display: flex; flex-direction: column; justify-content: center;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 900; text-transform: uppercase; color: ${secondaryColor}; border-bottom: 3px solid ${accentColor}; display: inline-block; padding-bottom: 5px;">Aturan Dasar Pelajar Nahdlatul Ulama</h3>
        </div>
        
        <div style="font-size: 10px; line-height: 1.6; color: #374151;">
          <p style="margin: 0 0 12px 0; font-weight: 900; color: ${primaryColor}; text-align: center; font-size: 11px; letter-spacing: 1px;">MOTTO: BELAJAR, BERJUANG, BERTAQWA</p>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="background: #f0fdf4; padding: 10px; border-radius: 10px; border-left: 4px solid ${primaryColor};">
              <p style="margin: 0 0 8px 0; font-weight: 900; text-transform: uppercase; font-size: 9px; color: ${secondaryColor};">Panca Khidmat ${orgName}:</p>
              <ol style="margin: 0; padding-left: 18px; font-weight: 600;">
                <li>Khidmat Pendidikan & Kaderisasi</li>
                <li>Khidmat Organisasi & Administrasi</li>
                <li>Khidmat Dakwah & Sosial</li>
                <li>Khidmat Ekonomi & Kewirausahaan</li>
                <li>Khidmat Budaya & Olahraga</li>
              </ol>
            </div>
            <div style="background: #fffbeb; padding: 10px; border-radius: 10px; border-left: 4px solid ${accentColor};">
              <p style="margin: 0 0 8px 0; font-weight: 900; text-transform: uppercase; font-size: 9px; color: #92400e;">Kewajiban Anggota:</p>
              <ul style="margin: 0; padding-left: 18px; font-weight: 600;">
                <li>Menjaga nama baik organisasi</li>
                <li>Aktif dalam kegiatan organisasi</li>
                <li>Mentaati PD/PRT ${orgName}</li>
                <li>Menjunjung tinggi nilai ASWAJA</li>
              </ul>
            </div>
          </div>
          
          <div style="margin-top: 25px; text-align: center; border-top: 1px dashed #d1d5db; padding-top: 15px;">
            <p style="margin: 0; font-size: 8px; font-weight: 800; color: ${secondaryColor}; text-transform: uppercase; letter-spacing: 1px;">Diterbitkan oleh Pimpinan Cabang ${orgName} Kabupaten Cirebon</p>
            <p style="margin: 4px 0 0 0; font-size: 8px; font-weight: 700; color: #6b7280;">Sistem Informasi CORE (Commissariat Roadshow & Excellent)</p>
          </div>
        </div>
      </div>
      
      <div style="height: 15px; background: linear-gradient(to right, ${accentColor}, ${primaryColor});"></div>
    </div>
  `;

  document.body.appendChild(frontContainer);
  document.body.appendChild(backContainer);

  try {
    const frontCanvas = await html2canvas(frontContainer, { scale: 2, useCORS: true });
    const backCanvas = await html2canvas(backContainer, { scale: 2, useCORS: true });

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [500, 300]
    });

    pdf.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 0, 0, 500, 300);
    pdf.addPage([500, 300], 'landscape');
    pdf.addImage(backCanvas.toDataURL('image/png'), 'PNG', 0, 0, 500, 300);
    pdf.save(`KTA_${member.namaLengkap.replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    document.body.removeChild(frontContainer);
    document.body.removeChild(backContainer);
  }
}
