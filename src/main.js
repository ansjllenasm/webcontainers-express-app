import "./style.css";
import { files } from "./files";
import { WebContainer } from "@webcontainer/api";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

// ----------------------------
//
//  DOM
//
// ----------------------------

document.querySelector("#app").innerHTML = `
  <div class="container">
    <textarea>Loading...</textarea>
    <iframe src="loading.html"></iframe>
  </div>
  <div class="terminal"></div>
`;

/** @type {HTMLIFrameElement | null} */
const iframeEl = document.querySelector("iframe");

/** @type {HTMLTextAreaElement | null} */
const textareaEl = document.querySelector("textarea");

/** @type {HTMLTextAreaElement | null} */
const terminalEl = document.querySelector(".terminal");

// ----------------------------
//
//  WebContainer
//
// ----------------------------

/** @type {import('@webcontainer/api').WebContainer}  */
let webcontainerInstance;

/** @param {string} content*/
async function writeIndexJS(content) {
  await webcontainerInstance.fs.writeFile("/index.js", content);
}

/**
 * @param {Terminal} terminal
 */
async function startShell(terminal) {
  const shellProcess = await webcontainerInstance.spawn("jsh");
  shellProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      },
    })
  );

  const input = shellProcess.input.getWriter();
  terminal.onData((data) => {
    input.write(data);
  });

  return shellProcess;
}

// -------------------------------
//
//  Entry point
//
// -------------------------------

let timeoutRef;

window.addEventListener("load", async () => {
  textareaEl.value = files["index.js"].file.contents;
  textareaEl.addEventListener("input", (e) => {
    const val = e.currentTarget.value;
    clearTimeout(timeoutRef);
    timeoutRef = setTimeout(() => {
      writeIndexJS(val);
    }, 250);
  });

  const terminal = new Terminal({
    convertEol: true,
  });
  terminal.open(terminalEl);

  // Call only once
  webcontainerInstance = await WebContainer.boot();
  await webcontainerInstance.mount(files);

  // Wait for `server-ready` event
  webcontainerInstance.on("server-ready", (port, url) => {
    iframeEl.src = url;
  });

  startShell(terminal);
});
