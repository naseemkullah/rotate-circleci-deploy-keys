# rotate-circleci-deploy-keys

Deletes and recreates CircleCI (and associated GitHub) deploy keys.

`CIRCLECI_ORG`, `CIRCLECI_REPOS` (comma-separated), `CIRCLE_TOKEN` and `GITHUB_TOKEN` (to clean up associated GitHub deploy keys) env vars must be set.

## Usage

1. Clone this repo.

1. Install by running `npm install --global` from within the root directory.

1. Set the required environment variables.

    ```sh
    export CIRCLECI_ORG=my-org
    export CIRCLECI_REPOS=my-repo1,my-repo2
    export CIRCLECI_TOKEN=my-personal-circleci-token
    export GITHUB_TOKEN=my-personal-github-token
    ```

1. Run `rotate-circleci-deploy-keys`.

Tada! 🎉

## THIS IS NOT AN OFFICIAL CIRCLECI PRODUCT
