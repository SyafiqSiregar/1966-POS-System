/**
 * Save text/HTML/Base64 content directly to the User's device via Web API
 * 100% Web-Based (Supabase/Vercel Ready)
 * 
 * @param {string} fileName - e.g. "Rekap_RayaKoffie_kafe_2026-10-03.pdf" or ".xls"
 * @param {string} fileContent - Plain text or Base64 string
 * @param {string} mimeType - e.g. "application/pdf" or "application/vnd.ms-excel"
 * @param {boolean} isBase64 - true if saving binary (like PDF base64)
 * @returns {Promise<{success: boolean, path: string, message: string}>}
 */
export async function saveFileToLocalDevice(fileName, fileContent, mimeType = 'application/vnd.ms-excel', isBase64 = false) {
  try {
    let blob;
    if (isBase64) {
      // Convert Base64 to binary Uint8Array blob
      const byteCharacters = atob(fileContent);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: mimeType });
    } else {
      blob = new Blob([fileContent], { type: `${mimeType};charset=utf-8` });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    return {
      success: true,
      path: `Downloads/${fileName}`,
      message: `File ${fileName} berhasil diunduh ke folder Download!`
    };
  } catch (err) {
    console.error('Gagal mengunduh file:', err);
    throw new Error(`Gagal menyimpan file: ${err.message}`);
  }
}

