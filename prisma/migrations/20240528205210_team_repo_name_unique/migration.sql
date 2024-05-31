WITH DuplicateRows AS (
  SELECT
    id_team,
    team_repo_name,
    ROW_NUMBER() OVER (PARTITION BY team_repo_name ORDER BY id_team) AS row_num
	FROM team
)

UPDATE team
JOIN DuplicateRows ON team.id_team = DuplicateRows.id_team
SET team.team_repo_name = CONCAT(team.team_repo_name, '_', DuplicateRows.row_num)
WHERE DuplicateRows.row_num > 1;

-- CreateIndex
CREATE UNIQUE INDEX `team_repo_name` ON `team`(`team_repo_name`);
