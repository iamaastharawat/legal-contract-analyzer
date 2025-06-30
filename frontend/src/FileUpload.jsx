import React, { useState } from 'react';
import './App.css';

function FileUpload() {
  const [file, setFile] = useState(null);
  const [report, setReport] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setReport('');
  };

  const sanitizeBaseName = (filename) => {
    return filename
      .replace(/\.[^/.]+$/, '')        // remove extension
      .replace(/\s+/g, '')             // remove spaces
      .replace(/[^a-zA-Z0-9_-]/g, ''); // remove special chars
  };

  // 🔁 Retry logic: Try fetching the report with delay
  const fetchReportWithRetry = async (url, maxRetries = 8, interval = 2500) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          return await res.text();
        } else {
          console.log(`Attempt ${attempt}: Report not ready yet.`);
        }
      } catch (err) {
        console.warn(`Attempt ${attempt} failed:`, err);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error('Report not available after multiple attempts.');
  };

  const uploadFile = async () => {
    if (!file) return alert('Please choose a file');
    setUploading(true);

    try {
      // 1. Request signed upload URL
      const encodedName = encodeURIComponent(file.name);
      const uploadRes = await fetch(`http://localhost:4000/get-upload-url?filename=${encodedName}`);
      const { url: uploadUrl } = await uploadRes.json();

      // 2. Upload file to S3
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error('Upload failed');

      // 3. Construct report key and get pre-signed download URL
      const baseName = sanitizeBaseName(file.name);
      const reportKey = `results/${baseName}_report.txt`;
      const encodedKey = encodeURIComponent(reportKey);

      const presignedRes = await fetch(`http://localhost:4000/get-presigned-url?key=${encodedKey}`);
      const { url: reportUrl } = await presignedRes.json();

      // 4. Try downloading the report with retry
      const text = await fetchReportWithRetry(reportUrl);
      setReport(text);
    } catch (err) {
      console.error("❌ Upload or analysis failed:", err);
      alert('Upload or analysis failed. Please check console.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card">
      <h1>Legal Contract Analyzer</h1>
      <p>Upload a contract PDF to get an instant AI-generated legal analysis.</p>

      <div className="file-button-row">
        <input type="file" id="fileInput" accept="application/pdf" onChange={handleFileChange} />
        <label htmlFor="fileInput" className="choose-btn">
          {file ? file.name : 'Choose File'}
        </label>
        <button onClick={uploadFile} disabled={uploading || !file} className="upload-btn">
          {uploading ? "Uploading & Analyzing..." : "Upload & Analyze"}
        </button>
      </div>

      {report && (
        <div className="report-box">
          <h3>Report:</h3>
          <pre>{report}</pre>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
