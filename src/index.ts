import { keccak256, toHex } from "viem";
import {
  HypersyncClient,
  LogField,
  JoinMode,
  BlockField,
  TransactionField,
  TraceField,
  HexOutput,
  DataType,
} from "@envio-dev/hypersync-client";

// Initialize Hypersync client
const client = HypersyncClient.new({
  url: "http://eth-traces.hypersync.xyz",
});

// Define query for ERC-20 Transfer events
let query = {
  fromBlock: 0,
  transactions: [{}],
  fieldSelection: {
    block: [BlockField.Number, BlockField.Timestamp, BlockField.Hash],
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
    transaction: [
      TransactionField.From,
      TransactionField.To,
      TransactionField.Hash,
      TransactionField.Value,
    ],
    trace: [
      TraceField.From,
      TraceField.To,
      TraceField.CallType,
      TraceField.Gas,
      TraceField.Input,
      TraceField.Init,
      TraceField.Value,
      TraceField.Author,
      TraceField.RewardType,
      TraceField.BlockHash,
      TraceField.BlockNumber,
      TraceField.Address,
      TraceField.Code,
      TraceField.GasUsed,
      TraceField.Output,
      TraceField.Subtraces,
      TraceField.TraceAddress,
      TraceField.TransactionHash,
      TraceField.TransactionPosition,
      TraceField.Kind,
      TraceField.Error,
    ],
  },
  joinMode: JoinMode.JoinAll,
};

const main = async () => {
  console.log("Starting trace scan...");

  let totalTraces = 0;
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

    // Count and process traces
    if (res.data && res.data.traces) {
      totalTraces += res.data.traces.length;

      // Print sample trace from this batch
      if (res.data.traces.length > 0) {
        const sampleTrace = res.data.traces[0];
        console.log(`\nSample Trace from Block ${res.nextBlock}:`);
        console.log(`  From: ${sampleTrace.from || "N/A"}`);
        console.log(`  To: ${sampleTrace.to || "N/A"}`);
        console.log(`  CallType: ${sampleTrace.callType || "N/A"}`);
        console.log(`  Gas: ${sampleTrace.gas || "N/A"}`);
        console.log(`  GasUsed: ${sampleTrace.gasUsed || "N/A"}`);
        console.log(`  Value: ${sampleTrace.value || "0"}`);
        console.log(
          `  TransactionHash: ${sampleTrace.transactionHash || "N/A"}`
        );
      }
    }

    // Update query for next batch
    if (res.nextBlock) {
      query.fromBlock = res.nextBlock;
    }

    // Calculate and print simple progress metrics
    const seconds = (performance.now() - startTime) / 1000;

    console.log(
      `Block ${res.nextBlock} | ${totalTraces} traces | ${seconds.toFixed(
        1
      )}s | ${(totalTraces / seconds).toFixed(1)} traces/s`
    );
  }

  // Print final results
  const totalTime = (performance.now() - startTime) / 1000;
  console.log(
    `\nScan complete: ${totalTraces} traces in ${totalTime.toFixed(1)} seconds`
  );
};

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
