## ⚙️ Project Setup

Follow these steps to set up **Frontend**, **Backend**, and **AWS Lambda** for the Legal Contract Analyzer:


###  **1. Clone Repository**

```bash
git clone https://github.com/YOUR_USERNAME/legal-contract-analyzer.git
cd legal-contract-analyzer

2. Setup Frontend
cd frontend
npm install
npm run dev

3. Setup Backend
bash
Copy
Edit
cd ../backend
npm install
node server.js

4. Deploy AWS Lambda Function

Go to AWS Lambda Console
Create a new function
Paste code from:

lambda/lambda_function.py

Add environment variable:

Key	               Value
GEMINI_API_KEY	your Gemini API key

Attach IAM policies:

AmazonTextractFullAccess
ComprehendFullAccess
AmazonS3FullAccess

Set trigger from S3 upload

Prefix: uploads/

5. Setup Environment Variables for Backend
Create a .env file inside your backend folder with:
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY