const { execSync } = require("child_process");
const out = execSync('git show HEAD:public/js/app.js', { encoding: "utf8", maxBuffer: 10*1024*1024 });
const lines = out.split("\n");
lines.forEach((l,i) => { if (l.includes("act-chevron") || l.includes("fase-flecha")) console.log(i+1, JSON.stringify(l)); });
