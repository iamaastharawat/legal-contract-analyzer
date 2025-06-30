const express = require('express');
const AWS = require('aws-sdk');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(cors());

const REGION = "ap-south-1";
const BUCKET = "legal-contract-uploads";

AWS.config.update({
  region: REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3();

// Upload URL endpoint
app.get('/get-upload-url', async (req, res) => {
  const { filename } = req.query;
  if (!filename) return res.status(400).json({ error: 'Missing filename' });

  const key = `uploads/${filename}`;
  const params = {
    Bucket: BUCKET,
    Key: key,
    Expires: 300,
    ContentType: 'application/pdf'
  };

  try {
    const url = await s3.getSignedUrlPromise('putObject', params);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// Report URL endpoint
app.get('/get-presigned-url', async (req, res) => {
  const fileKey = req.query.key;
  if (!fileKey) return res.status(400).json({ error: 'Missing key' });

  const params = {
    Bucket: BUCKET,
    Key: fileKey,
    Expires: 120
  };

  try {
    const url = await s3.getSignedUrlPromise('getObject', params);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate download URL' });
  }
});

app.listen(4000, () => console.log('Server running at http://localhost:4000'));
