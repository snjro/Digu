# Sourced by the run.sh of each check. Sets $repo and $name, and checks the
# <build-dir> and <out-dir> arguments.

# The repository of this script. build.sh does not use it for the build.
repo=$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)
# Docker Compose project names are lowercase.
name=$(basename "$repo" | tr "[:upper:]" "[:lower:]")

# Prints the full path of <build-dir>, or stops when it is not made by build.sh.
build_dir() {
  local dir
  dir=$(realpath -m "$1")
  if [[ ! -f $dir/compose.yaml || ! -d $dir/_build ]]; then
    echo "$dir has no compose.yaml or _build; make it with build.sh" >&2
    exit 2
  fi
  echo "$dir"
}

# Prints the full path of <out-dir> and makes it, or stops when it is in the
# repository.
out_dir() {
  local dir
  dir=$(realpath -m "$1")
  if [[ $dir == "$repo" || $dir == "$repo"/* ]]; then
    echo "Refusing to use $dir as <out-dir>: it is in the repository" >&2
    exit 2
  fi
  mkdir -p "$dir"
  echo "$dir"
}
