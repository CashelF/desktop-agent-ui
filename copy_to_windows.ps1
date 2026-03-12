$source = "\\wsl.localhost\Ubuntu\home\cashel\projects\desktop-agent-ui"
$target = "C:\Users\cpfit\Projects\desktop-agent-ui"

New-Item -ItemType Directory -Force -Path $target | Out-Null

robocopy $source $target /E /XD node_modules __pycache__ .git
