import { defineConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const ALCHEMY_RPC_URL   = process.env.ALCHEMY_RPC_URL   || "";
const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY || "";

export default defineConfig({
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200, // Tối ưu cho contract được gọi thường xuyên
      },
    },
  },
  networks: {
    // Ethereum Sepolia Testnet
    sepolia: {
      type:     "http",
      url:      ALCHEMY_RPC_URL,
      accounts: SIGNER_PRIVATE_KEY ? [SIGNER_PRIVATE_KEY] : [],
      chainId:  11155111,
    },
  },
});

