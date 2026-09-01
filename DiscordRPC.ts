import * as DiscordRPC from "discord-rpc";
import os from "node:os";
import { execSync } from "node:child_process";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const currentPlatform = os.platform();

let systemOS: string | undefined = undefined;
let archType: string | undefined = undefined;
let osVersion: string | undefined = undefined;
let totalRam: string | undefined = undefined;
let modelName: string | undefined = undefined;
let appleChip: string | undefined = undefined;

let largeImageKey: string | undefined;
let smallImageKey: string | undefined;

const AppID = process.env.APP_ID;
if (!AppID) {
    console.error("AppID não encontrado no arquivo .env, por favor, adicione o valor do seu AppID do Discord no arquivo .env");
    console.log();
    process.exit(1);
}
const rpc = new DiscordRPC.Client({ transport: "ipc" });

async function setActivity(): Promise<void> {
    if (!rpc) return;

    switch (currentPlatform) {
        case "darwin": {
            try {
                const getMacModel = execSync(
                    // Executa o comando do terminal do MacOS para obter o modelo do Mac e o chip
                    'system_profiler SPHardwareDataType 2>/dev/null | grep -E "Model Name|Chip"',
                    { encoding: "utf-8", shell: "/bin/bash" }
                );
                const detailedMacModel: Record<string, string> = Object.fromEntries(
                    // Divide a saída em linhas
                    getMacModel.split("\n")
                        // Filtra linhas vazias
                        .filter(Boolean)
                        // Separa os campos
                        .map(line => line.split(":")
                        // Remove espaços em branco
                        .map(field => field.trim()))
                );

                modelName = detailedMacModel["Model Name"];
                appleChip = detailedMacModel["Chip"];
                systemOS = execSync("sw_vers -productName").toString().trim();
                archType = os.arch();
                osVersion = execSync("sw_vers -productVersion").toString().trim();
                totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(0);
                largeImageKey = "apple_m4";
                smallImageKey = "apple";
            } catch {
                systemOS = undefined;
                archType = undefined;
                osVersion = undefined;
                totalRam = undefined;
                modelName = undefined;
                appleChip = undefined;
                largeImageKey = undefined;
                smallImageKey = undefined;
            }
            break;
        }

        case "win32": {
            try {
                systemOS = os.version();
                archType = os.arch();
                osVersion = os.release();
                totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
                largeImageKey = "windows";
                smallImageKey = "microsoft";
            } catch {
                systemOS = undefined;
                archType = undefined;
                osVersion = undefined;
                totalRam = undefined;
                largeImageKey = undefined;
                smallImageKey = undefined;
            }
            break;
        }

        case "linux": {
            try {
                const distroOutput = execSync(
                    'source /etc/os-release && echo "$PRETTY_NAME"',
                    { shell: "/bin/bash", encoding: "utf-8" }
                );
                systemOS = distroOutput.trim();
                archType = os.arch();
                osVersion = os.release();
                totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
                largeImageKey = "linux";
                smallImageKey = undefined;
            } catch {
                systemOS = undefined;
                archType = undefined;
                osVersion = undefined;
                totalRam = undefined;
                largeImageKey = undefined;
                smallImageKey = undefined;
            }
            break;
        }
    }

    if (!systemOS || !archType || !osVersion || !totalRam) {
        console.error("Erro ao obter informações do sistema");
        return;
    }

    await rpc.setActivity({
        details: `OS: ${systemOS}`,
        state: currentPlatform === "darwin" ? `Model: ${modelName} ${appleChip?.replace(/Chip|Apple/g, "").trim()} ${totalRam} GB` : `Total RAM: ${totalRam} GB`,
        largeImageKey: largeImageKey,
        largeImageText: `Architecture: ${archType}`,
        smallImageKey: smallImageKey,
        smallImageText: `OS Version: ${osVersion}`,
        startTimestamp: Math.floor(Date.now() - os.uptime() * 1000),
        instance: false,
    });
}

rpc.on("ready", async () => {
    console.log("Logged in as", rpc.user?.username);
    await setActivity();

    setInterval(setActivity, 15000);
});

rpc.login({ clientId: AppID }).catch(console.error);
