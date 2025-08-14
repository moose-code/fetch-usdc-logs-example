import { keccak256, toHex } from "viem";
import {
  HypersyncClient,
  LogField,
  JoinMode,
  BlockField,
  TransactionField,
  HexOutput,
  DataType,
  Decoder,
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
  console.log("Starting ERC-20 Transfer event scan...");

  // Create decoder outside the loop for better performance
  const decoder = Decoder.fromSignatures([
    "Transfer(address indexed from, address indexed to, uint256 value)",
  ]);

  let totalEvents = 0;
  let totalValue = BigInt(0);
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

    // Count total events and decode
    if (res.data && res.data.logs) {
      totalEvents += res.data.logs.length;

      // Decode logs
      const decodedLogs = await decoder.decodeLogs(res.data.logs);

      // Track if we've printed an event for this batch
      let printedEventThisBatch = false;

      // Process Transfer events
      for (const decoded of decodedLogs) {
        if (!decoded) continue;
        try {
          const from = decoded.indexed[0]?.val?.toString() || "unknown";
          const to = decoded.indexed[1]?.val?.toString() || "unknown";
          const value = (decoded.body[0]?.val as bigint) ?? BigInt(0);

          totalValue += value;

          if (!printedEventThisBatch) {
            console.log(
              "\nSample Transfer Event from Block " + res.nextBlock + ":"
            );
            console.log(`  From: ${from}`);
            console.log(`  To: ${to}`);
            console.log(`  Value: ${value.toString()}`);
            printedEventThisBatch = true;
          }
        } catch (error: any) {
          console.log(
            "Error processing transfer event:",
            error?.message ?? error
          );
        }
      }
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
  console.log(`Total Value (sum of transfers): ${totalValue.toString()}`);
};

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
