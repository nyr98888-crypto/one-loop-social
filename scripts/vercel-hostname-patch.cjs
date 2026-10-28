/** Patch Hebrew Windows hostname so undici headers stay Latin1-safe. */
const os = require("os");
os.hostname = () => "desktop";
