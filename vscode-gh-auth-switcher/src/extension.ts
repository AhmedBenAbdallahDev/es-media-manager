import * as vscode from "vscode";
import * as cp from "child_process";
import { promisify } from "util";

const exec = promisify(cp.exec);

interface AccountConfig {
  name: string;
  email: string;
}

interface AccountMapping {
  [key: string]: AccountConfig;
}

let statusBarItem: vscode.StatusBarItem;
let startupPollTimer: NodeJS.Timeout | null = null;
let currentStatus: {
  owner: string | null;
  auth: string | null;
  gitName: string | null;
  gitEmail: string | null;
  match: boolean;
  message?: string;
} = {
  owner: null,
  auth: null,
  gitName: null,
  gitEmail: null,
  match: false,
};

export async function activate(context: vscode.ExtensionContext) {
  console.log("GitHub Auth Switcher: Activating...");

  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = "gh-auth-switcher.switchNow";
  statusBarItem.text = "$(sync) Auth: Initializing...";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("gh-auth-switcher.switchNow", switchNow),
    vscode.commands.registerCommand(
      "gh-auth-switcher.showStatus",
      showStatus
    )
  );

  // Start polling
  startPolling();

  // Listen for workspace folder changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders((_) => {
      stopPolling();
      startPolling();
    })
  );
}

function startPolling() {
  const config = vscode.workspace.getConfiguration("ghAuthSwitcher");
  const interval = config.get<number>("pollInterval", 60000);

  // Run once immediately on startup.
  void checkAndSwitch(false).then(() => {
    // If everything already matches, stop. Otherwise, run one delayed verification.
    if (!currentStatus.match) {
      startupPollTimer = setTimeout(() => {
        void checkAndSwitch(false);
        stopPolling();
      }, interval);
    }
  });
}

function stopPolling() {
  if (startupPollTimer) {
    clearTimeout(startupPollTimer);
    startupPollTimer = null;
  }
}

async function checkAndSwitch(isManual: boolean) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    statusBarItem.text = "$(circle-slash) Auth: No repo";
    statusBarItem.show();
    currentStatus = {
      owner: null,
      auth: null,
      gitName: null,
      gitEmail: null,
      match: false,
      message: "No workspace folder open",
    };
    updateStatusBar();
    return;
  }

  const repoPath = workspaceFolder.uri.fsPath;

  try {
    const owner = await getRepoOwner(repoPath);
    if (!owner) {
      currentStatus = {
        owner: null,
        auth: await getCurrentAuth(),
        gitName: await getGitConfig(repoPath, "user.name"),
        gitEmail: await getGitConfig(repoPath, "user.email"),
        match: false,
        message: "Not a GitHub repo or missing origin",
      };
      updateStatusBar();
      return;
    }

    const config = vscode.workspace.getConfiguration("ghAuthSwitcher");
    const enableNotifications = config.get<boolean>("enableNotifications", true);
    const mapping = config.get<AccountMapping>("accountMapping", {
      AhmedBenAbdallahDev: {
        name: "AhmedBenAbdallahDev",
        email: "celiandorra@gmail.com",
      },
      Celiandorra: {
        name: "Celiandorra",
        email: "dorrabenabdallah13@gmail.com",
      },
      LanayruLakeDev: {
        name: "LanayruLakeDev",
        email: "LanayruLakeDev@email.com",
      },
    });

    if (!mapping[owner]) {
      currentStatus = {
        owner,
        auth: await getCurrentAuth(),
        gitName: await getGitConfig(repoPath, "user.name"),
        gitEmail: await getGitConfig(repoPath, "user.email"),
        match: false,
        message: `No mapping configured for owner "${owner}"`,
      };
      updateStatusBar();
      if (isManual) {
        vscode.window.showWarningMessage(
          `GitHub Auth Switcher: No account mapping for repo owner "${owner}"`
        );
      }
      return;
    }

    const account = mapping[owner];
    let currentAuth = await getCurrentAuth();
    let currentGitName = await getGitConfig(repoPath, "user.name");
    let currentGitEmail = await getGitConfig(repoPath, "user.email");

    // Switch if needed
    if (
      currentAuth !== owner ||
      currentGitName !== account.name ||
      currentGitEmail !== account.email
    ) {
      await switchAuth(owner, account, repoPath);
      currentAuth = await getCurrentAuth();
      currentGitName = await getGitConfig(repoPath, "user.name");
      currentGitEmail = await getGitConfig(repoPath, "user.email");
      if (enableNotifications || isManual) {
        vscode.window.showInformationMessage(
          `GitHub Auth Switched: ${owner} (${account.email})`
        );
      }
    }

    currentStatus = {
      owner,
      auth: currentAuth,
      gitName: currentGitName,
      gitEmail: currentGitEmail,
      match:
        owner === currentAuth &&
        currentGitName === account.name &&
        currentGitEmail === account.email,
    };
    updateStatusBar();
  } catch (error) {
    console.error("Auth Switcher Error:", error);
    currentStatus = {
      owner: null,
      auth: null,
      gitName: null,
      gitEmail: null,
      match: false,
      message: error instanceof Error ? error.message : String(error),
    };
    updateStatusBar();
    if (isManual) {
      vscode.window.showErrorMessage(
        `GitHub Auth Switcher: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

async function getRepoOwner(repoPath: string): Promise<string | null> {
  try {
    const { stdout } = await exec('git config --get remote.origin.url', {
      cwd: repoPath,
    });
    const url = stdout.trim();

    // Parse owner from URL
    // https://github.com/OWNER/repo.git or git@github.com:OWNER/repo.git
    const match = url.match(/(?:https:\/\/github\.com\/|git@github\.com:)([^/]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function getCurrentAuth(): Promise<string | null> {
  try {
    // Most robust source: gh API returns the currently active auth account login.
    const { stdout } = await exec("gh api user --jq .login");
    const login = stdout.trim();
    return login.length > 0 ? login : null;
  } catch {
    // Fallback parser for environments where API command is unavailable.
    try {
      const { stdout } = await exec("gh auth status --active --hostname github.com");
      const match = stdout.match(/Logged in to github\.com account (\S+)/);
      return match?.[1] ?? null;
    } catch {
      return null;
    }
  }
}

async function getGitConfig(
  repoPath: string,
  key: string
): Promise<string | null> {
  try {
    const { stdout } = await exec(`git config ${key}`, { cwd: repoPath });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function switchAuth(
  owner: string,
  account: AccountConfig,
  repoPath: string
) {
  // Switch GitHub CLI auth
  await exec(`gh auth switch -u ${owner}`);

  // Switch git config (local to repo)
  await exec(`git config user.name "${account.name}"`, { cwd: repoPath });
  await exec(`git config user.email "${account.email}"`, { cwd: repoPath });
}

async function switchNow() {
  await checkAndSwitch(true);
  await showStatus();
}

async function showStatus() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showInformationMessage("No workspace folder open");
    return;
  }

  const repoPath = workspaceFolder.uri.fsPath;
  const owner = await getRepoOwner(repoPath);
  const auth = await getCurrentAuth();
  const gitName = await getGitConfig(repoPath, "user.name");
  const gitEmail = await getGitConfig(repoPath, "user.email");

  const status = `
Repo Owner: ${owner || "Unknown"}
GitHub CLI Auth: ${auth || "Not authenticated"}
Git User: ${gitName || "Not set"}
Git Email: ${gitEmail || "Not set"}
Match: ${owner === auth && !!gitName && !!gitEmail ? "✅ Yes" : "❌ No"}
  `.trim();

  vscode.window.showInformationMessage(status);
}

function updateStatusBar() {
  const icon = currentStatus.match ? "$(check)" : "$(alert)";
  const ownerLabel = currentStatus.owner ?? "No repo";
  statusBarItem.text = `${icon} Auth: ${ownerLabel}`;
  statusBarItem.show();

  const tooltip = new vscode.MarkdownString(
    [
      `**Repo Owner:** ${currentStatus.owner ?? "Unknown"}`,
      `**GitHub CLI Auth:** ${currentStatus.auth ?? "Not authenticated"}`,
      `**Git User:** ${currentStatus.gitName ?? "Not set"}`,
      `**Git Email:** ${currentStatus.gitEmail ?? "Not set"}`,
      `**Match:** ${currentStatus.match ? "✅ Yes" : "❌ No"}`,
      currentStatus.message ? `**Note:** ${currentStatus.message}` : "",
      "",
      "Click the status bar item to re-check and apply immediately.",
      "Use **GitHub Auth: Show Status** from the Command Palette for a popup summary.",
    ]
      .filter(Boolean)
      .join("\n\n")
  );
  tooltip.isTrusted = false;
  statusBarItem.tooltip = tooltip;
}

export function deactivate() {
  stopPolling();
  statusBarItem.dispose();
}

