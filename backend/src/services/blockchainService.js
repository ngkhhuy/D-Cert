const { ethers } = require('ethers');

const CONTRACT_ABI = [
    'function issueDocument(bytes32 _docHash)',
    'function revokeDocument(bytes32 _docHash)',
    'function verifyDocument(bytes32 _docHash) view returns (bool isValid, address issuer, uint256 timestamp)',
];

const TX_WAIT_TIMEOUT_MS = Number(process.env.TX_WAIT_TIMEOUT_MS || 180000);
const GAS_FEE_MULTIPLIER = BigInt(process.env.GAS_FEE_MULTIPLIER || 2);

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

    if (feeData.maxFeePerGas) {
        overrides.maxFeePerGas = feeData.maxFeePerGas * GAS_FEE_MULTIPLIER;
    }
    if (feeData.maxPriorityFeePerGas) {
        overrides.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * GAS_FEE_MULTIPLIER;
    }
    if (!overrides.maxFeePerGas && feeData.gasPrice) {
        overrides.gasPrice = feeData.gasPrice * GAS_FEE_MULTIPLIER;
    }

    return overrides;
}

const issueOnChain = async (docHash) => {
    const contract = getSignerContract();
    const bytes32Hash = `0x${docHash}`;
    const gasOverrides = await getGasOverrides(contract);

    console.log(`[blockchain] sending issue tx hash=${bytes32Hash}`);
    const tx = await contract.issueDocument(bytes32Hash, gasOverrides);
    console.log(`[blockchain] issue tx sent txHash=${tx.hash}`);

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
    const gasOverrides = await getGasOverrides(contract);

    console.log(`[blockchain] sending revoke tx hash=${bytes32Hash}`);
    const tx = await contract.revokeDocument(bytes32Hash, gasOverrides);
    console.log(`[blockchain] revoke tx sent txHash=${tx.hash}`);

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
