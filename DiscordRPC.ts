import * as DiscordRPC from "discord-rpc";
import os from "node:os";
import { execSync } from "node:child_process";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const currentPlatform = os.platform();

let systemOS: string | undefined = undefined;
let archType: string | undefined = undefined;
let osVersion: string | undefined = undefined;

let macOsName: string | undefined = undefined;
let modelName: string | undefined = undefined;
let appleChip: string | undefined = undefined;
let totalRAM: string | undefined = undefined;

let largeImageKey: string | undefined;
let smallImageKey: string | undefined;

let ramUsage: string | undefined;

const AppID = process.env.APP_ID;
if (!AppID) {
    console.error("AppID não encontrado no arquivo .env, por favor, adicione o valor do seu AppID do Discord no arquivo .env");
    console.log();
    process.exit(1);
}
const rpc = new DiscordRPC.Client({ transport: "ipc" });

async function setActivity(): Promise<void> {
    if (!rpc) return;

    const total = os.totalmem() / 1024 / 1024 / 1024;
    const free = os.freemem() / 1024 / 1024 / 1024;
    const used = total - free;

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
                const getMacVersion = execSync("sw_vers -productVersion").toString().trim();
                if (getMacVersion.includes("26") || getMacVersion.includes("25")) {
                    macOsName = "Tahoe";
                    largeImageKey = "apple_m4";
                    smallImageKey = "apple";
                }
                systemOS = execSync("sw_vers -productName").toString().trim();
                modelName = detailedMacModel["Model Name"];
                appleChip = detailedMacModel["Chip"];
                archType = os.arch();
                osVersion = execSync("sw_vers -productVersion").toString().trim();
                totalRAM = (os.totalmem() / 1024 / 1024 / 1024).toFixed(0);
            } catch {
                systemOS = undefined;
                archType = undefined;
                osVersion = undefined;
                modelName = undefined;
                appleChip = undefined;
                largeImageKey = undefined;
                smallImageKey = undefined;
                totalRAM = undefined;
            }
            break;
        }

        case "win32": {
            try {
                systemOS = os.version();
                archType = os.arch();
                ramUsage = `${used.toFixed(1)}`;
                osVersion = os.release();
                largeImageKey = "windows";
                smallImageKey = "microsoft";
            } catch {
                systemOS = undefined;
                archType = undefined;
                ramUsage = undefined;
                osVersion = undefined;
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
                ramUsage = `${used.toFixed(1)}`;
                largeImageKey = "linux_mint";
                smallImageKey = "terminal";
            } catch {
                systemOS = undefined;
                archType = undefined;
                ramUsage = undefined;
                osVersion = undefined;
                largeImageKey = undefined;
                smallImageKey = undefined;
            }
            break;
        }
    }

    if (!systemOS || !archType || !osVersion) {
        console.error(`Erro ao obter informações do sistema: ${!systemOS ? "systemOS" : !archType ? "archType" : !osVersion ? "osVersion" : !ramUsage ? "ramUsage" : ""} indefinido.`);
        return;
    }

    await rpc.setActivity({
        details: currentPlatform === "darwin" ? `OS: ${systemOS} ${macOsName}` : currentPlatform === "linux" ? `Distro: ${systemOS}` : `OS: ${systemOS}`,
        state: currentPlatform === "darwin" ? `Model: ${modelName} ${appleChip?.replace(/Chip|Apple/g, "").trim()} ${totalRAM} GB` : `RAM usage: ${ramUsage} GB`,
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
