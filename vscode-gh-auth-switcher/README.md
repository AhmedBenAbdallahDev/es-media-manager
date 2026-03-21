# GitHub Auth Auto-Switcher

Automatically switch GitHub CLI authentication and git config based on the current repository owner. Never accidentally commit with the wrong account again!

## Features

✅ **Auto-switches GitHub CLI auth** based on repo owner
✅ **Auto-switches git config** (user.name, user.email) 
✅ **Polls every minute** (configurable)
✅ **Status bar indicator** shows current auth status
✅ **Prevents auth mismatches** between gh CLI and git config
✅ **Easy manual switch** with command palette

## Setup

1. Install the extension (or load as dev extension)
2. Configure your account mappings in VS Code settings:

```json
"ghAuthSwitcher.accountMapping": {
  "AhmedBenAbdallahDev": {
    "name": "AhmedBenAbdallahDev",
    "email": "celiandorra@gmail.com"
  },
  "Celiandorra": {
    "name": "Celiandorra",
    "email": "dorrabenabdallah13@gmail.com"
  },
  "LanayruLakeDev": {
    "name": "LanayruLakeDev",
    "email": "LanayruLakeDev@email.com"
  }
}
```

3. Make sure you have all accounts authenticated in GitHub CLI:
```bash
gh auth login  # Add each account
```

## Commands

- **GitHub Auth: Switch Account Now** - Force immediate auth check/switch
- **GitHub Auth: Show Status** - Display current auth status

## Settings

- `ghAuthSwitcher.pollInterval` - Poll interval in milliseconds (default: 60000 = 1 minute)
- `ghAuthSwitcher.accountMapping` - Map of GitHub account login to git name/email

## How It Works

1. When you open a workspace, the extension checks the git remote origin
2. It extracts the repo owner from the URL
3. It looks up the owner in your account mapping
4. If auth or git config doesn't match, it automatically switches both
5. It continues to poll at your configured interval

## Requirements

- VS Code 1.95.0+
- GitHub CLI (`gh`) installed and authenticated with all accounts
- Git configured with your accounts

## License

MIT
