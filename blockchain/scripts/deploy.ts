import "hardhat";
import * as dotenv from "dotenv";
import { ethers, ContractFactory } from "ethers";
import { readFileSync } from "fs";
import { resolve } from "path";

dotenv.config();

/**
 * Script deploy DocumentRegistry lên mạng Sepolia (hoặc local)
 *
 * Cách chạy:
 *   Sepolia: npx hardhat run scripts/deploy.ts --network sepolia
 */
async function main(): Promise<void> {
    // Đọc RPC URL và Private Key từ .env
    const rpcUrl    = process.env.ALCHEMY_RPC_URL;
    const privateKey = process.env.SIGNER_PRIVATE_KEY;

    if (!rpcUrl)     throw new Error("ALCHEMY_RPC_URL chưa được điền trong .env");
    if (!privateKey) throw new Error("SIGNER_PRIVATE_KEY chưa được điền trong .env");

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const deployer  = new ethers.Wallet(privateKey, provider);

    console.log("─────────────────────────────────────────────");
    console.log(" D-Cert — Deploying DocumentRegistry");
    console.log("─────────────────────────────────────────────");
    console.log(` Deployer (admin): ${deployer.address}`);
    const balance = await provider.getBalance(deployer.address);
    console.log(` Số dư ví:         ${ethers.formatEther(balance)} ETH`);
    console.log("─────────────────────────────────────────────");

    // Đọc artifact (ABI + bytecode) do `npx hardhat compile` sinh ra
    const artifactPath = resolve(
        "artifacts/contracts/DocumentRegistry.sol/DocumentRegistry.json"
    );
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));

    console.log(" Đang deploy contract...");
    const factory  = new ContractFactory(artifact.abi, artifact.bytecode, deployer);
    const contract = await factory.deploy();
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();

    console.log(" Deploy thành công!");
    console.log(`\n CONTRACT_ADDRESS = ${contractAddress}\n`);
    console.log(" → Hãy copy địa chỉ trên vào file backend/.env");
    console.log("─────────────────────────────────────────────");
}

main().catch((error: Error) => {
    console.error(error);
    process.exitCode = 1;
});
