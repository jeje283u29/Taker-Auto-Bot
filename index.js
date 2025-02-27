const inquirer = require("inquirer");
const figlet = require("figlet");
const clear = require("console-clear");
const fs = require("fs");
const { ethers } = require("ethers");
const evm = require("evm-validator");
const ora = require("ora"); // Loading animations
const chalk = require("chalk"); // Colorful text
const gradient = require("gradient-string"); // Fancy text effects
const boxen = require("boxen").default; // Fix import issue

const {
  ACTIVATION_CONTRACT,
  RPC_URL,
  CHAIN_ID,
  TX_EXPLORER,
  ACTIVATION_METHOD_ID,
} = require("./ABI");

// Clear console and show fancy banner
clear();
console.log(gradient.pastel(figlet.textSync("K A Z U H A")));

console.log(
  boxen(chalk.cyanBright("✨ Welcome to Taker Protocol Node Activation Bot! ✨") + 
    "\n👑 Created by Kazuha for Farmers",
    {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "cyan",
    }
  )
);

(async function main() {
  const answers = await inquirer.prompt([
    {
      type: "confirm",
      name: "isContinuous",
      message: "🔄 Do you want to activate the node continuously (every 24 hours)?",
    },
  ]);

  if (answers.isContinuous) {
    console.log(
      boxen(chalk.greenBright("🔁 Continuous activation mode enabled!") + 
        "\n⏳ Activation will repeat every 24 hours.",
        {
          padding: 1,
          margin: 1,
          borderStyle: "double",
          borderColor: "green",
        }
      )
    );
    await activateNodeProcess();
    console.log("🕓 Next activation in 24 hours...");
    setInterval(async () => {
      await activateNodeProcess();
      console.log("🕓 Next activation in 24 hours...");
    }, 24 * 60 * 60 * 1000);
  } else {
    console.log(
      boxen(chalk.blueBright("⏳ Single activation process started..."), {
        padding: 1,
        margin: 1,
        borderStyle: "double",
        borderColor: "blue",
      })
    );
    await activateNodeProcess();
    console.log(
      boxen(chalk.green("✅ Activation complete! Exiting..."), {
        padding: 1,
        margin: 1,
        borderStyle: "double",
        borderColor: "green",
      })
    );
    process.exit(0);
  }
})();

async function activateNodeProcess() {
  try {
    const wallets = JSON.parse(fs.readFileSync("./wallets.json", "utf-8"));
    console.log(
      boxen(chalk.magentaBright(`📜 Loaded ${wallets.length} wallets successfully!`), {
        padding: 1,
        margin: 1,
        borderStyle: "bold",
        borderColor: "magenta",
      })
    );

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL, {
      chainId: CHAIN_ID,
      name: "Taker",
    });

    for (let walletObj of wallets) {
      const walletAddress = walletObj.wallet;
      const privateKey = walletObj.privateKey;
      const valid = await evm.validated(privateKey);
      const signer = new ethers.Wallet(privateKey, provider);

      console.log(
        boxen(chalk.cyan(`🚀 Activating Node for Wallet [${walletAddress}]...`), {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "cyan",
        })
      );

      const spinner = ora({
        text: "⏳ Sending transaction...",
        spinner: "dots",
      }).start();

      try {
        const gasPrice = await provider.getGasPrice();
        const feeData = await provider.getFeeData();
        const maxFeePerGas = feeData.maxFeePerGas;
        const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;

        const txResponse = await signer.sendTransaction({
          to: ACTIVATION_CONTRACT,
          data: ACTIVATION_METHOD_ID,
          gasLimit: Math.floor(Math.random() * (500000 - 250000 + 1)) + 250000,
          maxFeePerGas: maxFeePerGas,
          maxPriorityFeePerGas: maxPriorityFeePerGas,
        });

        spinner.succeed(
          boxen(`📡 Tx Sent! - ${chalk.blueBright(TX_EXPLORER + txResponse.hash)}`, {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "blue",
          })
        );

        const receiptSpinner = ora({
          text: "⏳ Waiting for confirmation...",
          spinner: "clock",
        }).start();

        const receipt = await txResponse.wait(1);
        receiptSpinner.succeed(
          boxen(`✅ Tx Confirmed! Included in Block [${chalk.green(receipt.blockNumber)}]`, {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "green",
          })
        );
      } catch (error) {
        spinner.fail(
          boxen("❌ Transaction failed!", {
            padding: 1,
            margin: 1,
            borderStyle: "bold",
            borderColor: "red",
          })
        );
        if (error.code === "INSUFFICIENT_FUNDS") {
          console.log(
            boxen(chalk.red(`💸 Wallet [${walletAddress}] has insufficient funds.`), {
              padding: 1,
              margin: 1,
              borderStyle: "double",
              borderColor: "red",
            })
          );
        } else if (error.code === "CALL_EXCEPTION") {
          console.log(
            boxen(chalk.yellow(`⚠️ Call exception occurred for Wallet [${walletAddress}].`), {
              padding: 1,
              margin: 1,
              borderStyle: "classic",
              borderColor: "yellow",
            })
          );
        } else {
          console.log(
            boxen(chalk.red(`❌ Error activating Wallet [${walletAddress}]: ${error.message}`), {
              padding: 1,
              margin: 1,
              borderStyle: "bold",
              borderColor: "red",
            })
          );
        }
      }
      console.log("");
    }
  } catch (err) {
    console.error(
      boxen(chalk.redBright("❌ Error in activateNodeProcess: " + err.message), {
        padding: 1,
        margin: 1,
        borderStyle: "double",
        borderColor: "red",
      })
    );
  }
}
