const fs = require('fs');
const path = require('path');

const PINATA_ENDPOINT = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

const getJwt = () => process.env.PINATA_JWT || process.env.PINATA_API_JWT || '';

const isConfigured = () => Boolean(getJwt());

/**
 * Upload a PDF to Pinata/IPFS when credentials are configured.
 * Returns null in local-only mode so the core Web2/Web3 flow can still run.
 */
const uploadFile = async (filePath, name = path.basename(filePath)) => {
    if (!isConfigured()) return null;
    if (!fs.existsSync(filePath)) {
        throw new Error(`Không tìm thấy file để upload IPFS: ${filePath}`);
    }

    const blob = await fs.openAsBlob(filePath, { type: 'application/pdf' });
    const form = new FormData();
    form.append('file', blob, name);
    form.append('pinataMetadata', JSON.stringify({ name }));

    const res = await fetch(PINATA_ENDPOINT, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${getJwt()}`,
        },
        body: form,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error?.reason || data.error || data.message || 'Upload IPFS thất bại');
    }

    return data.IpfsHash;
};

module.exports = { isConfigured, uploadFile };
