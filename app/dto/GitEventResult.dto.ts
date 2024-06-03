import { z } from 'zod'

const CommitAuthorSchema = z.object({
  name: z.string().nullish(),
  email: z.string().nullish(),
  username: z.string().nullish(),
})

const CommitSchema = z.object({
  id: z.string().nullish(),
  message: z.string().nullish(),
  url: z.string().nullish(),
  author: CommitAuthorSchema.nullish(),
  committer: CommitAuthorSchema.nullish(),
  verification: z.any().nullish(),
  timestamp: z.string().nullish(),
  added: z.array(z.string()).nullish(),
  removed: z.array(z.string()).nullish(),
  modified: z.array(z.string()).nullish(),
})

const RepositoryOwnerSchema = z.object({
  id: z.number().nullish(),
  login: z.string().nullish(),
  login_name: z.string().nullish(),
  full_name: z.string().nullish(),
  email: z.string().nullish(),
  avatar_url: z.string().nullish(),
  language: z.string().nullish(),
  is_admin: z.boolean().nullish(),
  last_login: z.string().nullish(),
  created: z.string().nullish(),
  restricted: z.boolean().nullish(),
  active: z.boolean().nullish(),
  prohibit_login: z.boolean().nullish(),
  location: z.string().nullish(),
  website: z.string().nullish(),
  description: z.string().nullish(),
  visibility: z.string().nullish(),
  followers_count: z.number().nullish(),
  following_count: z.number().nullish(),
  starred_repos_count: z.number().nullish(),
  username: z.string().nullish(),
})

const RepositorySchema = z.object({
  id: z.number(),
  owner: RepositoryOwnerSchema.nullish(),
  name: z.string(),
  full_name: z.string(),
  description: z.string().nullish(),
  empty: z.boolean().nullish(),
  private: z.boolean().nullish(),
  fork: z.boolean().nullish(),
  template: z.boolean().nullish(),
  parent: z.any().nullish(),
  mirror: z.boolean().nullish(),
  size: z.number().nullish(),
  language: z.string().nullish(),
  languages_url: z.string().nullish(),
  html_url: z.string().nullish(),
  url: z.string().nullish(),
  link: z.string().nullish(),
  ssh_url: z.string().nullish(),
  clone_url: z.string().nullish(),
  original_url: z.string().nullish(),
  website: z.string().nullish(),
  stars_count: z.number().nullish(),
  forks_count: z.number().nullish(),
  watchers_count: z.number().nullish(),
  open_issues_count: z.number().nullish(),
  open_pr_counter: z.number().nullish(),
  release_counter: z.number().nullish(),
  default_branch: z.string(),
  archived: z.boolean().nullish(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  archived_at: z.string().nullish(),
  permissions: z
    .object({
      admin: z.boolean().nullish(),
      push: z.boolean().nullish(),
      pull: z.boolean().nullish(),
    })
    .nullish(),
  has_issues: z.boolean().nullish(),
  internal_tracker: z
    .object({
      enable_time_tracker: z.boolean().nullish(),
      allow_only_contributors_to_track_time: z.boolean().nullish(),
      enable_issue_dependencies: z.boolean().nullish(),
    })
    .nullish(),
  has_wiki: z.boolean().nullish(),
  has_pull_requests: z.boolean().nullish(),
  has_projects: z.boolean().nullish(),
  has_releases: z.boolean().nullish(),
  has_packages: z.boolean().nullish(),
  has_actions: z.boolean().nullish(),
  ignore_whitespace_conflicts: z.boolean().nullish(),
  allow_merge_commits: z.boolean().nullish(),
  allow_rebase: z.boolean().nullish(),
  allow_rebase_explicit: z.boolean().nullish(),
  allow_squash_merge: z.boolean().nullish(),
  allow_rebase_update: z.boolean().nullish(),
  default_delete_branch_after_merge: z.boolean().nullish(),
  default_merge_style: z.string().nullish(),
  default_allow_maintainer_edit: z.boolean().nullish(),
  avatar_url: z.string().nullish(),
  internal: z.boolean().nullish(),
  mirror_interval: z.string().nullish(),
  mirror_updated: z.string().nullish(),
  repo_transfer: z.any().nullish(),
})

const UserSchema = z.object({
  id: z.number().nullish(),
  login: z.string().nullish(),
  login_name: z.string().nullish(),
  full_name: z.string().nullish(),
  email: z.string().nullish(),
  avatar_url: z.string().nullish(),
  language: z.string().nullish(),
  is_admin: z.boolean().nullish(),
  last_login: z.string().nullish(),
  created: z.string().nullish(),
  restricted: z.boolean().nullish(),
  active: z.boolean().nullish(),
  prohibit_login: z.boolean().nullish(),
  location: z.string().nullish(),
  website: z.string().nullish(),
  description: z.string().nullish(),
  visibility: z.string().nullish(),
  followers_count: z.number().nullish(),
  following_count: z.number().nullish(),
  starred_repos_count: z.number().nullish(),
  username: z.string().nullish(),
})

export const GitEventResultSchema = z.object({
  ref: z.string().nullish(),
  before: z.string().nullish(),
  after: z.string().nullish(),
  compare_url: z.string().nullish(),
  commits: z.array(CommitSchema).nullish(),
  total_commits: z.number().nullish(),
  head_commit: CommitSchema.nullish(),
  repository: RepositorySchema,
  pusher: UserSchema.nullish(),
  sender: UserSchema.nullish(),
})

export type GitEventResultDto = z.infer<typeof GitEventResultSchema>
