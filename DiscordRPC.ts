import DiscordRPC from "discord-rpc";
import os from "node:os";
import { execSync } from "node:child_process";

const MacOsFormat: Record<string, string> = {
    'darwin': 'MacOS',
    'win32': 'Windows',
    'linux': 'Linux'
}

const SystemOS = MacOsFormat[os.type().toLowerCase()];
const archType = os.arch().toLowerCase();
const macVersion = execSync('sw_vers -productVersion').toString().trim();
const CPU = os.cpus()[0]?.model;


const clientID: string = "1543791636587216968";
const rpc = new DiscordRPC.Client({ transport: "ipc" });

async function setActivity() {
    if (!rpc) return;

    await rpc.setActivity({
        details: `OS: ${SystemOS}`,
        state: `Model: ${CPU}`,
        largeImageKey: "apple_m4",
        largeImageText: `Architeture: ${archType}`,
        smallImageKey: "apple",
        smallImageText: `OS Version ${macVersion}`,
        startTimestamp: Date.now(),
        instance: false,
    });
}

rpc.on("ready", async () => {
    console.log("Logged in as", rpc.user?.username);
    await setActivity();

    setInterval(setActivity, 15000);
});

rpc.login({ clientId: clientID }).catch(console.error);