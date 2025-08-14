import { keccak256, toHex } from "viem";
import {
  HypersyncClient,
  LogField,
  JoinMode,
  BlockField,
  TransactionField,
} from "@envio-dev/hypersync-client";

// Define ERC-20 Transfer event signature
const event_signatures = ["Transfer(address,address,uint256)"];

// Create topic0 hashes from event signatures
const topic0_list = event_signatures.map((sig) => keccak256(toHex(sig)));

// Initialize Hypersync client
const client = HypersyncClient.new({
  url: "http://polygon.hypersync.xyz",
});

// Define query for Uniswap V3 events
let query = {
  fromBlock: 0,
  logs: [
    {
      // Filter by native USDC (Polygon PoS)
      address: ["0x3c499c542cEF5E3811e1192cE70d8cC03d5c3359"],
      topics: [topic0_list],
    },
  ],
  fieldSelection: {
    // block: [BlockField.Number, BlockField.Timestamp, BlockField.Hash],
    log: [
      // LogField.BlockNumber,
      // LogField.LogIndex,
      // LogField.TransactionIndex,
      // LogField.TransactionHash,
      LogField.Data,
      LogField.Address,
      LogField.Topic0,
      LogField.Topic1,
      LogField.Topic2,
      LogField.Topic3,
    ],
    // transaction: [
    //   TransactionField.From,
    //   TransactionField.To,
    //   TransactionField.Hash,
    //   TransactionField.Value,
    // ],
  },
  joinMode: JoinMode.JoinAll,
};

const main = async () => {
  console.log("Starting Uniswap V3 event scan...");

  let totalEvents = 0;
  const startTime = performance.now();

  // Start streaming events
  const stream = await client.stream(query, {});

  while (true) {
    const res = await stream.recv();

    // Exit if we've reached the end of the chain
    if (res === null) {
      console.log("Reached the tip of the blockchain");
      break;
    }

    // Count total events
    if (res.data && res.data.logs) {
      totalEvents += res.data.logs.length;
    }

    // Update query for next batch
    if (res.nextBlock) {
      query.fromBlock = res.nextBlock;
    }

    // Calculate and print simple progress metrics
    const seconds = (performance.now() - startTime) / 1000;

    console.log(
      `Block ${res.nextBlock} | ${totalEvents} events | ${seconds.toFixed(
        1
      )}s | ${(totalEvents / seconds).toFixed(1)} events/s`
    );
  }

  // Print final results
  const totalTime = (performance.now() - startTime) / 1000;
  console.log(
    `\nScan complete: ${totalEvents} events in ${totalTime.toFixed(1)} seconds`
  );
};

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
