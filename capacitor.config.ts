import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() ??
  "https://ubifood-livid.vercel.app";

const config: CapacitorConfig = {
  appId: "bo.ubifood.app",
  appName: "UBIFOOD",
  webDir: "capacitor-web",
  backgroundColor: "#f7f4ed",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith("http://"),
        },
      }
    : {}),
};

export default config;
