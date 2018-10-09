const octokit = require("@octokit/rest")();

// Allow octokit to act as our account
octokit.authenticate({
  type: "token",
  token: process.env.GITHUB_TOKEN,
});

/**
 * Assign an issue to a user after he commented "/request"
 * @param {object} event AWS event object
 */
module.exports.webhook = async event => {
  // If this is not an issue comment event, do nothing.
  const type = event.headers["X-GitHub-Event"];
  if (type !== "issue_comment") {
    return respond("Incorrect event type.");
  }

  // Extract a few useful things from the payload
  const body = JSON.parse(event.body);
  const labels = body.issue.labels;
  const issueNumber = body.issue.number;
  const repoName = body.repository.name;
  const repoOwner = body.repository.owner.login;
  const commentAuthor = body.comment.user.login;
  const commentBody = body.comment.body;

  // If it's not a /request comment
  if (!commentBody.includes('/request')) {
    return respond("Not a relevant comment.");
  }

  // If it's already assigned, inform the user and do nothing.
  const isAssigned = labels.find(({ name }) => name === "assigned");
  if (isAssigned) {
    await octokit.issues.createComment({
      repo: repoName,
      owner: repoOwner,
      number: issueNumber,
      body: `Sorry @${commentAuthor}, this issue is already assigned.`,
    });

    return respond("This issue is already assigned.");
  }

  // Else apply new labels and inform the user
  await Promise.all([
    octokit.issues.replaceAllLabels({
      repo: repoName,
      owner: repoOwner,
      number: issueNumber,
      labels: ["assigned", `assignee:${commentAuthor}`],
    }),
    octokit.issues.createComment({
      repo: repoName,
      owner: repoOwner,
      number: issueNumber,
      body: `Hey @${commentAuthor}, this issue is all yours.`,
    }),
  ]);

  return respond("The issue was assigned.");
};

/**
 * Generate a response
 * @param {any} payload 
 * @param {number?} statusCode 
 */
function respond(payload, statusCode = 200) {
  return {
    statusCode,
    body: JSON.stringify({ payload })
  };
}
