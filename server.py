"""
Voice Live Pricing Calculator – Flask server.
Serves static files, proxies Azure Retail Prices API (CORS workaround),
handles Entra ID auth validation, and persists reports to Azure Blob Storage.
"""

import os
import json
import time
import uuid
import logging

import jwt
import requests
from flask import Flask, request, jsonify, send_from_directory, abort
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential

app = Flask(__name__, static_folder='.', static_url_path='')

# ── Config from environment ──
TENANT_ID = os.environ.get('AZURE_TENANT_ID', '')
CLIENT_ID = os.environ.get('AZURE_CLIENT_ID', '')
STORAGE_ACCOUNT_NAME = os.environ.get('AZURE_STORAGE_ACCOUNT_NAME', '')
REPORTS_CONTAINER = os.environ.get('REPORTS_CONTAINER', 'reports')

# ── JWKS cache ──
_jwks_cache = {'keys': None, 'fetched_at': 0}


def _get_jwks():
    if _jwks_cache['keys'] and (time.time() - _jwks_cache['fetched_at'] < 3600):
        return _jwks_cache['keys']
    oidc_url = f'https://login.microsoftonline.com/{TENANT_ID}/v2.0/.well-known/openid-configuration'
    oidc = requests.get(oidc_url, timeout=10).json()
    jwks = requests.get(oidc['jwks_uri'], timeout=10).json()
    _jwks_cache['keys'] = jwks['keys']
    _jwks_cache['fetched_at'] = time.time()
    return _jwks_cache['keys']


def _validate_token():
    """Validate the Bearer token from the Authorization header. Returns decoded claims."""
    if not TENANT_ID or not CLIENT_ID:
        abort(401, 'Auth not configured')
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        abort(401, 'Missing token')
    token = auth_header[7:]
    jwks_keys = _get_jwks()

    # Decode header to find the right key
    unverified = jwt.get_unverified_header(token)
    kid = unverified.get('kid')
    key = None
    for k in jwks_keys:
        if k['kid'] == kid:
            key = jwt.algorithms.RSAAlgorithm.from_jwk(k)
            break
    if not key:
        abort(401, 'Unknown signing key')

    try:
        claims = jwt.decode(
            token, key, algorithms=['RS256'],
            audience=f'api://{CLIENT_ID}',
            issuer=f'https://login.microsoftonline.com/{TENANT_ID}/v2.0'
        )
        return claims
    except jwt.InvalidTokenError as e:
        logging.warning('Token validation failed: %s', e)
        abort(401, 'Invalid token')


def _get_blob_client():
    credential = DefaultAzureCredential()
    account_url = f'https://{STORAGE_ACCOUNT_NAME}.blob.core.windows.net'
    return BlobServiceClient(account_url, credential=credential)


# ── Static files ──
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


# ── Auth config endpoint (so client knows client ID / authority) ──
@app.route('/api/auth/config')
def auth_config():
    if not CLIENT_ID or not TENANT_ID:
        return jsonify({}), 404
    return jsonify({
        'clientId': CLIENT_ID,
        'authority': f'https://login.microsoftonline.com/{TENANT_ID}'
    })


# ── Azure Retail Prices proxy ──
@app.route('/api/retail/prices')
def proxy_prices():
    target = 'https://prices.azure.com/api/retail/prices?' + request.query_string.decode()
    try:
        resp = requests.get(target, timeout=30, headers={'Accept': 'application/json'})
        return (resp.content, resp.status_code, {'Content-Type': 'application/json'})
    except Exception as e:
        return jsonify({'error': str(e)}), 502


# ── Reports CRUD ──
@app.route('/api/reports', methods=['GET'])
def list_reports():
    claims = _validate_token()
    user_id = claims.get('oid', claims.get('sub', 'unknown'))
    try:
        blob_service = _get_blob_client()
        container = blob_service.get_container_client(REPORTS_CONTAINER)
        reports = []
        for blob in container.list_blobs(name_starts_with=f'{user_id}/'):
            data = container.get_blob_client(blob.name).download_blob().readall()
            report = json.loads(data)
            report['id'] = blob.name.split('/')[-1].replace('.json', '')
            reports.append(report)
        reports.sort(key=lambda r: r.get('savedAt', ''), reverse=True)
        return jsonify(reports)
    except Exception as e:
        logging.error('List reports error: %s', e)
        return jsonify([])


@app.route('/api/reports', methods=['POST'])
def save_report():
    claims = _validate_token()
    user_id = claims.get('oid', claims.get('sub', 'unknown'))
    report = request.get_json()
    if not report:
        return jsonify({'error': 'No data'}), 400

    report_id = str(uuid.uuid4())
    blob_name = f'{user_id}/{report_id}.json'
    try:
        blob_service = _get_blob_client()
        container = blob_service.get_container_client(REPORTS_CONTAINER)
        container.get_blob_client(blob_name).upload_blob(
            json.dumps(report), content_type='application/json'
        )
        return jsonify({'id': report_id}), 201
    except Exception as e:
        logging.error('Save report error: %s', e)
        return jsonify({'error': 'Save failed'}), 500


@app.route('/api/reports/<report_id>', methods=['DELETE'])
def delete_report(report_id):
    claims = _validate_token()
    user_id = claims.get('oid', claims.get('sub', 'unknown'))
    blob_name = f'{user_id}/{report_id}.json'
    try:
        blob_service = _get_blob_client()
        container = blob_service.get_container_client(REPORTS_CONTAINER)
        container.get_blob_client(blob_name).delete_blob()
        return jsonify({'deleted': True})
    except Exception as e:
        logging.error('Delete report error: %s', e)
        return jsonify({'error': 'Delete failed'}), 500


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=True)

