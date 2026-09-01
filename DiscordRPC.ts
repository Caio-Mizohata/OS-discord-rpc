import DiscordRPC from "discord-rpc";
import os from "node:os";
import { execSync } from "node:child_process";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

// const platformFormat: Record<string, string> = {
//   darwin: "macOS",
//   win32: "Windows",
//   linux: "Linux",
// };

const currentPlatform = os.platform();
const SystemOS = os.version();
const archType = os.arch();
const CPU = os.cpus()[0]?.model?.trim();
const OsVersion = os.release();
const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);


let osDetailedVersion: string | undefined;
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
                osDetailedVersion = execSync("sw_vers -productVersion").toString().trim();
                largeImageKey = "apple_m4";
                smallImageKey = "apple";
            } catch {
                osDetailedVersion = os.release();
                largeImageKey = undefined;
                smallImageKey = undefined;
            }
            break;
        }

        case "win32": {
            try {
                osDetailedVersion = os.release();
                largeImageKey = "windows";
                smallImageKey = "microsoft";
            } catch {
                osDetailedVersion = os.release();
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
                osDetailedVersion = distroOutput.trim();
            } catch {
                osDetailedVersion = os.release();
                largeImageKey = undefined;
                smallImageKey = undefined;
            }
            break;
        }
    }

    await rpc.setActivity({
        details: `OS: ${SystemOS}`,
        state: `Total RAM: ${totalRam} GB`,
        largeImageKey: largeImageKey,
        largeImageText: `Architecture: ${archType}`,
        smallImageKey: smallImageKey,
        smallImageText: `OS Version: ${OsVersion}`,
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
