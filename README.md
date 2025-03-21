# Tag List Action

This GitHub action prints a table of tags associated with your repository
ordered chronologically from newest to oldest.  It also highlights those
tags which were created as a part of the current pull request.

## Running Locally
To run this GitHub actions locally first install `act` (https://nektosact.com/installation/homebrew.html).

`act` has several methods for simulating the GitHub context used by the Action.

For the `github.event` values, you have to create an `event.json` file at the root of the project and put your event
values in there.  You only really need the values that are being accessed, though.  It does not need to be schema complete.
```json
{
  "pull_request": {
      "head": {
        "ref": "for-pr"
      },
      "base": {
        "ref": "main"
      }
  },
  "repository": {
    "name": "PR-metadata-action"
  },
  "number": 911
}

```

Then you have secrets like `secrets.GITHUB_TOKEN`.  For those create a `.secrets` file (after adding that to your
`.gitignore` file) and enter the values the same way you would for a normal `.env` file, as key/value pairs.
```bash
GITHUB_TOKEN=<secret_value>
GITHUB_API_URL:https://api.github.com
GITHUB_BASE_REF:main
GITHUB_EVENT_NAME:pull_request
GITHUB_EVENT_PATH:/var/run/act/workflow/event.json
GITHUB_GRAPHQL_URL:https://api.github.com/graphql
...

```

Now the GitHub root context was the hardest part to figure out.  Those are overridden with environment variables that
`act` parses.  If you run act with the `--verbose` flag it will print those variables out.

This is where I faced the most trouble, because their documentation on this is very sparse.  What they don't mention is
how these environment variables are set.  Some environment variables cannot be overridden.  Other environment variables
are derivatives of other environment variables.  So in particular I wanted to override the `github.repository_owner`
variable, because by default it uses the git repo as that value.  But the syntax of my git repo caused problems, which
means when I made API requests using the value of that variable it fails.  But every time I attempted to override the
`GITHUB_REPOSITORY_OWNER` variable nothing happened.  Until I discovered that it was being derived from `GITHUB_REPOSITORY`.
Once I set that value the other was correct.

So your final command will look something like this:
```bash
# Use NCC to build your package
npx ncc build index.js -o dist

# Run act
act -j 'annotate-pr' --container-architecture linux/amd64 --bind --secret-file .secrets --eventpath event.json --verbose

# Explanations
-j 'step-name' # -j specifies a step to run.  If you want to run the whole workflow you can remove this

--container-architecture <architecture> # What kind of Docker image to use

--bind # This was necessary to allow the container to access your dotfiles

--secret-file .secrets # Specify the name of your secrets file (defaults to .secrets)

--eventpath .event.json # Specify the name of your event file

--env-file .env # Specify the name of your environment file (defaults to .env)

--verbose # Debug logging
```