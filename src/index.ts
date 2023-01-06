#!/usr/bin/env node

import axios from 'axios';

const org = process.env.CIRCLECI_ORG;
const repos = process.env.CIRCLECI_REPOS?.split(',');
const circleCiToken = process.env.CIRCLECI_TOKEN;
const ghToken = process.env.GITHUB_TOKEN;

if (
  org === undefined ||
  repos === undefined ||
  circleCiToken === undefined ||
  ghToken === undefined
) {
  throw new Error(
    'Please set CIRCLECI_ORG, CIRCLECI_REPOS, CIRCLE_TOKEN and GITHUB_TOKEN env vars accordingly.'
  );
}

const circleciClient = axios.create({
  baseURL: `https://circleci.com/api/v2/project/gh/${org}`,
  headers: {
    'Circle-Token': circleCiToken,
  },
});

const ghClient = axios.create({
  baseURL: `https://api.github.com/repos/${org}`,
  headers: {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${ghToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
  },
});

(async () => {
  repos.forEach(async repo => {
    const circleCiKeyUrl = `${repo}/checkout-key`;
    const ghKeyUrl = `${repo}/keys`;

    const {ghDeployKeys, circleCiDeployKeys} = await getDeployKeys(
      ghKeyUrl,
      circleCiKeyUrl
    );

    await deleteKeys({
      circleCiKeyUrl,
      ghKeyUrl,
      gitHubDeployKeyIds: ghDeployKeys
        .filter(({key}) => {
          circleCiDeployKeys.find(({public_key}) => key === public_key);
        })
        .map(({id}) => id),
      circleCiCheckoutKeyFingerprints: circleCiDeployKeys.map(
        ({fingerprint}) => fingerprint
      ),
      repo,
    });

    await createCircleCiDeployKey(circleCiKeyUrl, repo);
  });
})();

/**
 * Get all CircleCI deploy keys of current repo
 * and all deploy keys of associated GitHub repo.
 * @link https://circleci.com/docs/api/v2/index.html#operation/listCheckoutKeys
 * @link https://docs.github.com/en/rest/deploy-keys?apiVersion=2022-11-28
 */
async function getDeployKeys(ghKeyUrl: string, circleCiKeyUrl: string) {
  const [
    {data: ghDeployKeys},
    {
      data: {items: circleCiCheckoutKeys},
    },
  ] = await Promise.all([
    ghClient.get<{id: string; key: string}[]>(ghKeyUrl),
    circleciClient.get<{
      items: {
        fingerprint: string;
        public_key: string;
        type: 'deploy-key' | 'user-key';
      }[];
    }>(circleCiKeyUrl),
  ]);

  return {
    circleCiDeployKeys: circleCiCheckoutKeys.filter(
      ({type}) => type === 'deploy-key'
    ),
    ghDeployKeys,
  };
}

/**
 * Delete CircleCI checkout keys and associated GitHub deploy keys.
 */
async function deleteKeys({
  circleCiKeyUrl,
  circleCiCheckoutKeyFingerprints,
  ghKeyUrl,
  gitHubDeployKeyIds,
  repo,
}: {
  circleCiKeyUrl: string;
  circleCiCheckoutKeyFingerprints: string[];
  ghKeyUrl: string;
  gitHubDeployKeyIds: string[];
  repo: string;
}) {
  await Promise.all(
    circleCiCheckoutKeyFingerprints
      .map(fingerprint =>
        circleciClient.delete<{message: string}>(
          `${circleCiKeyUrl}/${fingerprint}`
        )
      )
      .concat(
        gitHubDeployKeyIds.map(id => ghClient.delete(`${ghKeyUrl}/${id}`))
      )
  );

  console.log({
    message: 'Keys deleted.',
    circleCiCheckoutKeyFingerprints,
    gitHubDeployKeyIds,
    repo,
  });
}

async function createCircleCiDeployKey(circleCiKeyUrl: string, repo: string) {
  const {data} = await circleciClient.post(circleCiKeyUrl, {
    type: 'deploy-key',
  });

  console.log({...data, repo, message: 'Checkout key created.'});
}
