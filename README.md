# Tag List Action

This GitHub action prints a table of tags associated with your repository
ordered chronologically from newest to oldest.  It also highlights those
tags which were created as a part of the current pull request.

## Parameters

| Parameter | Default                            | Required |
|-----------|------------------------------------|----------|
| owner     | context.repo.owner                 | No       |
| repo      | context.payload.repository?.name   | No       | 

Additional values can be set as part of a local run, or defined in the environment.

| Parameter | Value to Set             |
|-----------|--------------------------|
| pr_number | context.payload.number   |
| token     | process.env.GITHUB_TOKEN | 


## Running Locally
To run this GitHub actions locally first install `act` (https://nektosact.com/installation/homebrew.html).

`act` has several methods for simulating the GitHub context used by the Action.

For the `github.event` values, you have to create an `event.json` file at the root of the project and put your event
values in there.  You only really need the values that are being accessed, though.  It does not need to be schema complete.
```json
{
  "pull_request": {
      "head": {
        "ref": "test-pr"
      },
      "base": {
        "ref": "main"
      }
  },
  "repository": {
    "name": "tag-list-action"
  },
  "number": 1
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

Setting the GitHub context is one of the more poorly documented parts of this process.  There are several files which
`act` uses to define the GitHub context.  They are: `.env`, `.input`, `.secrets`, `.vars` and `event.json`, each with
their own flag.  If you run `act` with the `--verbose` flag you can see how values from these files are parsed by `act`
and used inside the action.

What the `act` documentation does not mention is how these environment variables are set.  Some environment variables
cannot be overridden.  Other environment variables are derivatives of other environment variables.  So in particular
if you wanted to override the `github.repository_owner` value in the context, you cannot do so directly.  By default
`act` uses the local git repo URL to set the `GITHUB_REPOSITORY` variable and from that derives the value for the
`GITHUB_REPOSITORY_OWNER` variable, meaning you cannot directly set `GITHUB_REPOSITORY_OWNER` in your dotfiles.

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

The syntax for the GitHub context within the JavaScript environment looks something like this:
```javascript
const Context = {
    payload: {
          pull_request: {
              head: { ref: 'first-commit' },
              base: { ref: 'main' }
          },
          repository: { name: 'component-version-annotation' },
          number: 1
    },
    eventName: 'push',
    sha: '3339c89b34eebb48d2cf13a0f5ee114515ea6d61',
    ref: 'refs/heads/main',
    workflow: 'Commit Message Summaries',
    action: '0',
    actor: 'nektos/act',
    job: 'annotate-pr-local',
    runNumber: 1,
    runId: 1,
    apiUrl: 'https://api.github.com',
    serverUrl: 'https://github.com',
    graphqlUrl: 'https://api.github.com/graphql',
    repo: {
        owner: 'ower_name',
        repo: 'tag-list-action'
    }
}
```

Note: There may be additional properties based on what properties you populate in your `event.json` file.