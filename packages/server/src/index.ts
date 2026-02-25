import "dotenv/config";
import * as readline from "node:readline";
import { Assistant } from "./agent.ts";

const assistant = new Assistant();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function printWelcome() {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║      🌍 旅伴 - AI旅行规划师          ║");
  console.log("╠══════════════════════════════════════╣");
  console.log("║  功能：                               ║");
  console.log("║  • 目的地推荐与天气查询               ║");
  console.log("║  • 景点推荐与行程规划                 ║");
  console.log("║  • 旅行预算估算                       ║");
  console.log("║  • 签证/交通/美食等建议               ║");
  console.log("╠══════════════════════════════════════╣");
  console.log("║  输入 /clear 清除对话历史             ║");
  console.log("║  输入 /exit  退出程序                 ║");
  console.log("╚══════════════════════════════════════╝\n");
}

function prompt() {
  rl.question("👤 你: ", async (input) => {
    const trimmed = input.trim();

    if (!trimmed) {
      prompt();
      return;
    }

    if (trimmed === "/exit" || trimmed === "/quit") {
      console.log("\n👋 再见！\n");
      rl.close();
      process.exit(0);
    }

    if (trimmed === "/clear") {
      assistant.clearHistory();
      console.log("✅ 对话历史已清除\n");
      prompt();
      return;
    }

    try {
      process.stdout.write("🤖 助手: ");
      const reply = await assistant.chat(trimmed);
      console.log(reply);
      console.log();
    } catch (error: any) {
      console.error(`\n❌ 错误: ${error.message}\n`);
      if (error.message?.includes("API key")) {
        console.log("💡 提示：请在 .env 文件中配置 OPENAI_API_KEY\n");
      }
    }

    prompt();
  });
}

printWelcome();
prompt();
