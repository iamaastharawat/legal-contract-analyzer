import boto3
import urllib.parse
import os
import requests
import json

s3 = boto3.client('s3')
textract = boto3.client('textract')
comprehend = boto3.client('comprehend')

GEMINI_API_KEY = os.environ['GEMINI_API_KEY']

def extract_text_from_pdf(bucket, key):
    response = textract.detect_document_text(
        Document={'S3Object': {'Bucket': bucket, 'Name': key}}
    )
    lines = [block['Text'] for block in response['Blocks'] if block['BlockType'] == 'LINE']
    return '\n'.join(lines)

def analyze_with_comprehend(text):
    entities = comprehend.detect_entities(Text=text, LanguageCode='en')
    phrases = comprehend.detect_key_phrases(Text=text, LanguageCode='en')
    return entities['Entities'], phrases['KeyPhrases']

def summarize_with_gemini(text):
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

    prompt = (
        "You're a legal analyst. Read the following contract and extract clauses like NDA, Termination, "
        "Indemnity, and summarize key legal risks also :\n\n" + text[:10000]
    )

    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }]
    }

    headers = {"Content-Type": "application/json"}
    response = requests.post(url, json=payload, headers=headers)

    try:
        data = response.json()
        print("🔍 Gemini API Response:", json.dumps(data))
        if 'candidates' not in data:
            raise Exception("Missing 'candidates' in Gemini response.")
        return data['candidates'][0]['content']['parts'][0]['text']
    except Exception as e:
        raise Exception(f"Gemini summarization failed: {str(e)}")

def lambda_handler(event, context):
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'])
    filename = key.split('/')[-1].replace('.pdf', '')

    try:
        # 1. Extract text
        text = extract_text_from_pdf(bucket, key)

        # 2. Analyze with AWS Comprehend
        entities, phrases = analyze_with_comprehend(text)

        # 3. Summarize via Gemini
        gemini_summary = summarize_with_gemini(text)

        # 4. Format the report
        report = f"📝 Legal Report for: {key}\n\n"
        report += f"🧠 Summary:\n{gemini_summary}\n\n"
        report += "🔍 Key Entities:\n" + ', '.join(e['Text'] for e in entities[:10]) + "\n\n"
        report += "💡 Key Phrases:\n" + ', '.join(p['Text'] for p in phrases[:10]) + "\n"

        # 5. Save to results/ in S3
        output_key = f"results/{filename}_report.txt"
        s3.put_object(Bucket=bucket, Key=output_key, Body=report.encode('utf-8'))

        return {
            'statusCode': 200,
            'body': f"✅ Report saved as {output_key}"
        }

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': f"Error: {str(e)}"
        }