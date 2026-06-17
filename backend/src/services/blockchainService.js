const { ethers } = require('ethers');

const CONTRACT_ABI = [
    'function issueDocument(bytes32 _docHash)',
    'function revokeDocument(bytes32 _docHash)',
    'function verifyDocument(bytes32 _docHash) view returns (bool isValid, address issuer, uint256 timestamp)',
];

const TX_WAIT_TIMEOUT_MS = Number(process.env.TX_WAIT_TIMEOUT_MS || 180000);
const GAS_FEE_MULTIPLIER = BigInt(process.env.GAS_FEE_MULTIPLIER || 2);
const WAIT_FOR_CHAIN_CONFIRMATION = process.env.WAIT_FOR_CHAIN_CONFIRMATION !== 'false';
const MIN_PRIORITY_FEE_GWEI = process.env.MIN_PRIORITY_FEE_GWEI || '2';
const MIN_MAX_FEE_GWEI = process.env.MIN_MAX_FEE_GWEI || '30';

const withTimeout = (promise, ms, label) => Promise.race([
    promise,
    new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`${label} quá thời gian chờ ${Math.round(ms / 1000)} giây`)), ms);
    }),
]);

function assertBlockchainEnv() {
    if (!process.env.ALCHEMY_RPC_URL) throw new Error('Thiếu ALCHEMY_RPC_URL');
    if (!process.env.SIGNER_PRIVATE_KEY) throw new Error('Thiếu SIGNER_PRIVATE_KEY');
    if (!process.env.CONTRACT_ADDRESS) throw new Error('Thiếu CONTRACT_ADDRESS');
}

function getProvider() {
    assertBlockchainEnv();
    return new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL);
}

function getSignerContract() {
    const provider = getProvider();
    const signer = new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY, provider);
    return new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

function getReadonlyContract() {
    const provider = getProvider();
    return new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

async function getGasOverrides(contract) {
    const feeData = await contract.runner.provider.getFeeData();
    const overrides = {};
    const minPriorityFee = ethers.parseUnits(MIN_PRIORITY_FEE_GWEI, 'gwei');
    const minMaxFee = ethers.parseUnits(MIN_MAX_FEE_GWEI, 'gwei');
    const maxBigInt = (...values) => values.reduce((max, value) => (value > max ? value : max), 0n);

    if (feeData.maxFeePerGas) {
        overrides.maxFeePerGas = maxBigInt(
            feeData.maxFeePerGas * GAS_FEE_MULTIPLIER,
            minMaxFee
        );
    }
    if (feeData.maxPriorityFeePerGas) {
        overrides.maxPriorityFeePerGas = maxBigInt(
            feeData.maxPriorityFeePerGas * GAS_FEE_MULTIPLIER,
            minPriorityFee
        );
    }
    if (overrides.maxPriorityFeePerGas && overrides.maxFeePerGas) {
        overrides.maxFeePerGas = maxBigInt(
            overrides.maxFeePerGas,
            overrides.maxPriorityFeePerGas * 2n
        );
    }
    if (!overrides.maxFeePerGas && !overrides.maxPriorityFeePerGas && feeData.gasPrice) {
        overrides.gasPrice = maxBigInt(
            feeData.gasPrice * GAS_FEE_MULTIPLIER,
            minMaxFee
        );
    }

    console.log('[blockchain] gas overrides', Object.fromEntries(
        Object.entries(overrides).map(([key, value]) => [key, ethers.formatUnits(value, 'gwei')])
    ));

    return overrides;
}

async function assertNonceReady(contract) {
    const signer = contract.runner;
    const provider = signer.provider;
    const address = await signer.getAddress();
    const [latestNonce, pendingNonce] = await Promise.all([
        provider.getTransactionCount(address, 'latest'),
        provider.getTransactionCount(address, 'pending'),
    ]);

    if (pendingNonce > latestNonce) {
        throw new Error(`Ví ký đang có transaction pending (latestNonce=${latestNonce}, pendingNonce=${pendingNonce}). Vui lòng chờ hoặc clear nonce trước khi ký tiếp.`);
    }
}

const issueOnChain = async (docHash) => {
    const contract = getSignerContract();
    const bytes32Hash = `0x${docHash}`;
    await assertNonceReady(contract);
    const gasOverrides = await getGasOverrides(contract);

    console.log(`[blockchain] sending issue tx hash=${bytes32Hash}`);
    const tx = await contract.issueDocument(bytes32Hash, gasOverrides);
    console.log(`[blockchain] issue tx sent txHash=${tx.hash}`);

    if (!WAIT_FOR_CHAIN_CONFIRMATION) {
        console.log(`[blockchain] issue tx broadcast only txHash=${tx.hash}`);
        return tx.hash;
    }

    const receipt = await withTimeout(
        tx.wait(),
        TX_WAIT_TIMEOUT_MS,
        `Chờ xác nhận transaction issue ${tx.hash}`
    );
    console.log(`[blockchain] issue tx confirmed txHash=${receipt.hash || tx.hash} block=${receipt.blockNumber}`);

    return receipt.hash || tx.hash;
};

const revokeOnChain = async (docHash) => {
    const contract = getSignerContract();
    const bytes32Hash = `0x${docHash}`;
    await assertNonceReady(contract);
    const gasOverrides = await getGasOverrides(contract);

    console.log(`[blockchain] sending revoke tx hash=${bytes32Hash}`);
    const tx = await contract.revokeDocument(bytes32Hash, gasOverrides);
    console.log(`[blockchain] revoke tx sent txHash=${tx.hash}`);

    if (!WAIT_FOR_CHAIN_CONFIRMATION) {
        console.log(`[blockchain] revoke tx broadcast only txHash=${tx.hash}`);
        return tx.hash;
    }

    const receipt = await withTimeout(
        tx.wait(),
        TX_WAIT_TIMEOUT_MS,
        `Chờ xác nhận transaction revoke ${tx.hash}`
    );
    console.log(`[blockchain] revoke tx confirmed txHash=${receipt.hash || tx.hash} block=${receipt.blockNumber}`);

    return receipt.hash || tx.hash;
};

const verifyOnChain = async (docHash) => {
    const contract = getReadonlyContract();
    const bytes32Hash = `0x${docHash}`;
    const [isValid, issuer, timestamp] = await contract.verifyDocument(bytes32Hash);
    return {
        isValid,
        issuer,
        issuedAt: timestamp > 0n ? new Date(Number(timestamp) * 1000).toISOString() : null,
    };
};

module.exports = { issueOnChain, revokeOnChain, verifyOnChain };
