import { ethers } from "hardhat";

/**
 * Script deploy DocumentRegistry lên mạng đã cấu hình trong hardhat.config.ts
 *
 * Cách chạy:
 *   Local (Hardhat Network):  npx hardhat run scripts/deploy.ts
 *   Sepolia Testnet:          npx hardhat run scripts/deploy.ts --network sepolia
 */
async function main(): Promise<void> {
    // Lấy danh sách signer từ mạng — signer[0] là tài khoản deploy (admin)
    const [deployer] = await ethers.getSigners();

    console.log("─────────────────────────────────────────────");
    console.log(" D-Cert — Deploying DocumentRegistry");
    console.log("─────────────────────────────────────────────");
    console.log(` Deployer (admin): ${deployer.address}`);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(` Số dư ví:         ${ethers.formatEther(balance)} ETH`);
    console.log("─────────────────────────────────────────────");

    // Lấy ContractFactory đã được compile từ thư mục contracts/
    const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");

    // Deploy — gửi transaction lên mạng
    console.log(" Đang deploy contract...");
    const contract = await DocumentRegistry.deploy();

    // Chờ mạng xác nhận ít nhất 1 block
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
