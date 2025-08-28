for app in frontend-kanban board-kanban auth-kanban kanban-auth-db board-kanban-db; do
  for id in $(fly machines list -a $app --json | jq -r '.[].id'); do
    fly machine start $id -a $app
    sleep 2
  done
done